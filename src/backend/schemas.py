"""Modelos Pydantic: forma de los datos que entran y salen de la API."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


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
