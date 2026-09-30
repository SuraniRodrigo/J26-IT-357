from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.demand import router as demand_router
from app.api.routes.supply import router as supply_router
from app.api.routes.inventory import router as inventory_router
from app.api.routes.production import router as production_router
from app.api.routes.optichain import router as optichain_router
from app.core.config import settings

app = FastAPI(
    title="OPTICHAIN",
    description="AI-driven supply chain disruption predictor and production optimizer",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard_router, prefix="/api")
app.include_router(demand_router, prefix="/api")
app.include_router(supply_router, prefix="/api")
app.include_router(inventory_router, prefix="/api")
app.include_router(production_router, prefix="/api")
app.include_router(optichain_router, prefix="/api")


@app.get("/health")
def healthcheck() -> dict:
    return {"status": "ok", "service": "OPTICHAIN backend"}
