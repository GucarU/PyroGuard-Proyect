"""SQL de HU-15: albergues y contador de ocupación."""
from __future__ import annotations

import sqlite3


def count_shelters(conn: sqlite3.Connection) -> int:
    return int(conn.execute("SELECT COUNT(*) FROM albergues").fetchone()[0])


def insert_shelter(
    conn: sqlite3.Connection,
    *,
    name: str,
    capacity: int,
    occupancy: int,
    latitude: float,
    longitude: float,
    updated_at: str,
    status: str = "ABIERTO",
) -> None:
    conn.execute(
        """
        INSERT INTO albergues (name, capacity, occupancy, status, latitude, longitude, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (name, capacity, occupancy, status, latitude, longitude, updated_at),
    )


def list_shelters(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute("SELECT * FROM albergues ORDER BY id").fetchall()


def get_shelter(conn: sqlite3.Connection, shelter_id: int) -> sqlite3.Row | None:
    return conn.execute("SELECT * FROM albergues WHERE id = ?", (shelter_id,)).fetchone()


def update_occupancy(
    conn: sqlite3.Connection, shelter_id: int, occupancy: int, updated_at: str
) -> sqlite3.Row | None:
    cursor = conn.execute(
        "UPDATE albergues SET occupancy = ?, updated_at = ? WHERE id = ?",
        (occupancy, updated_at, shelter_id),
    )
    if cursor.rowcount == 0:
        return None
    return get_shelter(conn, shelter_id)


def update_status(
    conn: sqlite3.Connection, shelter_id: int, status: str, updated_at: str
) -> sqlite3.Row | None:
    cursor = conn.execute(
        "UPDATE albergues SET status = ?, updated_at = ? WHERE id = ?",
        (status, updated_at, shelter_id),
    )
    if cursor.rowcount == 0:
        return None
    return get_shelter(conn, shelter_id)
