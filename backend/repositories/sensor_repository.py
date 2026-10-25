"""SQL de HU-02, HU-03 y HU-04. Sin reglas de negocio."""
from __future__ import annotations

import sqlite3


def count_sensors(conn: sqlite3.Connection) -> int:
    return int(conn.execute("SELECT COUNT(*) FROM sensores_estado").fetchone()[0])


def insert_sensor(
    conn: sqlite3.Connection,
    *,
    sensor_id: str,
    sector: str,
    battery_level: int,
    wind_speed_kmh: float,
    latitude: float,
    longitude: float,
    updated_at: str,
) -> None:
    conn.execute(
        """
        INSERT INTO sensores_estado (
            sensor_id, sector, battery_level, wind_speed_kmh,
            latitude, longitude, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (sensor_id, sector, battery_level, wind_speed_kmh, latitude, longitude, updated_at),
    )


def list_sensors(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute("SELECT * FROM sensores_estado ORDER BY sensor_id").fetchall()


def get_sensor(conn: sqlite3.Connection, sensor_id: str) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM sensores_estado WHERE sensor_id = ?", (sensor_id,)
    ).fetchone()


def update_battery(
    conn: sqlite3.Connection, sensor_id: str, battery_level: int, updated_at: str
) -> sqlite3.Row | None:
    cursor = conn.execute(
        "UPDATE sensores_estado SET battery_level = ?, updated_at = ? WHERE sensor_id = ?",
        (battery_level, updated_at, sensor_id),
    )
    if cursor.rowcount == 0:
        return None
    return get_sensor(conn, sensor_id)


def update_wind(
    conn: sqlite3.Connection, sensor_id: str, wind_speed_kmh: float, updated_at: str
) -> sqlite3.Row | None:
    cursor = conn.execute(
        "UPDATE sensores_estado SET wind_speed_kmh = ?, updated_at = ? WHERE sensor_id = ?",
        (wind_speed_kmh, updated_at, sensor_id),
    )
    if cursor.rowcount == 0:
        return None
    return get_sensor(conn, sensor_id)


def insert_temperature(
    conn: sqlite3.Connection, sensor_id: str, temperature_c: float, recorded_at: str
) -> sqlite3.Row:
    cursor = conn.execute(
        "INSERT INTO sensor_temperaturas (sensor_id, temperature_c, recorded_at) VALUES (?, ?, ?)",
        (sensor_id, temperature_c, recorded_at),
    )
    return conn.execute(
        "SELECT * FROM sensor_temperaturas WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()


def list_temperature_history(
    conn: sqlite3.Connection, sensor_id: str, limit: int
) -> list[sqlite3.Row]:
    rows = conn.execute(
        """
        SELECT * FROM sensor_temperaturas
        WHERE sensor_id = ?
        ORDER BY id DESC
        LIMIT ?
        """,
        (sensor_id, limit),
    ).fetchall()
    return list(reversed(rows))
