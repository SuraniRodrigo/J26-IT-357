from typing import Sequence
from sqlalchemy.orm import Session

from app.database.models import SupplyRiskRecord


class SupplyRepository:
    def __init__(self, db: Session | None = None) -> None:
        self.db = db
        self.records: list[SupplyRiskRecord] = []

    def create(self, record: SupplyRiskRecord) -> SupplyRiskRecord:
        if self.db is not None:
            self.db.add(record)
            self.db.commit()
            self.db.refresh(record)
            return record
        self.records.append(record)
        return record

    def list_recent(self, limit: int = 50) -> Sequence[SupplyRiskRecord]:
        if self.db is not None:
            return (
                self.db.query(SupplyRiskRecord)
                .order_by(SupplyRiskRecord.id.desc())
                .limit(limit)
                .all()
            )
        return list(reversed(self.records))[:limit]

