"""Reglas de negocio de HU-12: reporte vecinal con foto y coordenadas GPS."""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from PIL import Image

from ..database import db_connection
from ..repositories import alert_repository, report_repository
from ..schemas import CitizenNeighborhoodReport, NeighborhoodReport, NeighborhoodReportReview, ReviewStatus
from .alert_service import AlertNotFoundError

PHOTO_FORMATS = {".jpg": "JPEG", ".jpeg": "JPEG", ".png": "PNG", ".webp": "WEBP"}
MAX_PHOTO_BYTES = 5 * 1024 * 1024
MAX_PHOTO_PIXELS = 32_000_000
DEFAULT_UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"


class InvalidReportPhotoError(Exception):
    """La fotografía no cumple las reglas mínimas de la HU-12."""


class ReportNotFoundError(Exception):
    pass


class ReportConflictError(Exception):
    pass


def get_upload_dir() -> Path:
    path = Path(os.environ.get("PYROGUARD_UPLOAD_DIR") or DEFAULT_UPLOAD_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


def validate_photo(photo: bytes, filename: str) -> str:
    extension = Path(filename).suffix.lower()
    if extension not in PHOTO_FORMATS:
        raise InvalidReportPhotoError("La fotografía debe ser JPG, PNG o WEBP.")
    if not photo:
        raise InvalidReportPhotoError("La fotografía está vacía.")
    if len(photo) > MAX_PHOTO_BYTES:
        raise InvalidReportPhotoError("La fotografía supera el máximo de 5 MB.")
    try:
        with Image.open(BytesIO(photo), formats=[PHOTO_FORMATS[extension]]) as image:
            if image.width * image.height > MAX_PHOTO_PIXELS:
                raise InvalidReportPhotoError("La fotografía es demasiado grande. Usa una de menor resolución.")
            image.verify()
        with Image.open(BytesIO(photo), formats=[PHOTO_FORMATS[extension]]) as image:
            image.load()
    except Image.DecompressionBombError as exc:
        raise InvalidReportPhotoError("La fotografía es demasiado grande. Usa una de menor resolución.") from exc
    except (OSError, SyntaxError, ValueError) as exc:
        raise InvalidReportPhotoError("No pudimos abrir la fotografía. Elige una imagen JPG, PNG o WEBP válida.") from exc
    return extension


def create_report(
    *,
    citizen_id: int,
    photo_bytes: bytes | None,
    original_filename: str,
    latitude: float,
    longitude: float,
    description: str,
    location_label: str,
    submission_id: str | None,
) -> NeighborhoodReport:
    extension = validate_photo(photo_bytes, original_filename) if photo_bytes is not None else None
    destination = None
    try:
        with db_connection() as conn:
            if submission_id is not None:
                conn.execute("BEGIN IMMEDIATE")
                existing = report_repository.get_submission(conn, citizen_id, submission_id)
                if existing is not None:
                    return NeighborhoodReport(**dict(existing))

            # Las bases anteriores mantienen las columnas de foto NOT NULL.
            photo_path = ""
            if extension is not None:
                stored_name = f"{uuid.uuid4().hex}{extension}"
                destination = get_upload_dir() / stored_name
                destination.write_bytes(photo_bytes)
                photo_path = f"/uploads/{stored_name}"

            row = report_repository.insert_report(
                conn,
                citizen_id=citizen_id,
                photo_path=photo_path,
                original_filename=original_filename,
                latitude=latitude,
                longitude=longitude,
                description=description.strip(),
                created_at=datetime.now(timezone.utc).isoformat(),
                location_label=location_label.strip(),
                submission_id=submission_id,
            )
    except Exception:
        if destination is not None:
            destination.unlink(missing_ok=True)
        raise
    return NeighborhoodReport(**dict(row))


def list_reports() -> list[NeighborhoodReportReview]:
    with db_connection() as conn:
        return [NeighborhoodReportReview(**dict(row)) for row in report_repository.list_reports(conn)]


def list_citizen_reports(citizen_id: int) -> list[CitizenNeighborhoodReport]:
    with db_connection() as conn:
        return [
            CitizenNeighborhoodReport(**{
                **dict(row),
                "photo_path": f"/api/reports/neighborhood/mine/{row['id']}/photo" if row["photo_path"] else None,
            })
            for row in report_repository.list_citizen_reports(conn, citizen_id)
        ]


def get_citizen_photo(report_id: int, citizen_id: int) -> str:
    with db_connection() as conn:
        report = report_repository.get_report(conn, report_id)
    if report is None or report["citizen_id"] != citizen_id or not report["photo_path"]:
        raise ReportNotFoundError
    return Path(report["photo_path"]).name


def update_status(report_id: int, status: ReviewStatus, reviewer: str) -> NeighborhoodReportReview:
    with db_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        report = report_repository.get_report(conn, report_id)
        if report is None:
            raise ReportNotFoundError
        if report["status"] != status:
            if report["status"] not in {"PENDIENTE", "EN_REVISION"}:
                raise ReportConflictError("El reporte ya tiene una decisión final.")
            report_repository.set_status(conn, report_id, status, reviewer, datetime.now(timezone.utc).isoformat())
            report = report_repository.get_report(conn, report_id)
        return NeighborhoodReportReview(**dict(report))


def link_alert(report_id: int, alert_id: int) -> NeighborhoodReportReview:
    with db_connection() as conn:
        conn.execute("BEGIN IMMEDIATE")
        report = report_repository.get_report(conn, report_id)
        if report is None:
            raise ReportNotFoundError
        if report["status"] != "VALIDADO":
            raise ReportConflictError("Valida el reporte antes de vincularlo a una alerta.")
        if report["alert_id"] == alert_id:
            return NeighborhoodReportReview(**dict(report))
        if report["alert_id"] is not None:
            raise ReportConflictError("El reporte ya está vinculado a otra alerta.")
        if alert_repository.get_alert(conn, alert_id) is None:
            raise AlertNotFoundError(alert_id)
        report_repository.set_alert(conn, report_id, alert_id)
        return NeighborhoodReportReview(**dict(report_repository.get_report(conn, report_id)))
