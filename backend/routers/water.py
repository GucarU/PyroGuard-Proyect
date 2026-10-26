"""Endpoints para solicitudes de agua en terreno (HU-16)."""
from fastapi import APIRouter, status

from ..schemas import WaterRequest, WaterRequestCreate
from ..services import water_service

router = APIRouter(prefix="/api/water-requests", tags=["Solicitudes de agua"])


@router.post("", response_model=WaterRequest, status_code=status.HTTP_201_CREATED)
def create_water_request(request: WaterRequestCreate):
    return water_service.create_request(request)


@router.get("", response_model=list[WaterRequest])
def list_water_requests():
    return water_service.list_requests()
