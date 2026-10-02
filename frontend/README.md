# OPTICHAIN Frontend

This folder contains the React frontend presentation layer for the OPTICHAIN decision-support platform.

## Responsibilities
- User interface and dashboard
- Module forms, tables, and visualization charts
- API communication via dedicated services
- Client-side validation and state management

## Architecture Boundary
- Communicates exclusively with the FastAPI backend via REST API.
- Strictly isolated from database access, ML training, and backend file system.
