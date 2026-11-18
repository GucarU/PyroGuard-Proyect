"""Modelos Pydantic: contratos de entrada y salida de la API."""
from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, StringConstraints, field_validator


OperationalProfile = Literal["operador", "bombero", "municipal"]


class LoginCredentials(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: SecretStr = Field(min_length=1, max_length=128)


class CitizenRegistration(LoginCredentials):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=80)]
    password: SecretStr = Field(min_length=12, max_length=128)


class AdminRegistration(CitizenRegistration):
    profile: OperationalProfile


class AuthUser(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: Literal["ADMIN", "CIUDADANO"]
    profile: OperationalProfile | None


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
    status: Literal["PENDIENTE", "UNIDAD_DESPACHADA", "VALIDADO", "FALSA_ALARMA"]
    message: str
    detected_at: str
    dispatched_at: str | None = None
    dispatched_unit: str | None = None
    validated_by: str | None = None
    validated_at: str | None = None
    discarded_by: str | None = None
    discarded_at: str | None = None


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
ReviewStatus = Literal["EN_REVISION", "VALIDADO", "DESCARTADO"]


class NeighborhoodReport(BaseModel):
    id: int
    photo_path: str | None
    original_filename: str | None
    latitude: float
    longitude: float
    description: str
    status: Literal["PENDIENTE"] | ReviewStatus
    created_at: str
    location_label: str = ""

    @field_validator("photo_path", "original_filename", mode="before")
    @classmethod
    def empty_photo_field(cls, value):
        return value or None


class CitizenNeighborhoodReport(NeighborhoodReport):
    reviewed_at: str | None


class NeighborhoodReportReview(CitizenNeighborhoodReport):
    alert_id: int | None
    reviewed_by: str | None


class ReportStatusUpdate(BaseModel):
    status: ReviewStatus


class ReportAlertLink(BaseModel):
    alert_id: int = Field(gt=0)


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


# Operaciones del panel y pruebas Hito 2
class SafeCheckinCreate(BaseModel):
    alias: str = Field(min_length=2, max_length=80)
    sector: str = Field(min_length=2, max_length=120)

class SafeCheckin(BaseModel):
    id: int
    alias: str
    sector: str
    status: Literal["A_SALVO"]
    reported_at: str

class HydrantCreate(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    status: Literal["DISPONIBLE", "SIN_AGUA", "EN_REVISION"] = "EN_REVISION"

class Hydrant(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    status: Literal["DISPONIBLE", "SIN_AGUA", "EN_REVISION"]
    demo: bool
    created_at: str
