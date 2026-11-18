"""SQL de HU-12: reportes vecinales."""
from __future__ import annotations

import sqlite3


def insert_report(
    conn: sqlite3.Connection,
    *,
    citizen_id: int,
    photo_path: str,
    original_filename: str,
    latitude: float,
    longitude: float,
    description: str,
    created_at: str,
    location_label: str,
    submission_id: str | None,
) -> sqlite3.Row:
    cursor = conn.execute(
        """
        INSERT INTO reportes_vecinales (
            photo_path, original_filename, latitude, longitude,
            description, status, created_at, citizen_id, location_label, submission_id
        ) VALUES (?, ?, ?, ?, ?, 'PENDIENTE', ?, ?, ?, ?)
        """,
        (photo_path, original_filename, latitude, longitude, description, created_at,
         citizen_id, location_label, submission_id),
    )
    return get_report(conn, cursor.lastrowid)


def list_reports(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute("SELECT * FROM reportes_vecinales ORDER BY id DESC").fetchall()


def list_citizen_reports(conn: sqlite3.Connection, citizen_id: int) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM reportes_vecinales WHERE citizen_id = ? ORDER BY id DESC", (citizen_id,)
    ).fetchall()


def get_report(conn: sqlite3.Connection, report_id: int) -> sqlite3.Row | None:
    return conn.execute("SELECT * FROM reportes_vecinales WHERE id = ?", (report_id,)).fetchone()


def get_submission(conn: sqlite3.Connection, citizen_id: int, submission_id: str) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM reportes_vecinales WHERE citizen_id = ? AND submission_id = ?",
        (citizen_id, submission_id),
    ).fetchone()


def set_status(conn: sqlite3.Connection, report_id: int, status: str, reviewer: str, timestamp: str) -> None:
    conn.execute(
        "UPDATE reportes_vecinales SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?",
        (status, reviewer, timestamp, report_id),
    )


def set_alert(conn: sqlite3.Connection, report_id: int, alert_id: int) -> None:
    conn.execute("UPDATE reportes_vecinales SET alert_id = ? WHERE id = ?", (alert_id, report_id))
