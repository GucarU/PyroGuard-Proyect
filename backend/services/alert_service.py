"""Dominio: reglas de negocio de HU-01 (RF01).

Aquí viven las reglas: solo hay alerta si hay humo, la prioridad se calcula
según el nivel de humo y una alerta no se despacha dos veces. No conoce HTTP:
lanza excepciones propias y el router las traduce a códigos de estado.
"""
from __future__ import annotations

import sqlite3
import sys
from datetime import datetime, timezone
from typing import Literal

from .. import database
from ..repositories import alert_repository
from ..schemas import Alert, AlertAction, AlertDecision, AuthUser, DispatchRequest, SensorDetection

Priority = Literal["BAJA", "MEDIA", "ALTA"]


class AlertNotFoundError(Exception):
    """La alerta pedida no existe (-> 404)."""


class AlertAlreadyDispatchedError(Exception):
    """La alerta ya tenía una unidad despachada (-> 409)."""


class AlertDecisionConflictError(Exception):
    """El estado actual no admite la decisión solicitada."""


class AlertPersistenceError(Exception):
    """Falló el guardado en la base de datos (-> 500)."""




def _open_db_connection():
    """Abre la conexión manteniendo compatibilidad con las pruebas de HU-01."""
    main_module = sys.modules.get("backend.main")
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
    message = f"Sensor {detection.sensor_id} detectó humo en {detection.sector}."

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


def dispatch_unit(alert_id: int, request: DispatchRequest, actor: AuthUser) -> Alert:
    with _open_db_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        alert = alert_repository.get_alert(conn, alert_id)
        if alert is None:
            raise AlertNotFoundError(alert_id)
        if alert.status != "PENDIENTE":
            raise AlertAlreadyDispatchedError(alert_id)
        dispatched_at = datetime.now(timezone.utc).isoformat()
        updated = alert_repository.mark_dispatched(conn, alert_id, request.unit, dispatched_at)
        alert_repository.record_action(conn, alert_id, actor, "UNIDAD_DESPACHADA", dispatched_at)
        return updated


def decide_alert(alert_id: int, decision: AlertDecision, actor: AuthUser) -> Alert:
    with _open_db_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        alert = alert_repository.get_alert(conn, alert_id)
        if alert is None:
            raise AlertNotFoundError(alert_id)
        if decision == "VALIDADO" and alert.status not in {"PENDIENTE", "UNIDAD_DESPACHADA"}:
            raise AlertDecisionConflictError("El foco ya fue validado o descartado")
        if decision == "FALSA_ALARMA" and alert.status != "PENDIENTE":
            raise AlertDecisionConflictError("Solo se pueden descartar focos pendientes sin despacho")
        acted_at = datetime.now(timezone.utc).isoformat()
        updated = alert_repository.mark_decision(conn, alert_id, decision, actor.name, acted_at)
        alert_repository.record_action(conn, alert_id, actor, decision, acted_at)
        return updated


def list_alert_history(alert_id: int) -> list[AlertAction]:
    with _open_db_connection() as conn:
        conn.execute("BEGIN")
        alert = alert_repository.get_alert(conn, alert_id)
        if alert is None:
            raise AlertNotFoundError(alert_id)
        actions = alert_repository.list_actions(conn, alert_id)

    recorded = {entry.action for entry in actions}
    for action, name, date in (
        ("UNIDAD_DESPACHADA", None, alert.dispatched_at),
        ("VALIDADO", alert.validated_by, alert.validated_at),
        ("FALSA_ALARMA", alert.discarded_by, alert.discarded_at),
    ):
        if action not in recorded and (name or date):
            actions.append(AlertAction(alert_id=alert_id, action=action, actor_name=name, acted_at=date))
    return sorted(actions, key=lambda entry: entry.acted_at or "")


def clear_alerts() -> None:
    with _open_db_connection() as conn:
        alert_repository.delete_all(conn)

