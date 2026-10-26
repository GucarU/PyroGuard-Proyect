"""Consultas SQL de solicitudes de agua (HU-16)."""
from __future__ import annotations

import sqlite3

from ..schemas import WaterRequestCreate


def insert_request(
    conn: sqlite3.Connection, request: WaterRequestCreate, created_at: str
) -> sqlite3.Row:
    cursor = conn.execute(
        """
        INSERT INTO solicitudes_agua (requester, latitude, longitude, description, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (request.requester, request.latitude, request.longitude, request.description, created_at),
    )
    return conn.execute(
        "SELECT * FROM solicitudes_agua WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()


def list_requests(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM solicitudes_agua ORDER BY id DESC"
    ).fetchall()
