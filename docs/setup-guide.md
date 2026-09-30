# Setup guide

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Database

The default configuration expects PostgreSQL running locally or in Docker Compose. Credentials should be provided using environment variables and the `.env` file.
