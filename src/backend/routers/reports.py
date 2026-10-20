"""Endpoints de HU-12: reporte vecinal rápido con foto y GPS."""
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from ..schemas import NeighborhoodReport
from ..services import report_service

router = APIRouter(prefix="/api/reports/neighborhood", tags=["Reportes vecinales"])


@router.post("", response_model=NeighborhoodReport, status_code=status.HTTP_201_CREATED)
async def create_report(
    photo: UploadFile = File(...),
    latitude: float = Form(..., ge=-90, le=90),
    longitude: float = Form(..., ge=-180, le=180),
    description: str = Form(default="", max_length=500),
):
    try:
        return report_service.create_report(
            photo_bytes=await photo.read(),
            original_filename=photo.filename or "foto.jpg",
            latitude=latitude,
            longitude=longitude,
            description=description,
        )
    except report_service.InvalidReportPhotoError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("", response_model=list[NeighborhoodReport])
def list_reports():
    return report_service.list_reports()
