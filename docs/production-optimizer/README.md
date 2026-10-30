# Production Optimizer

Component documentation for the OPTICHAIN Garment Factory Production
Optimizer. This document consolidates the UI, backend APIs, scheduling
algorithms, research workspaces, setup, and validation information relevant to
this component.


The repository-level [README](../../README.md) remains the guide for the
complete OPTICHAIN project.

## Component purpose

The Production Optimizer supports production planning and recovery for garment
factory lines. Its functionality covers production schedule generation,
disruption-aware rescheduling, schedule comparison, recovery actions, and
monitoring interfaces.

The frontend includes the following screens:

- **Overview:** production-line cards, output trend, KPI summaries, and recent
  events.
- **Disruptions:** risk inbox, risk filtering, event review, and recovery-plan
  entry point.
- **Simulation:** a sandbox scenario form and scenario results.
- **Optimize:** disrupted-versus-proposed plan review, optimization objectives,
  constraint controls, and apply action.
- **Schedule:** schedule timeline, change review, execution status, export, and
  rollback controls.

The UI is implemented under
[`frontend/src/components/optimizer`](../../frontend/src/components/optimizer/).
Its current overview, disruption list, scenario history, and recovery-plan
values are demonstration data. The separate API endpoints described below
exist, but the current frontend screens are not wired to the `/api/production-ui`
API.

## Technical design and algorithms

The backend contains several production-planning approaches. They are separate
API paths with different purposes; the dashboard's demo recovery proposal
should not be mistaken for output from every algorithm below.

### Constraint-based quantity recommendation

`POST /api/production/optimize` computes a planned quantity from the supplied
capacity and availability factors:

```text
material_availability =
    0, when material availability is false
    max(0, (material requirement - shortage) / material requirement), otherwise
planned quantity =
    production capacity
    × machine availability
    × operator skill factor
    × material availability
```

When material requirement is zero, the material factor defaults to `1` before
the explicit material-availability flag is applied. The service selects the
highest-capacity line from its configured line-capacity map and marks
rescheduling as required when a disruption is reported or a capacity factor is
constrained. This is a deterministic calculation, not a learned optimizer.

### OR-Tools CP-SAT job-shop scheduler

`POST /api/production/schedule` uses
[`SelfHealingJSSPScheduler`](../../backend/app/services/jssp_scheduler.py) to
schedule each order through the precedence-constrained stages **cutting →
sewing → finishing**.

The CP-SAT model represents stage work as interval variables and enforces:

- Cutting and finishing machine counts with cumulative resource constraints.
- One active operation per sewing line with a no-overlap constraint.
- Sewing-worker limits both per line and across the factory.
- Exactly one eligible, available sewing-line assignment for each order.
- Stage precedence, order due times, and sequence-dependent sewing changeovers.
- Disruption-based order release delays, calculated by rounding up the
  probability-weighted machine, material, and order delays.

If any supplied disruption probability meets or exceeds the configured
`disruption_threshold` (default **0.46**), healing is marked as triggered.
Sewing lines whose line disruption probability also meets the threshold are
excluded. The solver uses three sequential optimization passes (lexicographic
optimization):

1. Minimize total schedule makespan.
2. Fix the best makespan found and minimize total order tardiness.
3. Fix the best tardiness found and minimize total sewing changeover time.

Each pass uses the request's `max_time_seconds / 3` limit. The response includes
the Gantt operations, sewing-line assignment, makespan, tardiness, changeover
cost, and `OPTIMAL` versus `FEASIBLE` status. `FEASIBLE` means a valid schedule
was found but optimality was not proven for every pass before the time limit.

### Genetic dynamic line-balancing scheduler

`POST /api/production/schedule/genetic` uses
[`GeneticProductionScheduler`](../../backend/app/services/genetic_scheduler.py).
Each chromosome encodes (1) an order of all order-stage operations and (2) a
sewing-line assignment for each order. A precedence-aware decoder reserves
machine, sewing-line, and worker-capacity time slots to turn a chromosome into
a feasible Gantt schedule.

The implementation:

- Seeds the initial population with a shortest-processing-time (SPT) heuristic
  plus randomized candidates.
- Uses tournament selection and elitism (the best chromosome is retained).
- Uses order crossover for operation ordering and per-order parent selection
  for line assignments.
- Mutates operation order by swapping operations and mutates assignments by
  choosing another eligible line.
- Stops at the requested generation count or time limit and caches chromosome
  evaluations.
- Compares the best result to the SPT baseline.

The minimized weighted fitness is:

```text
fitness =
    makespan_weight × makespan
    + tardiness_weight × total tardiness
    + disruption_risk_weight × duration-weighted disruption risk
```

Combined operation risk uses the complement of the product of individual
non-disruption probabilities. Inputs can include order machine, material, and
order risk, sewing-line risk, and telemetry risk. When any source reaches the
disruption threshold (default **0.46**), dynamic re-optimization is reported,
at-risk sewing lines can be removed, and the effective crossover/mutation
probabilities are raised to at least **0.95**/**0.45** respectively. A request
seed makes randomized candidate generation reproducible.

### PPO garment dispatching environment

The repository also defines
[`GarmentProductionEnv`](../../backend/app/rl/garment_env.py), a Gymnasium
finite-horizon Markov decision process for three garment lines. Its normalized
observation includes per-line queue length, machine availability, worker
efficiency, lead-time slack, and predicted risk, plus the active order's
remaining work, due-time slack, risk, and safety buffer.

The environment exposes four actions: maintain the current assignment,
reallocate the active order to Line B, inject a safety buffer, or split the
active batch. Reward encourages completed work and on-time delivery, and
penalizes machine disruption, idle time, changeovers, splitting overhead, and
late or unfinished orders. Risk predictions may be supplied by a
`predict_proba`/`predict`-compatible model; without one, the environment uses a
synthetic feature-based risk estimate.

[`backend/scripts/train_ppo.py`](../../backend/scripts/train_ppo.py) trains a
Stable-Baselines3 PPO `MlpPolicy` for a configured number of environment steps
(default **50,000**) and saves it under `backend/models_artifacts/production/`.
Training a policy is not the same as serving it: the current production API
routes do not load or invoke this PPO policy.

### Disruption recalculation and UI recovery-plan distinction

`POST /api/v1/optimizer/recalculate` is currently a deterministic demonstration
service. It chooses the other configured line with the highest nominal
capacity, moves one in-memory batch in its local calculation, and derives
rerouted load from severity (bounded from 10% to 30%). It returns updated
sequence/capacity data but does not persist or publish a schedule.

The React recovery-plan cards, displayed objective metrics, action list,
constraint-check list, and simulation history are local demonstration UI
content. Its Apply button calls the legacy recalculation endpoint, which
returns a non-persistent result; it does not apply the displayed schedule.
In particular, the Optimize screen's displayed claim that a PPO agent
generated the proposal is not evidence that the trained PPO policy is called
by that screen. The `/api/production-ui` proposal/apply APIs use in-memory demo
calculations and are also not connected to the React screens or the CP-SAT,
genetic, or PPO schedulers.

## Architecture and key files

### Frontend

- [`frontend/src/App.jsx`](../../frontend/src/App.jsx) - application shell,
  sidebar navigation, and screen integration.
- [`frontend/src/components/optimizer/`](../../frontend/src/components/optimizer/)
  - `DisruptionInbox.jsx` - disruption risk inbox.
  - `DisruptionInjectorModal.jsx` - disruption submission dialog.
  - `ProductionSimulator.jsx` - disruption simulator.
  - `RecoveryPlan.jsx` - recovery proposal review and apply control.
  - `SimulationDashboard.jsx` - sandbox simulation screen.
  - `ScheduleDashboard.jsx` - schedule timeline, change review, and rollback.
- [`frontend/src/services/productionService.js`](../../frontend/src/services/productionService.js)
  - frontend API wrappers for production optimization and disruption
    recalculation.
- [`frontend/src/styles.css`](../../frontend/src/styles.css) - shared visual
  styles for the production optimizer screens.

### Backend

- [`backend/app/api/routes/production.py`](../../backend/app/api/routes/production.py)
  - production optimization, CP-SAT schedule, genetic schedule, and disruption
    recalculation routes.
- [`backend/app/api/routes/production_ui.py`](../../backend/app/api/routes/production_ui.py)
  - API endpoints intended to provide data and actions for production UI
    workflows.
- [`backend/app/schemas/production.py`](../../backend/app/schemas/production.py)
  - production scheduling request and response schemas.
- [`backend/app/schemas/production_ui.py`](../../backend/app/schemas/production_ui.py)
  - production UI endpoint schemas.
- [`backend/app/services/production_service.py`](../../backend/app/services/production_service.py)
  - base production optimization and disruption-recalculation logic.
- [`backend/app/services/jssp_scheduler.py`](../../backend/app/services/jssp_scheduler.py)
  - OR-Tools CP-SAT job-shop scheduling.
- [`backend/app/services/genetic_scheduler.py`](../../backend/app/services/genetic_scheduler.py)
  - genetic-algorithm production scheduler.
- [`backend/app/services/production_ui_service.py`](../../backend/app/services/production_ui_service.py)
  - in-memory demo state for the production UI API, including disruptions,
    simulations, recovery plans, schedule activity, and rollback.
- [`backend/app/main.py`](../../backend/app/main.py)
  - FastAPI application and route registration.

## API reference

Start the backend and open Swagger UI at
[`http://localhost:8000/docs`](http://localhost:8000/docs) to inspect request
and response schemas.

### Existing scheduling APIs

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/production/optimize` | Calculate a production quantity and suggested production line from production constraints. |
| `POST` | `/api/production/schedule` | Generate a cutting, sewing, and finishing schedule with OR-Tools CP-SAT. |
| `POST` | `/api/production/schedule/genetic` | Generate a production schedule using the genetic scheduler. |
| `POST` | `/api/v1/optimizer/recalculate` | Recalculate a disruption event and return affected/rerouting line sequences and capacity metrics. |

Example disruption-recalculation request:

```json
{
  "line_id": "Line Alpha",
  "disruption_type": "Machine Failure",
  "severity_minutes": 45
}
```

### Production UI API

These endpoints are registered under `/api/production-ui`:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/dashboard` | Return overview KPIs, line status, output trend, and recent events. |
| `GET`, `POST` | `/disruptions` | List or record a disruption. |
| `POST` | `/disruptions/{disruption_id}/resolve` | Resolve an active disruption. |
| `GET`, `POST` | `/simulations` | List sandbox simulations or run a new sandbox scenario. |
| `POST` | `/recovery-plans` | Create a proposal using an optional disruption ID, objective, and constraint preferences. |
| `GET` | `/recovery-plans/{plan_id}` | Retrieve a recovery plan. |
| `POST` | `/recovery-plans/{plan_id}/apply` | Apply a proposed plan to the in-memory schedule. |
| `GET` | `/schedule` | Return the current schedule, activity log, and execution status. |
| `POST` | `/schedule/rollback` | Roll back the latest applied recovery plan. |

The Production UI API currently uses process-local in-memory demo state. Data
resets on backend restart and is not shared across multiple backend worker
processes. Its recovery proposals use demonstration calculations; they are not
a persisted factory schedule or a connection to live factory telemetry.

## Running locally

Run commands from the repository root in PowerShell.

### Backend

```powershell
Set-Location .\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If the backend virtual environment has not been created, follow the
installation steps in the [backend README](../../backend/README.md). The API
documentation is available at `http://127.0.0.1:8000/docs`.

### Frontend

```powershell
Set-Location .\frontend
npm install
npm run dev
```

The Vite development server runs at `http://127.0.0.1:5173/`.

## Testing

Run the backend test suite:

```powershell
Set-Location .\backend
.\.venv\Scripts\python.exe -m pytest -q
```

Production optimizer API lifecycle tests are in
[`backend/tests/api/test_production_ui.py`](../../backend/tests/api/test_production_ui.py).
Existing production scheduling and recalculation tests are in
[`backend/tests/api/test_routes.py`](../../backend/tests/api/test_routes.py).

## Research and workspace references

These directories contain or reserve locations for production research
artifacts; their README files are workspace notes rather than additional
component submission documents:

- [`research/datasets/production/`](../../research/datasets/production/)
- [`research/experiments/production/`](../../research/experiments/production/)
- [`research/notebooks/production-optimization/`](../../research/notebooks/production-optimization/)
- [`research/results/production/`](../../research/results/production/)
- [`backend/models_artifacts/production/`](../../backend/models_artifacts/production/)

## Current limitations

- Production UI APIs are not yet connected to the React screens.
- UI and API demo records are held in memory and disappear when the backend
  restarts.
- Demo recovery-plan calculations are not a replacement for a validated live
  scheduling decision.
- The legacy `/api/v1/optimizer/recalculate` response is a recalculation result;
  it does not persist assignments as the `/api/production-ui` in-memory apply
  workflow does.
- No live factory telemetry or production database persistence is implemented
  by the Production UI API.

## Future development

The following proposals reflect the Production Optimizer presentation. They
are future work; they are not currently implemented as live integrations or
deployed AI-agent functionality.

### 1. Better schedulers

- **Reinforcement Learning (PPO):** Build on the existing garment dispatching
  environment and PPO training script to develop and evaluate an AI agent that
  can recommend rapid schedule adjustments when machine breakdowns occur. The
  trained policy is not currently connected to the production API or UI.
- **Multi-objective optimization:** Extend scheduling objectives to consider
  worker fatigue and fairness, energy use, and changeover costs alongside
  makespan and order deadlines. Evaluate the trade-offs before selecting a
  schedule.

### 2. Real-time factory connection

- **MES/ERP integration:** Connect to factory Manufacturing Execution System
  (MES) and Enterprise Resource Planning (ERP) platforms, such as SAP, to
  exchange orders, resource availability, and schedule updates. Integrations
  should be validated against each factory's systems and approval workflows.
- **IoT sensors:** Ingest machine and line telemetry to monitor operating
  status, worker efficiency indicators where appropriate, and downtime, with
  suitable data-quality, privacy, and access controls.

### 3. Improved risk prediction

- **Graph Neural Networks (GNNs):** Investigate graph-based models for
  representing multi-tier supplier networks and predicting regional supply
  delays that could affect production plans.
- **Live news and weather signals:** Evaluate external news, weather, and port
  congestion data as additional risk signals for disruption forecasting.
  External data would need reliable sources, validation, and safeguards against
  stale or inaccurate inputs.

Delivery prerequisites include persistent storage, integration and model
evaluation, role-based approval, audit history, and safe fallbacks before
recommendations can be applied to a live production schedule.
