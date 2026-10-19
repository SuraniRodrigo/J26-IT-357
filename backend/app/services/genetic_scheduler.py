from __future__ import annotations

import random
import time
from dataclasses import dataclass
from math import ceil
from typing import TypeAlias

from app.schemas.production import (
    GanttOperationSchema,
    GeneticProductionScheduleRequest,
    GeneticProductionScheduleResponse,
    GeneticScheduleBenchmarkSchema,
    ProductionJobSchema,
)

Operation: TypeAlias = tuple[str, str]


@dataclass(frozen=True)
class _Evaluation:
    schedule: tuple[GanttOperationSchema, ...]
    makespan: int
    tardiness: int
    disruption_risk: float
    fitness: float


@dataclass(frozen=True)
class _Chromosome:
    operation_order: tuple[Operation, ...]
    sewing_line_assignments: tuple[str, ...]


class GeneticProductionScheduler:
    """Pure-Python genetic algorithm for dynamic garment job-shop schedules."""

    _STAGES = ("cutting", "sewing", "finishing")

    def solve_and_optimize(
        self, request: GeneticProductionScheduleRequest
    ) -> GeneticProductionScheduleResponse:
        started_at = time.perf_counter()
        rng = random.Random(request.seed)
        jobs = request.orders
        job_by_id = {job.order_id: job for job in jobs}
        if len(job_by_id) != len(jobs):
            raise ValueError("Order IDs must be unique")

        lines = request.sewing_lines
        known_lines = set(lines)
        unknown_lines = set(request.sewing_line_disruption_probabilities) - known_lines
        if unknown_lines:
            raise ValueError(
                "Disruption probabilities reference unknown sewing lines: "
                f"{', '.join(sorted(unknown_lines))}"
            )
        for job in jobs:
            unknown_eligible = set(job.eligible_sewing_lines) - known_lines
            if unknown_eligible:
                raise ValueError(
                    f"Order {job.order_id} references unknown sewing lines: "
                    f"{', '.join(sorted(unknown_eligible))}"
                )
            if job.sewing_workers > request.sewing_workers_per_line:
                raise ValueError(
                    f"Order {job.order_id} requires more sewing workers than "
                    "the per-line capacity"
                )
            if job.sewing_workers > request.total_sewing_workers:
                raise ValueError(
                    f"Order {job.order_id} requires more sewing workers than "
                    "the factory capacity"
                )

        risk_sources: list[tuple[str, float]] = []
        for job in jobs:
            risk_sources.extend(
                (
                    (f"machine:{job.order_id}", job.machine_disruption_probability),
                    (f"material:{job.order_id}", job.material_disruption_probability),
                    (f"order:{job.order_id}", job.order_disruption_probability),
                )
            )
        risk_sources.extend(
            (f"line:{line}", probability)
            for line, probability in request.sewing_line_disruption_probabilities.items()
        )
        risk_sources.extend(
            (f"telemetry:{resource}", probability)
            for resource, probability in request.telemetry_bottleneck_risk_probabilities.items()
        )
        trigger_sources = [
            name
            for name, probability in risk_sources
            if probability >= request.disruption_threshold
        ]
        dynamic_triggered = bool(trigger_sources)
        available_lines = [
            line
            for line in lines
            if not (
                dynamic_triggered
                and request.sewing_line_disruption_probabilities.get(line, 0)
                >= request.disruption_threshold
            )
        ]
        if not available_lines:
            raise ValueError(
                "No sewing lines are available: every line exceeds the disruption threshold"
            )
        eligible_by_job = {
            job.order_id: tuple(
                line
                for line in available_lines
                if not job.eligible_sewing_lines or line in job.eligible_sewing_lines
            )
            for job in jobs
        }
        for job in jobs:
            if not eligible_by_job[job.order_id]:
                raise ValueError(
                    f"Order {job.order_id} has no eligible sewing lines after disruptions"
                )

        operation_ids = tuple(
            (job.order_id, stage) for job in jobs for stage in self._STAGES
        )
        stage_durations = {
            (job.order_id, stage): getattr(job, f"{stage}_minutes")
            for job in jobs
            for stage in self._STAGES
        }
        telemetry_risks = request.telemetry_bottleneck_risk_probabilities

        def duration(operation: Operation) -> int:
            return stage_durations[operation]

        def disruption_probability(job: ProductionJobSchema, stage: str, line: str) -> float:
            probabilities = [
                job.machine_disruption_probability,
                job.material_disruption_probability,
                job.order_disruption_probability,
                telemetry_risks.get(job.order_id, 0.0),
                telemetry_risks.get(stage, 0.0),
                telemetry_risks.get(f"{job.order_id}:{stage}", 0.0),
            ]
            if stage == "sewing":
                probabilities.extend(
                    (
                        request.sewing_line_disruption_probabilities.get(line, 0.0),
                        telemetry_risks.get(line, 0.0),
                    )
                )
            return 1 - _probability_of_no_disruption(probabilities)

        def decode(chromosome: _Chromosome) -> _Evaluation:
            chosen_lines = dict(zip((job.order_id for job in jobs), chromosome.sewing_line_assignments))
            worker_pool_key = object()
            reservations: dict[object, list[tuple[int, int, int]]] = {}
            stage_end: dict[Operation, int] = {}
            operations: dict[Operation, GanttOperationSchema] = {}

            def find_slot(
                resource: str, earliest: int, minutes: int
            ) -> int:
                intervals = reservations.setdefault(resource, [])
                candidate = earliest
                while True:
                    conflicts = [
                        (start, end)
                        for start, end, _ in intervals
                        if start < candidate + minutes and candidate < end
                    ]
                    if not conflicts:
                        return candidate
                    candidate = min(end for _, end in conflicts if end > candidate)

            remaining = list(chromosome.operation_order)
            while remaining:
                made_progress = False
                for operation in remaining[:]:
                    order_id, stage = operation
                    job = job_by_id[order_id]
                    stage_index = self._STAGES.index(stage)
                    if stage_index and (
                        order_id,
                        self._STAGES[stage_index - 1],
                    ) not in stage_end:
                        continue

                    predecessor_end = (
                        stage_end[(order_id, self._STAGES[stage_index - 1])]
                        if stage_index
                        else _expected_release_time(job)
                    )
                    minutes = duration(operation)
                    if stage == "sewing":
                        line = chosen_lines[order_id]
                        start = find_slot(line, predecessor_end, minutes)
                        worker_reservations = reservations.setdefault(
                            worker_pool_key, []
                        )
                        while True:
                            worker_start = find_worker_feasible_start(
                                start,
                                minutes,
                                job.sewing_workers,
                                worker_reservations,
                                request.total_sewing_workers,
                            )
                            line_start = find_slot(line, worker_start, minutes)
                            if line_start == worker_start:
                                start = line_start
                                break
                            start = line_start
                        resource = line
                        reservations.setdefault(line, []).append(
                            (start, start + minutes, 1)
                        )
                        worker_reservations.append(
                            (start, start + minutes, job.sewing_workers)
                        )
                    else:
                        machine_count = (
                            request.cutting_machines
                            if stage == "cutting"
                            else request.finishing_machines
                        )
                        resource, start = find_machine_slot(
                            reservations,
                            stage,
                            machine_count,
                            predecessor_end,
                            minutes,
                        )
                        reservations.setdefault(resource, []).append(
                            (start, start + minutes, 1)
                        )
                    end = start + minutes
                    stage_end[operation] = end
                    operations[operation] = GanttOperationSchema(
                        order_id=job.order_id,
                        product_id=job.product_id,
                        stage=stage,
                        start_minute=start,
                        end_minute=end,
                        duration_minutes=minutes,
                        resource=resource,
                        workers=job.sewing_workers if stage == "sewing" else 1,
                    )
                    remaining.remove(operation)
                    made_progress = True
                if not made_progress:
                    raise ValueError(
                        "Unable to decode operation order; it must contain every operation exactly once"
                    )

            schedule = tuple(
                sorted(
                    operations.values(),
                    key=lambda operation: (
                        operation.start_minute,
                        operation.stage,
                        operation.order_id,
                    ),
                )
            )
            makespan = max((operation.end_minute for operation in schedule), default=0)
            tardiness = sum(
                max(
                    0,
                    stage_end[(job.order_id, "finishing")] - job.due_time_minutes,
                )
                for job in jobs
            )
            risk = sum(
                operation.duration_minutes
                * disruption_probability(
                    job_by_id[operation.order_id],
                    operation.stage,
                    chosen_lines[operation.order_id]
                    if operation.stage == "sewing"
                    else "",
                )
                for operation in schedule
            )
            fitness = (
                request.makespan_weight * makespan
                + request.tardiness_weight * tardiness
                + request.disruption_risk_weight * risk
            )
            return _Evaluation(schedule, makespan, tardiness, risk, fitness)

        def make_spt_chromosome() -> _Chromosome:
            ordered_operations = sorted(
                operation_ids,
                key=lambda operation: (
                    duration(operation),
                    operation[1],
                    operation[0],
                ),
            )
            line_loads = {line: 0 for line in available_lines}
            selected_lines = []
            for job in jobs:
                line = min(
                    eligible_by_job[job.order_id],
                    key=lambda candidate: (
                        line_loads[candidate]
                        + job.sewing_minutes
                        * (
                            1
                            + request.sewing_line_disruption_probabilities.get(
                                candidate, 0
                            )
                        ),
                        candidate,
                    ),
                )
                selected_lines.append(line)
                line_loads[line] += job.sewing_minutes
            return _Chromosome(tuple(ordered_operations), tuple(selected_lines))

        spt_started = time.perf_counter()
        spt_evaluation = decode(make_spt_chromosome())
        spt_runtime = time.perf_counter() - spt_started

        cache: dict[_Chromosome, _Evaluation] = {}

        def evaluate(chromosome: _Chromosome) -> _Evaluation:
            if chromosome not in cache:
                cache[chromosome] = decode(chromosome)
            return cache[chromosome]

        operation_genes = list(operation_ids)
        base_chromosome = make_spt_chromosome()
        population = [base_chromosome]
        population.extend(
            _Chromosome(
                tuple(rng.sample(operation_genes, len(operation_genes))),
                tuple(
                    rng.choice(eligible_by_job[job.order_id])
                    for job in jobs
                ),
            )
            for _ in range(request.population_size - 1)
        )
        best_chromosome = min(population, key=lambda chromosome: evaluate(chromosome).fitness)
        best_evaluation = evaluate(best_chromosome)
        effective_crossover = (
            max(request.crossover_probability, 0.95)
            if dynamic_triggered
            else request.crossover_probability
        )
        effective_mutation = (
            max(request.mutation_probability, 0.45)
            if dynamic_triggered
            else request.mutation_probability
        )
        deadline = started_at + request.max_time_seconds
        generations_completed = 0

        def tournament() -> _Chromosome:
            candidates = rng.sample(
                population,
                min(request.tournament_size, len(population)),
            )
            return min(candidates, key=lambda chromosome: evaluate(chromosome).fitness)

        def order_crossover(
            first: tuple[Operation, ...], second: tuple[Operation, ...]
        ) -> tuple[Operation, ...]:
            if len(first) < 2:
                return first
            left, right = sorted(rng.sample(range(len(first)), 2))
            child: list[Operation | None] = [None] * len(first)
            child[left : right + 1] = first[left : right + 1]
            remaining = [gene for gene in second if gene not in child]
            positions = list(range(right + 1, len(first))) + list(range(left))
            for position, gene in zip(positions, remaining):
                child[position] = gene
            return tuple(gene for gene in child if gene is not None)

        def mutate(chromosome: _Chromosome) -> _Chromosome:
            order = list(chromosome.operation_order)
            if len(order) > 1 and rng.random() < effective_mutation:
                left, right = rng.sample(range(len(order)), 2)
                order[left], order[right] = order[right], order[left]
            assignments = list(chromosome.sewing_line_assignments)
            for index, job in enumerate(jobs):
                if rng.random() < effective_mutation:
                    alternatives = [
                        line
                        for line in eligible_by_job[job.order_id]
                        if line != assignments[index]
                    ]
                    if alternatives:
                        assignments[index] = rng.choice(alternatives)
            return _Chromosome(tuple(order), tuple(assignments))

        while generations_completed < request.generations and time.perf_counter() < deadline:
            next_population = [best_chromosome]
            while len(next_population) < request.population_size:
                first = tournament()
                second = tournament()
                child_order = first.operation_order
                child_assignments = first.sewing_line_assignments
                if rng.random() < effective_crossover:
                    child_order = order_crossover(
                        first.operation_order, second.operation_order
                    )
                    child_assignments = tuple(
                        first_line if rng.random() < 0.5 else second_line
                        for first_line, second_line in zip(
                            first.sewing_line_assignments,
                            second.sewing_line_assignments,
                        )
                    )
                child = mutate(_Chromosome(child_order, child_assignments))
                next_population.append(child)
            population = next_population
            generations_completed += 1
            generation_best = min(
                population, key=lambda chromosome: evaluate(chromosome).fitness
            )
            generation_evaluation = evaluate(generation_best)
            if generation_evaluation.fitness < best_evaluation.fitness:
                best_chromosome = generation_best
                best_evaluation = generation_evaluation

        elapsed = time.perf_counter() - started_at
        fitness_improvement = (
            (spt_evaluation.fitness - best_evaluation.fitness)
            / spt_evaluation.fitness
            * 100
            if spt_evaluation.fitness
            else 0.0
        )
        return GeneticProductionScheduleResponse(
            algorithm="genetic_algorithm",
            generations_completed=generations_completed,
            dynamic_reoptimization_triggered=dynamic_triggered,
            dynamic_trigger_sources=trigger_sources,
            effective_crossover_probability=effective_crossover,
            effective_mutation_probability=effective_mutation,
            makespan_minutes=best_evaluation.makespan,
            total_tardiness_minutes=best_evaluation.tardiness,
            disruption_risk_minutes=round(best_evaluation.disruption_risk, 3),
            fitness=round(best_evaluation.fitness, 3),
            fitness_improvement_vs_spt_percent=round(fitness_improvement, 3),
            runtime_seconds=round(elapsed, 6),
            sewing_line_assignments=dict(
                zip(
                    (job.order_id for job in jobs),
                    best_chromosome.sewing_line_assignments,
                )
            ),
            gantt_schedule=list(best_evaluation.schedule),
            spt_benchmark=GeneticScheduleBenchmarkSchema(
                makespan_minutes=spt_evaluation.makespan,
                total_tardiness_minutes=spt_evaluation.tardiness,
                disruption_risk_minutes=round(spt_evaluation.disruption_risk, 3),
                fitness=round(spt_evaluation.fitness, 3),
                runtime_seconds=round(spt_runtime, 6),
            ),
        )


def _probability_of_no_disruption(probabilities: list[float]) -> float:
    no_disruption = 1.0
    for probability in probabilities:
        no_disruption *= 1 - probability
    return no_disruption


def _expected_release_time(job: ProductionJobSchema) -> int:
    expected_delay = (
        job.machine_disruption_probability * job.machine_delay_minutes
        + job.material_disruption_probability * job.material_delay_minutes
        + job.order_disruption_probability * job.order_delay_minutes
    )
    return ceil(expected_delay)


def find_machine_slot(
    reservations: dict[object, list[tuple[int, int, int]]],
    stage: str,
    machine_count: int,
    earliest: int,
    minutes: int,
) -> tuple[str, int]:
    options = []
    for index in range(machine_count):
        resource = f"{stage.title()} machine {index + 1}"
        candidate = earliest
        for start, end, _ in sorted(reservations.get(resource, [])):
            if candidate + minutes <= start:
                break
            if candidate < end and start < candidate + minutes:
                candidate = end
        options.append((candidate, resource))
    start, resource = min(options)
    return resource, start


def find_worker_feasible_start(
    earliest: int,
    minutes: int,
    demand: int,
    reservations: list[tuple[int, int, int]],
    capacity: int,
) -> int:
    candidate = earliest
    while True:
        conflicts = [
            (start, end, workers)
            for start, end, workers in reservations
            if start < candidate + minutes and candidate < end
        ]
        boundaries = {candidate, candidate + minutes}
        for start, end, _ in conflicts:
            boundaries.add(max(candidate, start))
            boundaries.add(min(candidate + minutes, end))
        if all(
            sum(
                workers
                for start, end, workers in reservations
                if start <= point < end
            )
            + demand
            <= capacity
            for point in sorted(boundaries)[:-1]
        ):
            return candidate
        candidate = min(end for start, end, _ in conflicts if end > candidate)
