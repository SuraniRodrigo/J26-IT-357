# Demand Forecasting Frontend Feature Module

This directory manages the UI state, telemetry hooks, and visualization components for **Module 1: Market Prophet (Hierarchical Demand Forecasting & Material Planning)**.

## Key Views & Services

- **Main Dashboard View**: [`src/pages/DemandForecasting/index.jsx`](file:///c:/Users/kavee/OneDrive/Desktop/J26-IT-357/frontend/src/pages/DemandForecasting/index.jsx)
  - 8 Interactive Perspectives: Real DataCo inventory exploration, M5 multi-level hierarchy, 30D/60D/90D trajectory forecasting, and real-time reconciliation method switching (MinT, BU, TD, MO, OLS).
  - Multi-Driver Apparel Demand Decomposition: Fashion trends, seasonal cycles, dye colorway chemistry, and buyer purchasing behaviours.
  - Interactive Period Forecasting Calculator: Flexible single-month and multi-month duration windows with real-time sliders for Trend, Seasonality, Color, Buyer, and Promo multipliers.
  - Material Requirements Planning (MRP) Dashboard: Fabric BOM meters, sewing line SMV man-hours, modular lines needed, Safety Stock, Reorder Point (ROP), and Economic Order Quantity (EOQ).
  - One-click Dispatch: Transmit structured demand handoff contract payload to Module 3 (Inventory Guardian).
- **API Client Service**: [`src/services/demandService.js`](file:///c:/Users/kavee/OneDrive/Desktop/J26-IT-357/frontend/src/services/demandService.js)
  - Connects frontend components to FastAPI backend endpoints under `/api/demand/*`.

For complete mathematical formulation, ML pipeline details, Summing Matrix $S$ specs, and REST API docs, refer to the backend component documentation:
- [Demand Forecasting Backend README](file:///c:/Users/kavee/OneDrive/Desktop/J26-IT-357/backend/Demand%20Forecasting/README.md)
