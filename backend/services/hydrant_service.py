"""Consulta, edición y trazabilidad de los grifos operativos."""
import json
import sqlite3
from datetime import datetime, timezone

from ..database import db_connection
from ..schemas import AuthUser, Hydrant, HydrantAction, HydrantCreate, HydrantStatus, HydrantUpdate


class HydrantNotFoundError(Exception):
    pass


def _get(db: sqlite3.Connection, hydrant_id: int) -> sqlite3.Row:
    row = db.execute("SELECT * FROM grifos_demo WHERE id = ?", (hydrant_id,)).fetchone()
    if row is None:
        raise HydrantNotFoundError(hydrant_id)
    return row


def _to_hydrant(row: sqlite3.Row) -> Hydrant:
    return Hydrant(**{**dict(row), "updated_at": row["updated_at"] or row["created_at"]})


def list_hydrants(sector: str | None, status: HydrantStatus | None) -> list[Hydrant]:
    with db_connection() as db:
        if status is None:
            rows = db.execute("SELECT * FROM grifos_demo ORDER BY id DESC").fetchall()
        else:
            rows = db.execute("SELECT * FROM grifos_demo WHERE status = ? ORDER BY id DESC", (status,)).fetchall()
    if sector is not None:
        normalized = " ".join(sector.split()).casefold()
        rows = [row for row in rows if " ".join(row["sector"].split()).casefold() == normalized]
    return [_to_hydrant(row) for row in rows]


def _record_change(
    db: sqlite3.Connection, row: sqlite3.Row, previous: HydrantStatus | None, fields: list[str],
) -> None:
    db.execute(
        """INSERT INTO hydrant_actions
           (hydrant_id, actor_id, actor_name, action, previous_status, status, changed_fields, acted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (row["id"], row["updated_by_id"], row["updated_by"], "EDITADO" if previous else "CREADO",
         previous, row["status"], json.dumps(fields), row["updated_at"]),
    )


def _authored_values(actor: AuthUser) -> dict:
    return {"updated_by_id": actor.id, "updated_by": actor.name, "updated_at": datetime.now(timezone.utc).isoformat()}


def create_hydrant(request: HydrantCreate, actor: AuthUser) -> Hydrant:
    with db_connection() as db:
        row = db.execute(
            """INSERT INTO grifos_demo
               (name, sector, latitude, longitude, status, demo, created_at, updated_at, updated_by_id, updated_by)
               VALUES (:name, :sector, :latitude, :longitude, :status, :demo, :updated_at, :updated_at, :updated_by_id, :updated_by)
               RETURNING *""",
            {**request.model_dump(), **_authored_values(actor)},
        ).fetchone()
        _record_change(db, row, None, [])
        return _to_hydrant(row)


def update_hydrant(hydrant_id: int, request: HydrantUpdate, actor: AuthUser) -> Hydrant:
    with db_connection() as db:
        db.execute("BEGIN IMMEDIATE")
        current = _get(db, hydrant_id)
        edits = {field: value for field, value in request.model_dump(exclude_none=True).items() if value != current[field]}
        if not edits:
            return _to_hydrant(current)
        updated = db.execute(
            """UPDATE grifos_demo SET name = :name, sector = :sector, latitude = :latitude, longitude = :longitude,
               status = :status, demo = :demo, updated_at = :updated_at, updated_by_id = :updated_by_id, updated_by = :updated_by
               WHERE id = :id RETURNING *""",
            {**dict(current), **edits, **_authored_values(actor)},
        ).fetchone()
        _record_change(db, updated, current["status"], list(edits))
        return _to_hydrant(updated)


def list_history(hydrant_id: int) -> list[HydrantAction]:
    with db_connection() as db:
        db.execute("BEGIN")
        hydrant = _get(db, hydrant_id)
        rows = db.execute("SELECT * FROM hydrant_actions WHERE hydrant_id = ? ORDER BY id", (hydrant_id,)).fetchall()

    actions = [HydrantAction(**{**dict(row), "changed_fields": json.loads(row["changed_fields"])}) for row in rows]
    if not actions or actions[0].action != "CREADO":
        initial_status = actions[0].previous_status if actions else hydrant["status"]
        actions.insert(0, HydrantAction(
            hydrant_id=hydrant_id, action="CREADO", status=initial_status, acted_at=hydrant["created_at"],
        ))
    return actions
