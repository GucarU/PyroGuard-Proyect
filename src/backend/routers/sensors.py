"""Endpoints de sensores: HU-01, HU-02, HU-03 y HU-04."""
from fastapi import APIRouter, HTTPException, Query, status

from ..schemas import (
    BatteryUpdate,
    SensorDetection,
    SensorStatus,
    TemperatureCreate,
    TemperatureReading,
    WindUpdate,
)
from ..services import alert_service, sensor_service

router = APIRouter(tags=["Sensores"])


@router.post("/api/sensors/detections", status_code=status.HTTP_201_CREATED)
def receive_sensor_detection(detection: SensorDetection):
    """HU-01: recibe una lectura y crea una alerta solo si se detectó humo."""
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


@router.get("/api/sensors/status", response_model=list[SensorStatus])
def list_sensor_statuses():
    """HU-02/HU-04: lista batería, viento y estado visual de cada sensor."""
    return sensor_service.list_sensor_statuses()


@router.patch("/api/sensors/{sensor_id}/battery", response_model=SensorStatus)
def update_battery(sensor_id: str, request: BatteryUpdate):
    """HU-02: actualiza batería; battery_alert es true cuando baja de 15%."""
    try:
        return sensor_service.update_battery(sensor_id, request.battery_level)
    except sensor_service.SensorNotFoundError:
        raise HTTPException(status_code=404, detail="Sensor no encontrado.")


@router.patch("/api/sensors/{sensor_id}/wind", response_model=SensorStatus)
def update_wind(sensor_id: str, request: WindUpdate):
    """HU-04: actualiza viento y calcula si debe mostrarse la advertencia."""
    try:
        return sensor_service.update_wind(sensor_id, request.wind_speed_kmh)
    except sensor_service.SensorNotFoundError:
        raise HTTPException(status_code=404, detail="Sensor no encontrado.")


@router.post(
    "/api/sensors/{sensor_id}/temperature",
    response_model=TemperatureReading,
    status_code=status.HTTP_201_CREATED,
)
def add_temperature(sensor_id: str, request: TemperatureCreate):
    """HU-03: registra una nueva temperatura histórica del sensor."""
    try:
        return sensor_service.add_temperature(sensor_id, request.temperature_c)
    except sensor_service.SensorNotFoundError:
        raise HTTPException(status_code=404, detail="Sensor no encontrado.")


@router.get(
    "/api/sensors/{sensor_id}/temperature-history",
    response_model=list[TemperatureReading],
)
def temperature_history(sensor_id: str, limit: int = Query(default=20, ge=1, le=100)):
    """HU-03: entrega las últimas lecturas para construir el gráfico."""
    try:
        return sensor_service.temperature_history(sensor_id, limit)
    except sensor_service.SensorNotFoundError:
        raise HTTPException(status_code=404, detail="Sensor no encontrado.")
