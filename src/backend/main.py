"""Punto de entrada: crea la app, configura CORS y registra los routers."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import alerts, dev, sensors, system

app = FastAPI(
    title="PyroGuard API",
    version="0.1.0",
    description="API del Sprint 1 para HU-01: alerta automática por detección de humo.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router)
app.include_router(sensors.router)
app.include_router(alerts.router)
app.include_router(dev.router)
