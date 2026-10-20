"""Endpoint que recibe las lecturas del sensor (CA-01, CA-02, CA-03)."""
from fastapi import APIRouter, HTTPException, status

from ..schemas import SensorDetection
from ..services import alert_service

router = APIRouter(tags=["Sensores"])


@router.post("/api/sensors/detections", status_code=status.HTTP_201_CREATED)
def receive_sensor_detection(detection: SensorDetection):
    """Recibe una lectura del sensor y crea una alerta solo si se detectó humo."""
    try:
        alert = alert_service.process_detection(detection)
    except alert_service.AlertPersistenceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No fue posible guardar la alerta en la base de datos.",
        ) from exc

    if alert is None:
        return {
            "alert_created": False,
            "message": "Lectura recibida. No se detectó humo; no se creó una alerta.",
            "alert": None,
        }
    return {
        "alert_created": True,
        "message": "Alerta automática creada y disponible para la central de emergencias.",
        "alert": alert,
    }
