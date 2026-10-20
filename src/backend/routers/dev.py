"""Endpoints solo para desarrollo. Activos únicamente con PYROGUARD_ENV=dev."""
import os

from fastapi import APIRouter, Depends, HTTPException

from ..services import alert_service


def require_dev_env() -> None:
    # Se lee en cada petición para que las pruebas puedan activarlo con monkeypatch.
    if os.environ.get("PYROGUARD_ENV") != "dev":
        raise HTTPException(status_code=404, detail="Not Found")


router = APIRouter(tags=["Desarrollo"], dependencies=[Depends(require_dev_env)])


@router.delete("/api/dev/alerts")
def clear_alerts():
    """Limpia alertas para repetir pruebas durante el Sprint 1."""
    alert_service.clear_alerts()
    return {"message": "Alertas eliminadas."}
