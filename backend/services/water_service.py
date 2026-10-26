"""Casos de uso de solicitudes de agua (HU-16)."""
from __future__ import annotations

from datetime import datetime, timezone

from ..database import db_connection
from ..repositories import water_repository
from ..schemas import WaterRequest, WaterRequestCreate


def create_request(request: WaterRequestCreate) -> WaterRequest:
    with db_connection() as conn:
        row = water_repository.insert_request(
            conn, request, datetime.now(timezone.utc).isoformat()
        )
        return WaterRequest(**dict(row))


def list_requests() -> list[WaterRequest]:
    with db_connection() as conn:
        return [
            WaterRequest(**dict(row)) for row in water_repository.list_requests(conn)
        ]
