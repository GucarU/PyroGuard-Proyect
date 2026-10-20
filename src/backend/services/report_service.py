"""Reglas de negocio de HU-12: reporte vecinal con foto y coordenadas GPS."""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from ..database import db_connection
from ..repositories import report_repository
from ..schemas import NeighborhoodReport

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_PHOTO_BYTES = 5 * 1024 * 1024
DEFAULT_UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"


class InvalidReportPhotoError(Exception):
    """La fotografía no cumple las reglas mínimas de la HU-12."""


def get_upload_dir() -> Path:
    path = Path(os.environ.get("PYROGUARD_UPLOAD_DIR") or DEFAULT_UPLOAD_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


def create_report(
    *,
    photo_bytes: bytes,
    original_filename: str,
    latitude: float,
    longitude: float,
    description: str,
) -> NeighborhoodReport:
    extension = Path(original_filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise InvalidReportPhotoError("La fotografía debe ser JPG, PNG o WEBP.")
    if not photo_bytes:
        raise InvalidReportPhotoError("La fotografía está vacía.")
    if len(photo_bytes) > MAX_PHOTO_BYTES:
        raise InvalidReportPhotoError("La fotografía supera el máximo de 5 MB.")

    stored_name = f"{uuid.uuid4().hex}{extension}"
    destination = get_upload_dir() / stored_name
    destination.write_bytes(photo_bytes)

    created_at = datetime.now(timezone.utc).isoformat()
    public_path = f"/uploads/{stored_name}"
    try:
        with db_connection() as conn:
            row = report_repository.insert_report(
                conn,
                photo_path=public_path,
                original_filename=original_filename,
                latitude=latitude,
                longitude=longitude,
                description=description.strip(),
                created_at=created_at,
            )
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    return NeighborhoodReport(**dict(row))


def list_reports() -> list[NeighborhoodReport]:
    with db_connection() as conn:
        return [NeighborhoodReport(**dict(row)) for row in report_repository.list_reports(conn)]
