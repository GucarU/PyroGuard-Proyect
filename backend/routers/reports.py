"""Endpoints de HU-12: reporte vecinal rápido con foto y GPS."""
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import UUID4

from ..auth import require_admin, require_citizen
from ..schemas import AuthUser, CitizenNeighborhoodReport, NeighborhoodReport, NeighborhoodReportReview, ReportAlertLink, ReportStatusUpdate
from ..services import alert_service, report_service

router = APIRouter(prefix="/api/reports/neighborhood", tags=["Reportes vecinales"])
photos_router = APIRouter(tags=["Reportes vecinales"])
Citizen = Annotated[AuthUser, Depends(require_citizen)]
Admin = Annotated[AuthUser, Depends(require_admin)]


@router.post("", response_model=NeighborhoodReport, status_code=status.HTTP_201_CREATED)
def create_report(
    user: Citizen,
    photo: UploadFile | None = File(default=None),
    latitude: float = Form(..., ge=-90, le=90),
    longitude: float = Form(..., ge=-180, le=180),
    description: str = Form(default="", max_length=500),
    location_label: str = Form(default="", max_length=120),
    submission_id: UUID4 | None = Form(default=None),
):
    try:
        return report_service.create_report(
            citizen_id=user.id,
            photo_bytes=photo.file.read(report_service.MAX_PHOTO_BYTES + 1) if photo else None,
            original_filename=(photo.filename or "foto.jpg") if photo else "",
            latitude=latitude,
            longitude=longitude,
            description=description,
            location_label=location_label,
            submission_id=str(submission_id) if submission_id else None,
        )
    except report_service.InvalidReportPhotoError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("", response_model=list[NeighborhoodReportReview], dependencies=[Depends(require_admin)])
def list_reports():
    return report_service.list_reports()


@router.get("/mine", response_model=list[CitizenNeighborhoodReport])
def list_citizen_reports(user: Citizen):
    return report_service.list_citizen_reports(user.id)


@router.patch("/{report_id}/status", response_model=NeighborhoodReportReview)
def change_report_status(report_id: int, payload: ReportStatusUpdate, user: Admin):
    try:
        return report_service.update_status(report_id, payload.status, user.name)
    except report_service.ReportNotFoundError as exc:
        raise HTTPException(404, "Reporte no encontrado.") from exc
    except report_service.ReportConflictError as exc:
        raise HTTPException(409, str(exc)) from exc


@router.put("/{report_id}/alert", response_model=NeighborhoodReportReview, dependencies=[Depends(require_admin)])
def link_report_alert(report_id: int, payload: ReportAlertLink):
    try:
        return report_service.link_alert(report_id, payload.alert_id)
    except report_service.ReportNotFoundError as exc:
        raise HTTPException(404, "Reporte no encontrado.") from exc
    except alert_service.AlertNotFoundError as exc:
        raise HTTPException(404, "Alerta no encontrada.") from exc
    except report_service.ReportConflictError as exc:
        raise HTTPException(409, str(exc)) from exc


def _photo_response(filename: str):
    valid_name = not any(char in filename for char in ("/", "\\", ":", "\0"))
    if not valid_name or Path(filename).suffix.lower() not in report_service.PHOTO_FORMATS:
        raise HTTPException(404, "Fotografía no encontrada.")
    directory = report_service.get_upload_dir().resolve()
    photo = (directory / filename).resolve()
    if photo.parent != directory or not photo.is_file():
        raise HTTPException(404, "Fotografía no encontrada.")
    return FileResponse(photo, headers={"X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox"})


@router.get("/mine/{report_id}/photo", response_class=FileResponse)
def read_citizen_photo(report_id: int, user: Citizen):
    try:
        filename = report_service.get_citizen_photo(report_id, user.id)
    except report_service.ReportNotFoundError as exc:
        raise HTTPException(404, "Fotografía no encontrada.") from exc
    return _photo_response(filename)


@photos_router.get("/uploads/{filename}", response_class=FileResponse, dependencies=[Depends(require_admin)])
def read_photo(filename: str):
    return _photo_response(filename)
