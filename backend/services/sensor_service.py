"""Reglas de negocio de HU-02, HU-03 y HU-04."""
from __future__ import annotations

import os
from datetime import datetime, timezone

from ..database import db_connection
from ..repositories import sensor_repository
from ..schemas import SensorStatus, TemperatureReading

BATTERY_ALERT_THRESHOLD = 15
DEFAULT_WIND_ALERT_THRESHOLD_KMH = 40.0


class SensorNotFoundError(Exception):
    """El sensor solicitado no existe."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def wind_threshold_kmh() -> float:
    try:
        return float(os.environ.get("WIND_ALERT_THRESHOLD_KMH", DEFAULT_WIND_ALERT_THRESHOLD_KMH))
    except ValueError:
        return DEFAULT_WIND_ALERT_THRESHOLD_KMH


def _seed_sensors_if_empty(conn) -> None:
    if sensor_repository.count_sensors(conn) > 0:
        return
    now = _now()
    demo = [
        ("PG-VALPO-01", "Camino La Pólvora", 82, 12.0, -33.0757, -71.6136),
        ("PG-VALPO-02", "Playa Ancha", 14, 24.0, -33.0246, -71.6407),
        ("PG-VALPO-03", "Rodelillo", 47, 45.0, -33.0669, -71.5798),
    ]
    for sensor_id, sector, battery, wind, lat, lon in demo:
        sensor_repository.insert_sensor(
            conn,
            sensor_id=sensor_id,
            sector=sector,
            battery_level=battery,
            wind_speed_kmh=wind,
            latitude=lat,
            longitude=lon,
            updated_at=now,
        )
    # Historial de ejemplo para que HU-03 se vea apenas se inicia la demo.
    for value in (21.4, 22.1, 22.8, 23.5, 24.2):
        sensor_repository.insert_temperature(conn, "PG-VALPO-01", value, now)
    for value in (20.0, 20.5, 21.1):
        sensor_repository.insert_temperature(conn, "PG-VALPO-02", value, now)
    for value in (25.0, 26.2, 27.1):
        sensor_repository.insert_temperature(conn, "PG-VALPO-03", value, now)


def _to_status(row) -> SensorStatus:
    threshold = wind_threshold_kmh()
    return SensorStatus(
        sensor_id=row["sensor_id"],
        sector=row["sector"],
        battery_level=row["battery_level"],
        battery_alert=row["battery_level"] < BATTERY_ALERT_THRESHOLD,
        wind_speed_kmh=row["wind_speed_kmh"],
        wind_alert=row["wind_speed_kmh"] >= threshold,
        wind_threshold_kmh=threshold,
        latitude=row["latitude"],
        longitude=row["longitude"],
        updated_at=row["updated_at"],
    )


def list_sensor_statuses() -> list[SensorStatus]:
    with db_connection() as conn:
        _seed_sensors_if_empty(conn)
        return [_to_status(row) for row in sensor_repository.list_sensors(conn)]


def update_battery(sensor_id: str, battery_level: int) -> SensorStatus:
    with db_connection() as conn:
        _seed_sensors_if_empty(conn)
        row = sensor_repository.update_battery(conn, sensor_id, battery_level, _now())
        if row is None:
            raise SensorNotFoundError(sensor_id)
        return _to_status(row)


def update_wind(sensor_id: str, wind_speed_kmh: float) -> SensorStatus:
    with db_connection() as conn:
        _seed_sensors_if_empty(conn)
        row = sensor_repository.update_wind(conn, sensor_id, wind_speed_kmh, _now())
        if row is None:
            raise SensorNotFoundError(sensor_id)
        return _to_status(row)


def add_temperature(sensor_id: str, temperature_c: float) -> TemperatureReading:
    with db_connection() as conn:
        _seed_sensors_if_empty(conn)
        if sensor_repository.get_sensor(conn, sensor_id) is None:
            raise SensorNotFoundError(sensor_id)
        row = sensor_repository.insert_temperature(conn, sensor_id, temperature_c, _now())
        return TemperatureReading(**dict(row))


def temperature_history(sensor_id: str, limit: int = 20) -> list[TemperatureReading]:
    limit = max(1, min(limit, 100))
    with db_connection() as conn:
        _seed_sensors_if_empty(conn)
        if sensor_repository.get_sensor(conn, sensor_id) is None:
            raise SensorNotFoundError(sensor_id)
        rows = sensor_repository.list_temperature_history(conn, sensor_id, limit)
        return [TemperatureReading(**dict(row)) for row in rows]
