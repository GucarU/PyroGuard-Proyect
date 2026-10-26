"""Modelos Pydantic: contratos de entrada y salida de la API."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# HU-01
class SensorDetection(BaseModel):
    sensor_id: str = Field(min_length=1, max_length=50)
    sector: str = Field(min_length=1, max_length=120)
    smoke_detected: bool
    smoke_level: int = Field(ge=0, le=100)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


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


# HU-02 / HU-03 / HU-04
class BatteryUpdate(BaseModel):
    battery_level: int = Field(ge=0, le=100)


class WindUpdate(BaseModel):
    wind_speed_kmh: float = Field(ge=0, le=300)


class TemperatureCreate(BaseModel):
    temperature_c: float = Field(ge=-50, le=100)


class SensorStatus(BaseModel):
    sensor_id: str
    sector: str
    battery_level: int
    battery_alert: bool
    wind_speed_kmh: float
    wind_alert: bool
    wind_threshold_kmh: float
    latitude: float
    longitude: float
    updated_at: str


class TemperatureReading(BaseModel):
    id: int
    sensor_id: str
    temperature_c: float
    recorded_at: str


# HU-12
class NeighborhoodReport(BaseModel):
    id: int
    photo_path: str
    original_filename: str
    latitude: float
    longitude: float
    description: str
    status: Literal["PENDIENTE"]
    created_at: str


# HU-15
class ShelterOccupancyUpdate(BaseModel):
    delta: int = Field(ge=-1000, le=1000)


class ShelterStatusUpdate(BaseModel):
    status: Literal["ABIERTO", "CERRADO"]


class Shelter(BaseModel):
    id: int
    name: str
    capacity: int
    occupancy: int
    available_slots: int
    full: bool
    status: Literal["ABIERTO", "CERRADO"]
    latitude: float
    longitude: float
    updated_at: str


class WaterRequestCreate(BaseModel):
    requester: str = Field(min_length=1, max_length=100)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    description: str = Field(default="", max_length=500)


class WaterRequest(BaseModel):
    id: int
    requester: str
    latitude: float
    longitude: float
    description: str
    status: Literal["PENDIENTE", "EN_ATENCION", "RESUELTA"]
    created_at: str
