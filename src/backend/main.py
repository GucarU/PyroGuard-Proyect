from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

APP_DIR = Path(__file__).resolve().parent
DB_PATH = APP_DIR / "pyroguard.db"

app = FastAPI(
    title="PyroGuard API",
    version="0.1.0",
    description="API del Sprint 1 para HU-01: alerta automática por detección de humo.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SensorDetection(BaseModel):
    sensor_id: str = Field(min_length=1, max_length=50)
    sector: str = Field(min_length=1, max_length=120)
    smoke_detected: bool
    smoke_level: int = Field(ge=0, le=100)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    battery_level: int = Field(default=100, ge=0, le=100)


class DispatchRequest(BaseModel):
    unit: str = Field(default="BRAVO-1", min_length=1, max_length=50)


class Alert(BaseModel):
    id: int
    user_story: str
    requirement: str
    sensor_id: str
    sector: str
    smoke_level: int
    latitude: float
    longitude: float
    priority: Literal["BAJA", "MEDIA", "ALTA"]
    status: Literal["PENDIENTE", "UNIDAD_DESPACHADA"]
    message: str
    detected_at: str
    dispatched_at: str | None = None
    dispatched_unit: str | None = None


@contextmanager
def db_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def init_db() -> None:
    with db_connection() as conn:
        conn.execute(
            """
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
            """
            CREATE TABLE IF NOT EXISTS mediciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_id TEXT NOT NULL,
                battery_level INTEGER NOT NULL,
                timestamp TEXT NOT NULL
            )
            """
        )


def row_to_alert(row: sqlite3.Row) -> Alert:
    return Alert(**dict(row))


def priority_for(smoke_level: int) -> Literal["BAJA", "MEDIA", "ALTA"]:
    if smoke_level >= 70:
        return "ALTA"
    if smoke_level >= 40:
        return "MEDIA"
    return "BAJA"


# Inicializa la base de datos al cargar el módulo para que funcione tanto con
# Uvicorn como con las pruebas automáticas.
init_db()


@app.get("/", tags=["Sistema"])
def root():
    return {
        "system": "PyroGuard",
        "user_story": "HU-01",
        "requirement": "RF01",
        "message": "API operativa. Documentación disponible en /docs.",
    }


@app.get("/health", tags=["Sistema"])
def health():
    return {"status": "ok"}


@app.post(
    "/api/sensors/detections",
    tags=["Sensores"],
    status_code=status.HTTP_201_CREATED,
)
def receive_sensor_detection(detection: SensorDetection):
    """Recibe una lectura del sensor y crea una alerta solo si se detectó humo."""
    if not detection.smoke_detected:
        return {
            "alert_created": False,
            "message": "Lectura recibida. No se detectó humo; no se creó una alerta.",
            "alert": None,
        }

    priority = priority_for(detection.smoke_level)
    detected_at = datetime.now(timezone.utc).isoformat()
    message = f"Sensor {detection.sensor_id} detectó humo en {detection.sector}."

    try:
        with db_connection() as conn:
            conn.execute(
                """
                INSERT INTO mediciones (sensor_id, battery_level, timestamp)
                VALUES (?, ?, ?)
                """,
                (detection.sensor_id, detection.battery_level, detected_at)
            )
            cursor = conn.execute(
                """
                INSERT INTO alertas (
                    user_story, requirement, sensor_id, sector, smoke_level,
                    latitude, longitude, priority, status, message, detected_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "HU-01",
                    "RF01",
                    detection.sensor_id,
                    detection.sector,
                    detection.smoke_level,
                    detection.latitude,
                    detection.longitude,
                    priority,
                    "PENDIENTE",
                    message,
                    detected_at,
                ),
            )
            row = conn.execute(
                "SELECT * FROM alertas WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
    except sqlite3.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No fue posible guardar la alerta en la base de datos.",
        ) from exc

    return {
        "alert_created": True,
        "message": "Alerta automática creada y disponible para la central de emergencias.",
        "alert": row_to_alert(row),
    }


@app.get("/api/alerts", response_model=list[Alert], tags=["Alertas"])
def list_alerts():
    with db_connection() as conn:
        rows = conn.execute("SELECT * FROM alertas ORDER BY id DESC").fetchall()
    return [row_to_alert(row) for row in rows]


@app.get("/api/alerts/{alert_id}", response_model=Alert, tags=["Alertas"])
def get_alert(alert_id: int):
    with db_connection() as conn:
        row = conn.execute("SELECT * FROM alertas WHERE id = ?", (alert_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Alerta no encontrada.")
    return row_to_alert(row)


@app.patch("/api/alerts/{alert_id}/dispatch", response_model=Alert, tags=["Alertas"])
def dispatch_unit(alert_id: int, request: DispatchRequest):
    dispatched_at = datetime.now(timezone.utc).isoformat()
    with db_connection() as conn:
        row = conn.execute("SELECT * FROM alertas WHERE id = ?", (alert_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Alerta no encontrada.")
        if row["status"] == "UNIDAD_DESPACHADA":
            raise HTTPException(status_code=409, detail="La alerta ya tiene una unidad despachada.")

        conn.execute(
            """
            UPDATE alertas
            SET status = 'UNIDAD_DESPACHADA', dispatched_at = ?, dispatched_unit = ?
            WHERE id = ?
            """,
            (dispatched_at, request.unit, alert_id),
        )
        updated = conn.execute("SELECT * FROM alertas WHERE id = ?", (alert_id,)).fetchone()
    return row_to_alert(updated)


@app.delete("/api/dev/alerts", tags=["Desarrollo"])
def clear_alerts():
    """Limpia alertas para repetir pruebas durante el Sprint 1."""
    with db_connection() as conn:
        conn.execute("DELETE FROM alertas")
        conn.execute("DELETE FROM sqlite_sequence WHERE name = 'alertas'")
    return {"message": "Alertas eliminadas."}

@app.get("/api/sensors/status", tags=["Sensores"])
def get_sensors_status():
    """HU-02: Devuelve el nivel de batería y último estado de los sensores."""
    with db_connection() as conn:
        rows = conn.execute(
            """
            SELECT sensor_id, battery_level, MAX(timestamp) as last_update
            FROM mediciones
            GROUP BY sensor_id
            """
        ).fetchall()
    return [dict(row) for row in rows]