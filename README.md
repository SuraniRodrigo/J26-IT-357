# OPTICHAIN

OPTICHAIN is an AI-driven supply chain disruption predictor and line optimizer designed for Sri Lankan garment factories. The platform integrates demand forecasting, supply disruption prediction, adaptive inventory optimization, and production scheduling into a single API-driven decision-support system.

## Architecture summary

- Frontend: React dashboard and UI
- Backend: FastAPI application with business logic, orchestration, and ML inference
- Research: notebooks, datasets, experimentation, and model-development artifacts
- Database: PostgreSQL-backed persistence via SQLAlchemy
- Model artifacts: production inference assets stored in backend/models_artifacts

## Core modules

1. Market Prophet — demand forecasting
2. Procurement Guardian — supply disruption prediction
3. Inventory Guardian — disruption-aware adaptive inventory optimization
4. Line Optimizer — production scheduling and self-healing rescheduling

## Repository layout

- frontend/
- backend/
- research/
- docs/
- scripts/
- .github/
- docker-compose.yml

## Setup

### Run from VS Code

Open the `J26-IT-357` folder (the project root) in VS Code, then choose
`OPTICHAIN: Frontend + Backend` in **Run and Debug** and press **F5**. To run
only one part, choose its Frontend or Backend configuration. The backend config
uses the project `.venv`; install its requirements first if needed.

The backend expects PostgreSQL at the URL configured by `DATABASE_URL`. The
default Compose configuration uses the hostname `db`, so for a local VS Code
run, start PostgreSQL and set `DATABASE_URL` in `backend/.env` to your local
database connection string. The frontend runs at http://localhost:5173 and the
backend at http://localhost:8000.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Docker

```bash
docker compose up --build
```

## API documentation

After starting the backend, open:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing

```bash
cd backend
pytest
```

## Notes

This repository is intentionally structured so that research, training, and model development remain separate from production inference and API operations. The production backend loads trained artifacts, not training pipelines.
