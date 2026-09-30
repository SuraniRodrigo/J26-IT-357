from __future__ import annotations

from dataclasses import dataclass, field


PRODUCTION_CONTRACT_FIELDS = [
    "Product ID",
    "Product Name",
    "Order Date",
    "Daily Demand",
    "Forecasted Demand",
    "Disruption Probability",
    "Supplier Trust Score",
    "Risk Availability",
    "Policy Type",
    "Selected Lead Time",
    "Selected Reorder Point",
    "Selected Reorder Quantity",
    "Inventory Before Demand",
    "Fulfilled Demand",
    "Stockout Units",
    "Ending Inventory",
    "Inventory Position",
    "Reorder Placed",
    "Material Requirement",
    "Material Shortage",
    "Material Availability Flag",
]


@dataclass
class InventoryToProductionContract:
    contract_name: str = "Inventory_to_Production_Scheduling.csv"
    required_fields: list[str] = field(default_factory=lambda: PRODUCTION_CONTRACT_FIELDS.copy())

    def validate(self) -> bool:
        return bool(self.required_fields)
