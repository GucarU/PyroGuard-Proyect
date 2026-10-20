"""Infraestructura: conexión a SQLite configurable.

La ruta de la base se lee de la variable de entorno PYROGUARD_DB cada vez que
se abre una conexión. Si no existe, se usa src/backend/pyroguard.db.
Las pruebas apuntan PYROGUARD_DB a una base temporal para no tocar la real.
"""
from __future__ import annotations

import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

DEFAULT_DB_PATH = Path(__file__).resolve().parent / "pyroguard.db"

# Único lugar donde se define la tabla de alertas.
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


def get_db_path() -> Path:
    """Se evalúa en cada llamada (no al importar) para que PYROGUARD_DB pueda cambiar."""
    return Path(os.environ.get("PYROGUARD_DB") or DEFAULT_DB_PATH)


def get_connection() -> sqlite3.Connection:
    """Abre una conexión y crea la tabla si no existe."""
    connection = sqlite3.connect(get_db_path())
    try:
        connection.row_factory = sqlite3.Row
        connection.execute(CREATE_ALERTAS_TABLE)
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
