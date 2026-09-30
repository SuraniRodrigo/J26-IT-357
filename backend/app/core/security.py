from __future__ import annotations

from app.core.config import settings


def validate_api_access() -> bool:
    return settings.app_env in {"development", "staging", "production"}
