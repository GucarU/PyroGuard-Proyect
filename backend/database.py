"""Infraestructura: conexión a SQLite configurable.

Todas las tablas usadas por PyroGuard se crean de forma idempotente al abrir
una conexión. La ruta se lee desde PYROGUARD_DB para que las pruebas puedan
trabajar con una base temporal sin tocar la base de la demo.
"""
from __future__ import annotations

import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

DEFAULT_DB_PATH = Path(__file__).resolve().parent / "pyroguard.db"

CREATE_ALERTAS_TABLE = """
CREATE TABLE IF NOT EXISTS alertas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_story TEXT NOT NULL,
    requirement TEXT NOT NULL,
    sensor_id TEXT NOT NULL,
    sector TEXT NOT NULL,
    smoke_level INTEGER NOT NULL CHECK(smoke_level BETWEEN 0 AND 100),
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDIENTE',
    message TEXT NOT NULL,
    detected_at TEXT NOT NULL,
    dispatched_at TEXT,
    dispatched_unit TEXT
)
"""

CREATE_SENSORES_ESTADO_TABLE = """
CREATE TABLE IF NOT EXISTS sensores_estado (
    sensor_id TEXT PRIMARY KEY,
    sector TEXT NOT NULL,
    battery_level INTEGER NOT NULL DEFAULT 100 CHECK(battery_level BETWEEN 0 AND 100),
    wind_speed_kmh REAL NOT NULL DEFAULT 0 CHECK(wind_speed_kmh >= 0),
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    updated_at TEXT NOT NULL
)
"""

CREATE_TEMPERATURAS_TABLE = """
CREATE TABLE IF NOT EXISTS sensor_temperaturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_id TEXT NOT NULL,
    temperature_c REAL NOT NULL,
    recorded_at TEXT NOT NULL
)
"""

CREATE_REPORTES_VECINALES_TABLE = """
CREATE TABLE IF NOT EXISTS reportes_vecinales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_path TEXT NOT NULL DEFAULT '',
    original_filename TEXT NOT NULL DEFAULT '',
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'PENDIENTE',
    created_at TEXT NOT NULL,
    citizen_id INTEGER REFERENCES auth_users(id) ON DELETE SET NULL,
    alert_id INTEGER REFERENCES alertas(id) ON DELETE SET NULL,
    reviewed_by TEXT,
    reviewed_at TEXT,
    location_label TEXT NOT NULL DEFAULT '',
    submission_id TEXT
)
"""

CREATE_ALBERGUES_TABLE = """
CREATE TABLE IF NOT EXISTS albergues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK(capacity > 0),
    occupancy INTEGER NOT NULL DEFAULT 0 CHECK(occupancy >= 0),
    status TEXT NOT NULL DEFAULT 'ABIERTO' CHECK(status IN ('ABIERTO', 'CERRADO')),
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    updated_at TEXT NOT NULL
)
"""

CREATE_SOLICITUDES_AGUA_TABLE = """
CREATE TABLE IF NOT EXISTS solicitudes_agua (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester TEXT NOT NULL,
    latitude REAL NOT NULL CHECK(latitude BETWEEN -90 AND 90),
    longitude REAL NOT NULL CHECK(longitude BETWEEN -180 AND 180),
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK(status IN ('PENDIENTE', 'EN_ATENCION', 'RESUELTA')),
    created_at TEXT NOT NULL
)
"""

CREATE_SAFE_CHECKINS_TABLE = """
CREATE TABLE IF NOT EXISTS reportes_a_salvo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias TEXT NOT NULL,
    sector TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'A_SALVO',
    reported_at TEXT NOT NULL
)
"""

CREATE_HYDRANTS_TABLE = """
CREATE TABLE IF NOT EXISTS grifos_demo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    latitude REAL NOT NULL CHECK(latitude BETWEEN -90 AND 90),
    longitude REAL NOT NULL CHECK(longitude BETWEEN -180 AND 180),
    status TEXT NOT NULL CHECK(status IN ('DISPONIBLE','SIN_AGUA','EN_REVISION')),
    demo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
)
"""

CREATE_USERS_TABLE = """
CREATE TABLE IF NOT EXISTS auth_users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('ADMIN', 'CIUDADANO')),
    profile TEXT,
    CHECK((role = 'CIUDADANO' AND profile IS NULL) OR
          (role = 'ADMIN' AND profile IS NOT NULL AND profile IN ('operador', 'bombero', 'municipal')))
)
"""

CREATE_SESSIONS_TABLE = """
CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
)
"""

SCHEMA_STATEMENTS = (
    CREATE_USERS_TABLE,
    CREATE_ALERTAS_TABLE,
    CREATE_SENSORES_ESTADO_TABLE,
    CREATE_TEMPERATURAS_TABLE,
    CREATE_REPORTES_VECINALES_TABLE,
    CREATE_ALBERGUES_TABLE,
    CREATE_SOLICITUDES_AGUA_TABLE,
    CREATE_SAFE_CHECKINS_TABLE,
    CREATE_HYDRANTS_TABLE,
    CREATE_SESSIONS_TABLE,
    "CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions(expires_at)",
)

LEGACY_COLUMNS = {
    "alertas": dict.fromkeys(("validated_by", "validated_at", "discarded_by", "discarded_at"), "TEXT"),
    "albergues": {"status": "TEXT NOT NULL DEFAULT 'ABIERTO'"},
    "reportes_vecinales": {
        "citizen_id": "INTEGER REFERENCES auth_users(id) ON DELETE SET NULL",
        "alert_id": "INTEGER REFERENCES alertas(id) ON DELETE SET NULL",
        "reviewed_by": "TEXT",
        "reviewed_at": "TEXT",
        "location_label": "TEXT NOT NULL DEFAULT ''",
        "submission_id": "TEXT",
    },
}


def _missing_legacy_columns(connection: sqlite3.Connection) -> Iterator[tuple[str, str, str]]:
    for table, additions in LEGACY_COLUMNS.items():
        existing = {row["name"] for row in connection.execute(f"PRAGMA table_info({table})")}
        for field, definition in additions.items():
            if field not in existing:
                yield table, field, definition


def get_db_path() -> Path:
    """Se evalúa en cada llamada para permitir cambiar PYROGUARD_DB en pruebas."""
    return Path(os.environ.get("PYROGUARD_DB") or DEFAULT_DB_PATH)


def get_connection() -> sqlite3.Connection:
    """Abre una conexión y garantiza que el esquema requerido exista."""
    db_path = get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path)
    try:
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        for statement in SCHEMA_STATEMENTS:
            connection.execute(statement)
        if next(_missing_legacy_columns(connection), None) is not None:
            connection.execute("BEGIN IMMEDIATE")
            for table, field, definition in _missing_legacy_columns(connection):
                connection.execute(f"ALTER TABLE {table} ADD COLUMN {field} {definition}")
            connection.commit()
        connection.execute("CREATE INDEX IF NOT EXISTS reportes_vecinales_citizen ON reportes_vecinales(citizen_id, id)")
        connection.execute("CREATE INDEX IF NOT EXISTS reportes_vecinales_alert ON reportes_vecinales(alert_id)")
        connection.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS reportes_vecinales_submission "
            "ON reportes_vecinales(citizen_id, submission_id) WHERE submission_id IS NOT NULL"
        )
    except Exception:
        connection.close()
        raise
    return connection


@contextmanager
def db_connection() -> Iterator[sqlite3.Connection]:
    """Una transacción: commit si todo sale bien, rollback si hay error."""
    connection = get_connection()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
