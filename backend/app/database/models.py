from __future__ import annotations

from sqlalchemy import Column, Date, Float, Integer, String, Text

from app.database.connection import Base


class DemandForecastRecord(Base):
    __tablename__ = "demand_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String, nullable=False)
    forecast_date = Column(Date, nullable=False)
    forecasted_demand = Column(Float, nullable=False)
    forecast_horizon = Column(Integer, nullable=False)
    model_version = Column(String, nullable=False)


class SupplyRiskRecord(Base):
    __tablename__ = "supply_risks"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(String, nullable=True)
    vendor_id = Column(String, nullable=True)
    disruption_probability = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)
    model_version = Column(String, nullable=False)


class InventoryPolicyRecord(Base):
    __tablename__ = "inventory_policies"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String, nullable=False)
    order_date = Column(Date, nullable=False)
    material_requirement = Column(Float, nullable=False)
    material_shortage = Column(Float, nullable=False)
    reorder_recommendation = Column(Text, nullable=False)
