"""Reglas de negocio de HU-15: actualización de cupos de albergues."""
from __future__ import annotations

from datetime import datetime, timezone

from ..database import db_connection
from ..repositories import shelter_repository
from ..schemas import Shelter


class ShelterNotFoundError(Exception):
    """El albergue solicitado no existe."""


class ShelterCapacityError(Exception):
    """La actualización dejaría una ocupación inválida."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _seed_shelters_if_empty(conn) -> None:
    if shelter_repository.count_shelters(conn) > 0:
        return
    now = _now()
    shelter_repository.insert_shelter(
        conn,
        name="Albergue Municipal Playa Ancha",
        capacity=100,
        occupancy=76,
        latitude=-33.0249,
        longitude=-71.6412,
        updated_at=now,
    )
    shelter_repository.insert_shelter(
        conn,
        name="Albergue Rodelillo",
        capacity=60,
        occupancy=60,
        latitude=-33.0678,
        longitude=-71.5788,
        updated_at=now,
    )


def _to_shelter(row) -> Shelter:
    available = max(0, row["capacity"] - row["occupancy"])
    return Shelter(
        id=row["id"],
        name=row["name"],
        capacity=row["capacity"],
        occupancy=row["occupancy"],
        available_slots=available,
        full=row["occupancy"] >= row["capacity"],
        latitude=row["latitude"],
        longitude=row["longitude"],
        updated_at=row["updated_at"],
    )


def list_shelters() -> list[Shelter]:
    with db_connection() as conn:
        _seed_shelters_if_empty(conn)
        return [_to_shelter(row) for row in shelter_repository.list_shelters(conn)]


def change_occupancy(shelter_id: int, delta: int) -> Shelter:
    with db_connection() as conn:
        _seed_shelters_if_empty(conn)
        row = shelter_repository.get_shelter(conn, shelter_id)
        if row is None:
            raise ShelterNotFoundError(shelter_id)
        new_occupancy = row["occupancy"] + delta
        if new_occupancy < 0 or new_occupancy > row["capacity"]:
            raise ShelterCapacityError(shelter_id)
        updated = shelter_repository.update_occupancy(conn, shelter_id, new_occupancy, _now())
        return _to_shelter(updated)
