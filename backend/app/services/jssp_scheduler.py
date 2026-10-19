from __future__ import annotations

import math
from collections import defaultdict

from ortools.sat.python import cp_model

from app.schemas.production import (
    GanttOperationSchema,
    ProductionOptimizationResponse,
    ProductionScheduleRequest,
)


class SelfHealingJSSPScheduler:
    """Lexicographic CP-SAT scheduler for cutting, sewing, and finishing jobs."""

    def solve_and_optimize(
        self, request: ProductionScheduleRequest
    ) -> ProductionOptimizationResponse:
        jobs = request.orders
        order_ids = [job.order_id for job in jobs]
        if len(set(order_ids)) != len(order_ids):
            raise ValueError("Order IDs must be unique")

        sewing_lines = request.sewing_lines
        known_lines = set(sewing_lines)
        unknown_disrupted_lines = (
            set(request.sewing_line_disruption_probabilities) - known_lines
        )
        if unknown_disrupted_lines:
            raise ValueError(
                "Disruption probabilities reference unknown sewing lines: "
                f"{', '.join(sorted(unknown_disrupted_lines))}"
            )
        for job in jobs:
            unknown_lines = set(job.eligible_sewing_lines) - known_lines
            if unknown_lines:
                raise ValueError(
                    f"Order {job.order_id} references unknown sewing lines: "
                    f"{', '.join(sorted(unknown_lines))}"
                )

        probabilities = [
            probability
            for job in jobs
            for probability in (
                job.machine_disruption_probability,
                job.material_disruption_probability,
                job.order_disruption_probability,
            )
        ]
        probabilities.extend(request.sewing_line_disruption_probabilities.values())
        healing_triggered = any(
            probability >= request.disruption_threshold for probability in probabilities
        )
        available_lines = [
            line
            for line in sewing_lines
            if not (
                healing_triggered
                and request.sewing_line_disruption_probabilities.get(line, 0)
                >= request.disruption_threshold
            )
        ]
        if not available_lines:
            raise ValueError(
                "No sewing lines are available: every line exceeds the disruption threshold"
            )

        releases = {
            job.order_id: math.ceil(
                job.machine_disruption_probability * job.machine_delay_minutes
                + job.material_disruption_probability * job.material_delay_minutes
                + job.order_disruption_probability * job.order_delay_minutes
            )
            for job in jobs
        }
        durations = {
            job.order_id: (
                job.cutting_minutes,
                job.sewing_minutes,
                job.finishing_minutes,
            )
            for job in jobs
        }
        horizon = (
            max(releases.values(), default=0)
            + sum(sum(durations[job.order_id]) for job in jobs)
            + len(jobs) * max(
                (
                    minutes
                    for targets in request.changeover_times.values()
                    for minutes in targets.values()
                ),
                default=0,
            )
            + 1
        )

        model = cp_model.CpModel()
        starts: dict[tuple[str, str], cp_model.IntVar] = {}
        ends: dict[tuple[str, str], cp_model.IntVar] = {}
        stage_intervals: dict[str, list[cp_model.IntervalVar]] = {
            "cutting": [],
            "finishing": [],
        }
        stage_demands: dict[str, list[int]] = {
            "cutting": [],
            "finishing": [],
        }
        sewing_intervals: dict[str, list[cp_model.IntervalVar]] = defaultdict(list)
        sewing_line_demands: dict[str, list[int]] = defaultdict(list)
        all_sewing_intervals: list[cp_model.IntervalVar] = []
        all_sewing_demands: list[int] = []
        assignments: dict[tuple[str, str], cp_model.IntVar] = {}
        tardiness: dict[str, cp_model.IntVar] = {}
        makespan = model.NewIntVar(0, horizon, "makespan")

        for job in jobs:
            order_id = job.order_id
            cutting_start = model.NewIntVar(0, horizon, f"{order_id}_cutting_start")
            cutting_end = model.NewIntVar(0, horizon, f"{order_id}_cutting_end")
            cutting_interval = model.NewIntervalVar(
                cutting_start,
                job.cutting_minutes,
                cutting_end,
                f"{order_id}_cutting",
            )
            starts[(order_id, "cutting")] = cutting_start
            ends[(order_id, "cutting")] = cutting_end
            stage_intervals["cutting"].append(cutting_interval)
            stage_demands["cutting"].append(1)
            model.Add(cutting_start >= releases[order_id])

            sewing_start = model.NewIntVar(0, horizon, f"{order_id}_sewing_start")
            sewing_end = model.NewIntVar(0, horizon, f"{order_id}_sewing_end")
            starts[(order_id, "sewing")] = sewing_start
            ends[(order_id, "sewing")] = sewing_end
            eligible_lines = [
                line
                for line in available_lines
                if not job.eligible_sewing_lines
                or line in job.eligible_sewing_lines
            ]
            if not eligible_lines:
                raise ValueError(
                    f"Order {order_id} has no eligible sewing lines after disruptions"
                )
            line_choices = []
            for line in eligible_lines:
                selected = model.NewBoolVar(f"{order_id}_on_{line}")
                assignments[(order_id, line)] = selected
                line_choices.append(selected)
                interval = model.NewOptionalIntervalVar(
                    sewing_start,
                    job.sewing_minutes,
                    sewing_end,
                    selected,
                    f"{order_id}_sewing_on_{line}",
                )
                sewing_intervals[line].append(interval)
                sewing_line_demands[line].append(job.sewing_workers)
                all_sewing_intervals.append(interval)
                all_sewing_demands.append(job.sewing_workers)
            model.AddExactlyOne(line_choices)
            model.Add(sewing_start >= cutting_end)

            finishing_start = model.NewIntVar(0, horizon, f"{order_id}_finishing_start")
            finishing_end = model.NewIntVar(0, horizon, f"{order_id}_finishing_end")
            finishing_interval = model.NewIntervalVar(
                finishing_start,
                job.finishing_minutes,
                finishing_end,
                f"{order_id}_finishing",
            )
            starts[(order_id, "finishing")] = finishing_start
            ends[(order_id, "finishing")] = finishing_end
            stage_intervals["finishing"].append(finishing_interval)
            stage_demands["finishing"].append(1)
            model.Add(finishing_start >= sewing_end)

            model.Add(makespan >= finishing_end)
            tardiness[order_id] = model.NewIntVar(0, horizon, f"{order_id}_tardiness")
            model.Add(tardiness[order_id] >= finishing_end - job.due_time_minutes)

        model.AddCumulative(
            stage_intervals["cutting"], stage_demands["cutting"], request.cutting_machines
        )
        model.AddCumulative(
            stage_intervals["finishing"],
            stage_demands["finishing"],
            request.finishing_machines,
        )
        for line in sewing_lines:
            line_intervals = sewing_intervals.get(line, [])
            if line_intervals:
                model.AddNoOverlap(line_intervals)
                model.AddCumulative(
                    line_intervals,
                    sewing_line_demands[line],
                    request.sewing_workers_per_line,
                )
        model.AddCumulative(
            all_sewing_intervals,
            all_sewing_demands,
            request.total_sewing_workers,
        )

        changeover_terms = []
        for line in sewing_lines:
            line_jobs = [job for job in jobs if (job.order_id, line) in assignments]
            empty_line = model.NewBoolVar(f"{line}_empty")
            line_load = sum(assignments[(job.order_id, line)] for job in line_jobs)
            model.Add(line_load == 0).OnlyEnforceIf(empty_line)
            model.Add(line_load >= 1).OnlyEnforceIf(empty_line.Not())
            arcs = [(0, 0, empty_line)]

            for node, job in enumerate(line_jobs, start=1):
                selected = assignments[(job.order_id, line)]
                arcs.append((node, node, selected.Not()))
                arcs.append(
                    (
                        0,
                        node,
                        model.NewBoolVar(f"{job.order_id}_{line}_first"),
                    )
                )
                arcs.append(
                    (
                        node,
                        0,
                        model.NewBoolVar(f"{job.order_id}_{line}_last"),
                    )
                )

            for first_node, first_job in enumerate(line_jobs, start=1):
                for second_node, second_job in enumerate(line_jobs, start=1):
                    if first_node == second_node:
                        continue
                    next_job = model.NewBoolVar(
                        f"{first_job.order_id}_{second_job.order_id}_{line}_next"
                    )
                    arcs.append((first_node, second_node, next_job))
                    setup = request.changeover_times.get(
                        first_job.product_family, {}
                    ).get(second_job.product_family, 0)
                    model.Add(
                        starts[(second_job.order_id, "sewing")]
                        >= ends[(first_job.order_id, "sewing")] + setup
                    ).OnlyEnforceIf(next_job)
                    if setup:
                        changeover_terms.append(setup * next_job)
            model.AddCircuit(arcs)

        model.Minimize(makespan)
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = request.max_time_seconds / 3
        solver.parameters.num_search_workers = 8
        status = solver.Solve(model)
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            raise ValueError("No feasible production schedule exists for these constraints")

        decision_variables = [
            makespan,
            *starts.values(),
            *ends.values(),
            *assignments.values(),
            *tardiness.values(),
        ]
        solution_values = {
            variable.Index(): solver.Value(variable) for variable in decision_variables
        }

        def solution_value(variable: cp_model.IntVar) -> int:
            return solution_values[variable.Index()]

        all_optimal = status == cp_model.OPTIMAL
        model.Add(makespan == solution_value(makespan))
        total_tardiness = sum(tardiness.values())
        model.Minimize(total_tardiness)
        second_status = solver.Solve(model)
        if second_status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            all_optimal = all_optimal and second_status == cp_model.OPTIMAL
            solution_values = {
                variable.Index(): solver.Value(variable)
                for variable in decision_variables
            }
            optimal_tardiness = sum(
                solution_value(tardiness[job.order_id]) for job in jobs
            )
            model.Add(total_tardiness == optimal_tardiness)
            model.Minimize(sum(changeover_terms))
            third_status = solver.Solve(model)
            if third_status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                all_optimal = all_optimal and third_status == cp_model.OPTIMAL
                solution_values = {
                    variable.Index(): solver.Value(variable)
                    for variable in decision_variables
                }
            else:
                all_optimal = False
        else:
            all_optimal = False

        line_assignments = {
            job.order_id: next(
                line
                for line in sewing_lines
                if (job.order_id, line) in assignments
                and solution_value(assignments[(job.order_id, line)])
            )
            for job in jobs
        }
        gantt_schedule: list[GanttOperationSchema] = []
        stage_resources = {
            "cutting": "Cutting",
            "finishing": "Finishing",
        }
        for job in jobs:
            for stage, duration, workers in (
                ("cutting", job.cutting_minutes, 1),
                ("sewing", job.sewing_minutes, job.sewing_workers),
                ("finishing", job.finishing_minutes, 1),
            ):
                resource = (
                    line_assignments[job.order_id]
                    if stage == "sewing"
                    else stage_resources[stage]
                )
                gantt_schedule.append(
                    GanttOperationSchema(
                        order_id=job.order_id,
                        product_id=job.product_id,
                        stage=stage,
                        start_minute=solution_value(starts[(job.order_id, stage)]),
                        end_minute=solution_value(ends[(job.order_id, stage)]),
                        duration_minutes=duration,
                        resource=resource,
                        workers=workers,
                    )
                )
        gantt_schedule.sort(
            key=lambda operation: (
                operation.start_minute,
                operation.stage,
                operation.order_id,
            )
        )
        for stage, machine_count, resource_name in (
            ("cutting", request.cutting_machines, "Cutting machine"),
            ("finishing", request.finishing_machines, "Finishing machine"),
        ):
            machine_available_at = [0] * machine_count
            for operation in sorted(
                (
                    operation
                    for operation in gantt_schedule
                    if operation.stage == stage
                ),
                key=lambda operation: (operation.start_minute, operation.end_minute),
            ):
                machine = min(
                    range(machine_count), key=machine_available_at.__getitem__
                )
                if machine_available_at[machine] > operation.start_minute:
                    raise RuntimeError(
                        f"Solver returned overlapping {stage} operations beyond machine capacity"
                    )
                operation.resource = f"{resource_name} {machine + 1}"
                machine_available_at[machine] = operation.end_minute

        total_tardiness_minutes = sum(
            solution_value(tardiness[job.order_id]) for job in jobs
        )
        changeover_cost = 0
        product_families = {job.order_id: job.product_family for job in jobs}
        for line in sewing_lines:
            line_schedule = sorted(
                (
                    operation
                    for operation in gantt_schedule
                    if operation.stage == "sewing" and operation.resource == line
                ),
                key=lambda operation: operation.start_minute,
            )
            for first, second in zip(line_schedule, line_schedule[1:]):
                changeover_cost += request.changeover_times.get(
                    product_families[first.order_id], {}
                ).get(product_families[second.order_id], 0)

        return ProductionOptimizationResponse(
            status="OPTIMAL" if all_optimal else "FEASIBLE",
            healing_triggered=healing_triggered,
            disruption_threshold=request.disruption_threshold,
            makespan_minutes=max(operation.end_minute for operation in gantt_schedule),
            total_tardiness_minutes=total_tardiness_minutes,
            changeover_cost_minutes=changeover_cost,
            sewing_line_assignments=line_assignments,
            gantt_schedule=gantt_schedule,
        )
