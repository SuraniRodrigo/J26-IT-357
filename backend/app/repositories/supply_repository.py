from __future__ import annotations


class SupplyRepository:
    def __init__(self) -> None:
        self.records = []

    def list_recent(self) -> list:
        return self.records
