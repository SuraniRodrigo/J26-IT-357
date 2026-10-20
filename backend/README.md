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

New inventory SKUs must use the category prefix `FAB`, `DYE`, `TRM`, or `YRN`.
Catalog quantities are limited to 10,000,000 per material, lead-time values to
365 days, disruption probability to 0–1, and supplier trust score to 1–100.
Material names must be 2–100 characters, contain at least one letter, and may
contain letters and spaces only.
