"""SQL de HU-12: reportes vecinales."""
from __future__ import annotations

import sqlite3


def insert_report(
    conn: sqlite3.Connection,
    *,
    photo_path: str,
    original_filename: str,
    latitude: float,
    longitude: float,
    description: str,
    created_at: str,
) -> sqlite3.Row:
    cursor = conn.execute(
        """
        INSERT INTO reportes_vecinales (
            photo_path, original_filename, latitude, longitude,
            description, status, created_at
        ) VALUES (?, ?, ?, ?, ?, 'PENDIENTE', ?)
        """,
        (photo_path, original_filename, latitude, longitude, description, created_at),
    )
    return conn.execute(
        "SELECT * FROM reportes_vecinales WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()


def list_reports(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute("SELECT * FROM reportes_vecinales ORDER BY id DESC").fetchall()
