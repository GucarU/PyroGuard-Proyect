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
    photo_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'PENDIENTE',
    created_at TEXT NOT NULL
)
"""

CREATE_ALBERGUES_TABLE = """
CREATE TABLE IF NOT EXISTS albergues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK(capacity > 0),
    occupancy INTEGER NOT NULL DEFAULT 0 CHECK(occupancy >= 0),
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    updated_at TEXT NOT NULL
)
"""

SCHEMA_STATEMENTS = (
    CREATE_ALERTAS_TABLE,
    CREATE_SENSORES_ESTADO_TABLE,
    CREATE_TEMPERATURAS_TABLE,
    CREATE_REPORTES_VECINALES_TABLE,
    CREATE_ALBERGUES_TABLE,
)


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
