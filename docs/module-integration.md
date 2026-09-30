# Module integration

## Data movement

Demand forecasting generates forecast signals. Supply disruption prediction generates risk information. Inventory optimization consumes forecast and risk information and produces material and scheduling contract outputs. Production scheduling consumes the inventory outputs through the defined integration boundary.

## Contract boundary

The inventory-to-production interface explicitly includes Material_Requirement, Material_Shortage, and Material_Availability_Flag. The system must not misrepresent these as independently trained ML predictions.

## Research integrity

Any unavailable field is left as unavailable. The repository does not manufacture supplier identity or model results when the source data does not provide them.
