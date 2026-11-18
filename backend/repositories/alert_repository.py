"""Infraestructura: todo el SQL de la tabla alertas.

No contiene reglas de negocio; solo lee y escribe. Cada función recibe la
conexión abierta por el servicio, así el servicio controla la transacción.
"""
from __future__ import annotations

import sqlite3

from ..schemas import Alert, AlertAction, AlertActionType, AlertDecision, AuthUser


def _row_to_alert(row: sqlite3.Row) -> Alert:
    return Alert(**dict(row))


def insert_alert(
    conn: sqlite3.Connection,
    *,
    user_story: str,
    requirement: str,
    sensor_id: str,
    sector: str,
    smoke_level: int,
    latitude: float,
    longitude: float,
    priority: str,
    status: str,
    message: str,
    detected_at: str,
) -> Alert:
    cursor = conn.execute(
        """
        INSERT INTO alertas (
            user_story, requirement, sensor_id, sector, smoke_level,
            latitude, longitude, priority, status, message, detected_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_story,
            requirement,
            sensor_id,
            sector,
            smoke_level,
            latitude,
            longitude,
            priority,
            status,
            message,
            detected_at,
        ),
    )
    row = conn.execute("SELECT * FROM alertas WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return _row_to_alert(row)


def list_alerts(conn: sqlite3.Connection) -> list[Alert]:
    rows = conn.execute("SELECT * FROM alertas ORDER BY id DESC").fetchall()
    return [_row_to_alert(row) for row in rows]


def get_alert(conn: sqlite3.Connection, alert_id: int) -> Alert | None:
    row = conn.execute("SELECT * FROM alertas WHERE id = ?", (alert_id,)).fetchone()
    return _row_to_alert(row) if row is not None else None


def mark_dispatched(
    conn: sqlite3.Connection, alert_id: int, unit: str, dispatched_at: str
) -> Alert:
    conn.execute(
        """
        UPDATE alertas
        SET status = 'UNIDAD_DESPACHADA', dispatched_at = ?, dispatched_unit = ?
        WHERE id = ?
        """,
        (dispatched_at, unit, alert_id),
    )
    row = conn.execute("SELECT * FROM alertas WHERE id = ?", (alert_id,)).fetchone()
    return _row_to_alert(row)


def mark_decision(conn: sqlite3.Connection, alert_id: int, decision: AlertDecision, actor: str, acted_at: str) -> Alert:
    name_column, date_column = (
        ("validated_by", "validated_at") if decision == "VALIDADO" else ("discarded_by", "discarded_at")
    )
    row = conn.execute(
        f"UPDATE alertas SET status = ?, {name_column} = ?, {date_column} = ? WHERE id = ? RETURNING *",
        (decision, actor, acted_at, alert_id),
    ).fetchone()
    return _row_to_alert(row)


def record_action(conn: sqlite3.Connection, alert_id: int, actor: AuthUser, action: AlertActionType, acted_at: str) -> None:
    conn.execute(
        "INSERT INTO alert_actions (alert_id, actor_id, actor_name, action, acted_at) VALUES (?, ?, ?, ?, ?)",
        (alert_id, actor.id, actor.name, action, acted_at),
    )


def list_actions(conn: sqlite3.Connection, alert_id: int) -> list[AlertAction]:
    rows = conn.execute("SELECT * FROM alert_actions WHERE alert_id = ? ORDER BY id", (alert_id,)).fetchall()
    return [AlertAction(**dict(row)) for row in rows]


def delete_all(conn: sqlite3.Connection) -> None:
    conn.execute("DELETE FROM alertas")
    conn.execute("DELETE FROM sqlite_sequence WHERE name = 'alertas'")
