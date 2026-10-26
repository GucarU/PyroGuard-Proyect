"""Funciones operativas del Hito 2 para pruebas internas.

Advertencia: los roles se declaran en una cabecera, NO existe autenticación
real. Estos registros son DEMO y NO deben utilizarse en emergencias.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException, Query

from ..database import db_connection
from ..schemas import Alert, ActorAction, SafeCheckin, SafeCheckinCreate, Hydrant, HydrantCreate

router = APIRouter(tags=["Hito 2 - operaciones de prueba"])


def _now():
    return datetime.now(timezone.utc).isoformat()


@router.patch("/api/alerts/{alert_id}/validate", response_model=Alert)
def validate_alert(alert_id: int, request: ActorAction):
    with db_connection() as db:
        row = db.execute("SELECT status FROM alertas WHERE id=?", (alert_id,)).fetchone()
        if row is None:
            raise HTTPException(404, "Foco no encontrado")
        if row["status"] not in ("PENDIENTE", "UNIDAD_DESPACHADA"):
            raise HTTPException(409, "El foco ya fue validado o descartado")
        db.execute("UPDATE alertas SET status='VALIDADO', validated_by=?, validated_at=? WHERE id=?",
                   (request.actor.strip(), _now(), alert_id))
        result = db.execute("SELECT * FROM alertas WHERE id=?", (alert_id,)).fetchone()
        return Alert(**dict(result))


@router.patch("/api/alerts/{alert_id}/discard", response_model=Alert)
def discard_alert(alert_id: int, request: ActorAction):
    with db_connection() as db:
        row = db.execute("SELECT status FROM alertas WHERE id=?", (alert_id,)).fetchone()
        if row is None:
            raise HTTPException(404, "Foco no encontrado")
        if row["status"] != "PENDIENTE":
            raise HTTPException(409, "Solo se pueden descartar focos pendientes sin despacho")
        db.execute("UPDATE alertas SET status='FALSA_ALARMA', discarded_by=?, discarded_at=? WHERE id=?",
                   (request.actor.strip(), _now(), alert_id))
        result = db.execute("SELECT * FROM alertas WHERE id=?", (alert_id,)).fetchone()
        return Alert(**dict(result))


@router.get("/api/sectors")
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


@router.post("/api/evacuations/safe", response_model=SafeCheckin, status_code=201)
def check_in_safe(request: SafeCheckinCreate):
    with db_connection() as db:
        now = _now()
        cur = db.execute("INSERT INTO reportes_a_salvo (alias,sector,status,reported_at) VALUES (?,?,'A_SALVO',?)",
                         (request.alias.strip(), request.sector.strip(), now))
        return SafeCheckin(**dict(db.execute("SELECT * FROM reportes_a_salvo WHERE id=?", (cur.lastrowid,)).fetchone()))


@router.get("/api/evacuations/safe", response_model=list[SafeCheckin])
def list_checkins(x_pyroguard_role: str = Header(default="vecino")):
    if x_pyroguard_role.lower() not in ("municipal", "bombero"):
        raise HTTPException(403, "Solo vista de rol municipal o bombero (modo de prueba)")
    with db_connection() as db:
        return [SafeCheckin(**dict(row)) for row in db.execute("SELECT * FROM reportes_a_salvo ORDER BY id DESC").fetchall()]


def _require_hydrant_role(role):
    if role.lower() not in ("municipal", "bombero"):
        raise HTTPException(403, "La capa de grifos requiere rol municipal o bombero (modo de prueba)")


@router.get("/api/hydrants", response_model=list[Hydrant])
def list_hydrants(x_pyroguard_role: str = Header(default="vecino")):
    _require_hydrant_role(x_pyroguard_role)
    with db_connection() as db:
        return [Hydrant(**dict(row)) for row in db.execute("SELECT * FROM grifos_demo ORDER BY id DESC").fetchall()]


@router.post("/api/hydrants", response_model=Hydrant, status_code=201)
def create_hydrant(request: HydrantCreate, x_pyroguard_role: str = Header(default="vecino")):
    _require_hydrant_role(x_pyroguard_role)
    with db_connection() as db:
        cursor = db.execute("INSERT INTO grifos_demo (name, latitude, longitude, status, demo, created_at) VALUES (?,?,?,?,1,?)",
                            (request.name.strip(), request.latitude, request.longitude, request.status, _now()))
        return Hydrant(**dict(db.execute("SELECT * FROM grifos_demo WHERE id=?", (cursor.lastrowid,)).fetchone()))
