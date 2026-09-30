from __future__ import annotations


class ProductionRepository:
    def __init__(self) -> None:
        self.records = []

    def list_recent(self) -> list:
        return self.records
