"""Endpoints de HU-15: cupos de albergues."""
from fastapi import APIRouter, HTTPException

from ..schemas import Shelter, ShelterOccupancyUpdate, ShelterStatusUpdate
from ..services import shelter_service

router = APIRouter(prefix="/api/shelters", tags=["Albergues"])


@router.get("", response_model=list[Shelter])
def list_shelters():
    return shelter_service.list_shelters()


@router.patch("/{shelter_id}/occupancy", response_model=Shelter)
def change_occupancy(shelter_id: int, request: ShelterOccupancyUpdate):
    try:
        return shelter_service.change_occupancy(shelter_id, request.delta)
    except shelter_service.ShelterNotFoundError:
        raise HTTPException(status_code=404, detail="Albergue no encontrado.")
    except shelter_service.ShelterCapacityError:
        raise HTTPException(
            status_code=422,
            detail="La ocupación no puede ser negativa ni superar la capacidad del albergue.",
        )


@router.patch("/{shelter_id}/status", response_model=Shelter)
def change_status(shelter_id: int, request: ShelterStatusUpdate):
    try:
        return shelter_service.change_status(shelter_id, request.status)
    except shelter_service.ShelterNotFoundError:
        raise HTTPException(status_code=404, detail="Albergue no encontrado.")
