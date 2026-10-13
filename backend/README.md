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
