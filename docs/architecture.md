# OPTICHAIN architecture

## Overview

OPTICHAIN is structured into a frontend, backend, research, documentation, and model-artifact layer.

## Layer boundaries

1. Frontend: user interaction and dashboard only.
2. Backend: API layer, business logic, database integration, orchestration.
3. Research: experimentation and model development notebooks.
4. Model artifacts: production inference assets only.
5. Database: relational persistence.

## Module flow

Demand forecasting feeds risk and inventory logic. Inventory outputs feed production scheduling. The orchestration layer coordinates the flow without direct module-to-module coupling.

## Integrity rules

- Do not train models in the FastAPI API.
- Do not place notebooks in production code directories.
- Do not expose database credentials or direct backend files to the frontend.
- Do not fabricate results when model artifacts are unavailable.
