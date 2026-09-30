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
