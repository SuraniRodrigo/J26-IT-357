from __future__ import annotations


class InventoryRepository:
    def __init__(self) -> None:
        self.records = []

    def list_recent(self) -> list:
        return self.records
