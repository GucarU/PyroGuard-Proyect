"""Endpoints de consulta y despacho de alertas."""
from fastapi import APIRouter, HTTPException

from ..schemas import Alert, DispatchRequest
from ..services import alert_service

router = APIRouter(prefix="/api/alerts", tags=["Alertas"])


@router.get("", response_model=list[Alert])
def list_alerts():
    return alert_service.list_alerts()


@router.get("/{alert_id}", response_model=Alert)
def get_alert(alert_id: int):
    try:
        return alert_service.get_alert(alert_id)
    except alert_service.AlertNotFoundError:
        raise HTTPException(status_code=404, detail="Alerta no encontrada.")


@router.patch("/{alert_id}/dispatch", response_model=Alert)
def dispatch_unit(alert_id: int, request: DispatchRequest):
    try:
        return alert_service.dispatch_unit(alert_id, request)
    except alert_service.AlertNotFoundError:
        raise HTTPException(status_code=404, detail="Alerta no encontrada.")
    except alert_service.AlertAlreadyDispatchedError:
        raise HTTPException(
            status_code=409, detail="La alerta ya tiene una unidad despachada."
        )
