from __future__ import annotations

from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from app.db.session import Base


class ProductModel(Base):
    """
    Relational SQL Model for Monitored Raw Material SKUs in the garment factory.
    Stored persistently in SQLite (optichain_inventory.db).
    """
    __tablename__ = "inventory_products"

    product_id = Column(String(50), primary_key=True, index=True)
    product_name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)
    unit = Column(String(20), nullable=False)
    current_inventory = Column(Float, default=0.0)
    forecasted_demand = Column(Float, default=0.0)
    demand_std_dev = Column(Float, default=0.0)
    average_lead_time = Column(Float, default=3.5)
    lead_time_std_dev = Column(Float, default=1.5)
    disruption_probability = Column(Float, default=0.1)
    supplier_trust_score = Column(Float, default=80.0)
    risk_level = Column(String(20), default="LOW")
    in_transit_qty = Column(Float, default=0.0)
    is_demo_data = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PurchaseOrderModel(Base):
    """
    Relational SQL Model for Dispatched Purchase Orders / ERP Replenishment Directives.
    """
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    po_number = Column(String(50), unique=True, index=True, nullable=False)
    product_id = Column(String(50), ForeignKey("inventory_products.product_id"), nullable=False)
    product_name = Column(String(200), nullable=False)
    quantity = Column(Float, nullable=False)
    freight_mode = Column(String(20), default="sea")
    estimated_cost_usd = Column(Float, default=0.0)
    status = Column(String(30), default="DISPATCHED")
    dispatched_at = Column(DateTime, default=datetime.utcnow)
