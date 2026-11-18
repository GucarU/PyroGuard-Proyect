"""Acciones sobre alertas, registros de evacuación y grifos de práctica."""
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import require_admin, require_citizen, require_field_profile
from ..database import db_connection
from ..schemas import Alert, AlertAction, AlertDecision, AuthUser, Hydrant, HydrantAction, HydrantCreate, HydrantStatus, HydrantUpdate, SafeCheckin, SafeCheckinCreate
from ..services import alert_service, hydrant_service

router = APIRouter(tags=["Hito 2 - operaciones de prueba"])
field_profile = [Depends(require_field_profile)]
Admin = Annotated[AuthUser, Depends(require_admin)]
FieldAdmin = Annotated[AuthUser, Depends(require_field_profile)]


def _now():
    return datetime.now(timezone.utc).isoformat()


def _decide_alert(alert_id: int, user: AuthUser, decision: AlertDecision) -> Alert:
    try:
        return alert_service.decide_alert(alert_id, decision, user)
    except alert_service.AlertNotFoundError as error:
        raise HTTPException(404, "Foco no encontrado") from error
    except alert_service.AlertDecisionConflictError as error:
        raise HTTPException(409, str(error)) from error


@router.patch("/api/alerts/{alert_id}/validate", response_model=Alert)
def validate_alert(alert_id: int, user: Admin):
    return _decide_alert(alert_id, user, "VALIDADO")


@router.patch("/api/alerts/{alert_id}/discard", response_model=Alert)
def discard_alert(alert_id: int, user: Admin):
    return _decide_alert(alert_id, user, "FALSA_ALARMA")


@router.get("/api/alerts/{alert_id}/history", response_model=list[AlertAction], dependencies=[Depends(require_admin)])
def list_alert_history(alert_id: int):
    try:
        return alert_service.list_alert_history(alert_id)
    except alert_service.AlertNotFoundError as error:
        raise HTTPException(404, "Foco no encontrado") from error


@router.get("/api/sectors", dependencies=[Depends(require_admin)])
def list_sectors():
    with db_connection() as db:
        a = db.execute("SELECT sector, latitude, longitude FROM alertas").fetchall()
        b = db.execute("SELECT sector, latitude, longitude FROM sensores_estado").fetchall()
    result = {}
    for row in [*a, *b]:
        key = row["sector"].strip().casefold()
        if key and key not in result:
            result[key] = {"sector": row["sector"], "latitude": row["latitude"], "longitude": row["longitude"]}
    return sorted(result.values(), key=lambda x: x["sector"].casefold())


@router.post("/api/evacuations/safe", response_model=SafeCheckin, status_code=201,
             dependencies=[Depends(require_citizen)])
def check_in_safe(request: SafeCheckinCreate):
    with db_connection() as db:
        now = _now()
        cur = db.execute("INSERT INTO reportes_a_salvo (alias,sector,status,reported_at) VALUES (?,?,'A_SALVO',?)",
                         (request.alias.strip(), request.sector.strip(), now))
        return SafeCheckin(**dict(db.execute("SELECT * FROM reportes_a_salvo WHERE id=?", (cur.lastrowid,)).fetchone()))


@router.get("/api/evacuations/safe", response_model=list[SafeCheckin], dependencies=field_profile)
def list_checkins():
    with db_connection() as db:
        return [SafeCheckin(**dict(row)) for row in db.execute("SELECT * FROM reportes_a_salvo ORDER BY id DESC").fetchall()]


@router.get("/api/hydrants", response_model=list[Hydrant], dependencies=field_profile)
def list_hydrants(sector: str | None = Query(default=None, max_length=120), status: HydrantStatus | None = None):
    return hydrant_service.list_hydrants(sector, status)


@router.post("/api/hydrants", response_model=Hydrant, status_code=201)
def create_hydrant(request: HydrantCreate, user: FieldAdmin):
    return hydrant_service.create_hydrant(request, user)


@router.patch("/api/hydrants/{hydrant_id}", response_model=Hydrant)
def update_hydrant(hydrant_id: int, request: HydrantUpdate, user: FieldAdmin):
    try:
        return hydrant_service.update_hydrant(hydrant_id, request, user)
    except hydrant_service.HydrantNotFoundError as error:
        raise HTTPException(404, "Grifo no encontrado") from error


@router.get("/api/hydrants/{hydrant_id}/history", response_model=list[HydrantAction], dependencies=field_profile)
def list_hydrant_history(hydrant_id: int):
    try:
        return hydrant_service.list_history(hydrant_id)
    except hydrant_service.HydrantNotFoundError as error:
        raise HTTPException(404, "Grifo no encontrado") from error
