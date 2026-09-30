# API specification

## Endpoints

- POST /api/demand/forecast
- POST /api/supply/predict
- POST /api/inventory/optimize
- POST /api/production/optimize
- POST /api/optichain/run
- GET /api/dashboard/summary
- GET /api/dashboard/inventory-status
- GET /api/dashboard/production-status

## Contracts

The backend uses Pydantic schemas for all request and response payloads. This includes demand forecasts, disruption predictions, inventory strategies, and production schedule outputs.

## Integrity note

If a model artifact is unavailable, the APIs should return a structured 'not available' status instead of fabricating a value.
