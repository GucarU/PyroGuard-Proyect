"""Dominio: reglas de negocio de HU-01 (RF01).

AquÃ­ viven las reglas: solo hay alerta si hay humo, la prioridad se calcula
segÃºn el nivel de humo y una alerta no se despacha dos veces. No conoce HTTP:
lanza excepciones propias y el router las traduce a cÃ³digos de estado.
"""
from __future__ import annotations

import sqlite3
import sys
from datetime import datetime, timezone
from typing import Literal

from .. import database
from ..repositories import alert_repository
from ..schemas import Alert, DispatchRequest, SensorDetection

Priority = Literal["BAJA", "MEDIA", "ALTA"]


class AlertNotFoundError(Exception):
    """La alerta pedida no existe (-> 404)."""


class AlertAlreadyDispatchedError(Exception):
    """La alerta ya tenÃ­a una unidad despachada (-> 409)."""


class AlertPersistenceError(Exception):
    """FallÃ³ el guardado en la base de datos (-> 500)."""




def _open_db_connection():
    """Abre la conexión manteniendo compatibilidad con las pruebas de HU-01."""
    main_module = sys.modules.get("src.backend.main")
    connector = getattr(main_module, "db_connection", database.db_connection)
    return connector()
def priority_for(smoke_level: int) -> Priority:
    """Regla de prioridad: >= 70 ALTA, >= 40 MEDIA, en otro caso BAJA."""
    if smoke_level >= 70:
        return "ALTA"
    if smoke_level >= 40:
        return "MEDIA"
    return "BAJA"


def process_detection(detection: SensorDetection) -> Alert | None:
    """Crea una alerta PENDIENTE solo si hubo humo; si no, devuelve None."""
    if not detection.smoke_detected:
        return None

    priority = priority_for(detection.smoke_level)
    detected_at = datetime.now(timezone.utc).isoformat()
    message = f"Sensor {detection.sensor_id} detectÃ³ humo en {detection.sector}."

    try:
        with _open_db_connection() as conn:
            return alert_repository.insert_alert(
                conn,
                user_story="HU-01",
                requirement="RF01",
                sensor_id=detection.sensor_id,
                sector=detection.sector,
                smoke_level=detection.smoke_level,
                latitude=detection.latitude,
                longitude=detection.longitude,
                priority=priority,
                status="PENDIENTE",
                message=message,
                detected_at=detected_at,
            )
    except sqlite3.Error as exc:
        raise AlertPersistenceError from exc


def list_alerts() -> list[Alert]:
    with _open_db_connection() as conn:
        return alert_repository.list_alerts(conn)


def get_alert(alert_id: int) -> Alert:
    with _open_db_connection() as conn:
        alert = alert_repository.get_alert(conn, alert_id)
    if alert is None:
        raise AlertNotFoundError(alert_id)
    return alert


def dispatch_unit(alert_id: int, request: DispatchRequest) -> Alert:
    """Despacha una unidad (extra, pendiente de registrar como CA-04)."""
    dispatched_at = datetime.now(timezone.utc).isoformat()
    with _open_db_connection() as conn:
        alert = alert_repository.get_alert(conn, alert_id)
        if alert is None:
            raise AlertNotFoundError(alert_id)
        if alert.status == "UNIDAD_DESPACHADA":
            raise AlertAlreadyDispatchedError(alert_id)
        return alert_repository.mark_dispatched(conn, alert_id, request.unit, dispatched_at)


def clear_alerts() -> None:
    with _open_db_connection() as conn:
        alert_repository.delete_all(conn)

