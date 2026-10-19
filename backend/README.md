# Backend

This directory contains the FastAPI application layer for OPTICHAIN.

## Responsibilities

- API routes
- business services
- schema validation
- database access layer
- model artifact loading
- integration and orchestration

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API docs

- http://localhost:8000/docs
- http://localhost:8000/redoc

## Self-healing production optimizer

`POST /api/v1/optimizer/recalculate` accepts a disruption event and returns a
simulated updated line sequence, including a rerouted batch and capacity
metrics:

```json
{
  "line_id": "Line Alpha",
  "disruption_type": "Machine Failure",
  "severity_minutes": 45
}
```

The API's existing CORS middleware permits the Vite frontend origin at
`http://localhost:5173` (and `http://127.0.0.1:5173`).

## CP-SAT self-healing job-shop scheduler

`POST /api/production/schedule` uses OR-Tools CP-SAT to schedule each order
through cutting, sewing, and finishing. It enforces machine capacities, one
order per sewing line at a time, sewing-worker limits per line and across the
factory, eligible sewing lines, and stage precedence. Its lexicographic
objective minimizes makespan first, total tardiness second, and
sequence-dependent sewing-line changeover time third.

The request supplies processing times and due times in minutes. Disruption
probabilities are compared inclusively with the configurable `0.46` threshold.
At or above the threshold the schedule is marked as healing and sewing lines
whose machine disruption probability also meets the threshold are taken out
of service. Expected machine, material, and order delays shift the affected
order's release time. A feasible updated Gantt schedule, line assignments,
objective metrics, and whether all three objectives were proven optimal are
returned. The solver's default total time limit is 10 seconds.

For example, post an object with an `orders` array (each order has `order_id`,
`product_id`, `product_family`, stage durations, and `due_time_minutes`) and a
`sewing_lines` array. Optional `sewing_line_disruption_probabilities` and
`changeover_times` maps allow the optimizer to react to predicted disruptions
and sequence-dependent style changeovers.

## Genetic dynamic line-balancing scheduler

`POST /api/production/schedule/genetic` runs a dependency-free Python genetic
algorithm on the same production-order request model. Each chromosome has two
strings: a permutation of all order-stage operations and one sewing-line
assignment per order. Its precedence-aware decoder produces cutting, sewing,
and finishing intervals, enforcing machine counts and sewing-worker capacity.
Order crossover and operation-swap/line-reassignment mutation form the genetic
operators.

The configurable objective is
`makespan_weight * makespan + tardiness_weight * total_tardiness + disruption_risk_weight * disruption_risk`.
Disruption risk is duration-weighted expected lost minutes, combining order,
machine, material, sewing-line, and telemetry probabilities. The response
includes the Gantt schedule, objective metrics, actual GA runtime, and an SPT
list-scheduling baseline with matching fitness metrics and runtime, plus the
GA's percentage fitness improvement versus that baseline. A
disruption or telemetry probability at or above `disruption_threshold` (default
`0.46`) enables more aggressive crossover and mutation; sewing lines whose
predicted line-disruption risk meets the threshold are removed from assignment.
The seeded GA can be bounded by both `generations` and `max_time_seconds`.
Submit updated telemetry or disruption probabilities to this endpoint to
re-optimize against the current production conditions.

## PPO dynamic rescheduling environment

`app.rl.garment_env.GarmentProductionEnv` is a Gymnasium MDP with the discrete
actions maintain schedule, reallocate the active order to Line B, inject
buffer time, and split the active batch. Its observation contains queue length,
machine availability, worker efficiency, mean order lead-time slack, and
predicted disruption risk for each of three sewing lines, plus active-order
work, due-time slack, risk, and buffer. The reward grants positive work and
on-time completion rewards and penalizes line changeovers, idle machine time,
disruptions, and late or unfinished orders.

Risk estimates can come from an injected LightGBM-compatible estimator or a
joblib model path implementing `predict_proba`/`predict`. Without a supplied
model, the environment uses a feature-based synthetic risk estimate for
standalone training; this fallback is not a trained LightGBM predictor.
Train a PPO policy with:

```powershell
cd backend
python scripts\train_ppo.py --timesteps 50000
```

The script validates the environment, trains Stable-Baselines3 PPO, and saves
the policy under `models_artifacts/production/garment_ppo.zip`. Pass
`--risk-model path\to\trained-risk-model.joblib` to train with production risk
predictions, or adjust the episode, device, and output options with `--help`.
