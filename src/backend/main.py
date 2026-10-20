"""Punto de entrada: crea la app, configura CORS, archivos y routers."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import db_connection  # alias conservado para tests/compatibilidad HU-01
from .routers import alerts, dev, reports, sensors, shelters, system
from .services.report_service import DEFAULT_UPLOAD_DIR

app = FastAPI(
    title="PyroGuard API",
    version="0.2.0",
    description=(
        "API PyroGuard con HU-01 y módulos desarrollados por José Marabolí: "
        "HU-02, HU-03, HU-04, HU-12 y HU-15."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# La demo usa /uploads para mostrar las fotografías de reportes vecinales.
Path(DEFAULT_UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(DEFAULT_UPLOAD_DIR)), name="uploads")

app.include_router(system.router)
app.include_router(sensors.router)
app.include_router(alerts.router)
app.include_router(reports.router)
app.include_router(shelters.router)
app.include_router(dev.router)
