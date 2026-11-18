"""Punto de entrada: crea la app, configura CORS, archivos y routers."""
import os

from fastapi import Depends, FastAPI, Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .auth import require_admin
from .database import db_connection  # alias conservado para tests/compatibilidad HU-01
from .routers import alerts, auth, dev, operations, reports, sensors, shelters, system, water

app = FastAPI(
    title="PyroGuard API",
    version="0.2.0",
    description=(
        "API del prototipo PyroGuard con HU-01, 02, 03, 04, 05, 06, 08, 10, 12, 13, 14, 15 y 16. Datos de prueba."
    ),
)

allowed_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
allowed_origins.extend(
    value.strip().rstrip("/")
    for value in os.environ.get("PYROGUARD_ALLOWED_ORIGINS", "").split(",")
    if value.strip() and value.strip() != "*"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def protect_api_requests(request: Request, call_next):
    path = request.url.path
    if not path.startswith(("/api/", "/uploads/")):
        return await call_next(request)
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        origin = request.headers.get("origin")
        same_origin = f"{request.url.scheme}://{request.url.netloc}"
        fetch_site = request.headers.get("sec-fetch-site")
        if (origin and origin != same_origin and origin not in allowed_origins) or (
            not origin and fetch_site in {"same-site", "cross-site"}
        ):
            return JSONResponse({"detail": "El origen de esta solicitud no está permitido."}, status_code=403)
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, error: RequestValidationError):
    if request.url.path not in {"/api/auth/login", "/api/auth/register"}:
        return await request_validation_exception_handler(request, error)
    messages = {
        "email": "Ingresa un correo electrónico válido.",
        "name": "Ingresa un nombre de 2 a 80 caracteres.",
        "password": ("Usa una contraseña de 12 a 128 caracteres." if request.url.path.endswith("/register")
                     else "Ingresa una contraseña de hasta 128 caracteres."),
    }
    field = error.errors()[0]["loc"][-1]
    detail = messages.get(field, "Revisa los campos del formulario de acceso.")
    return JSONResponse({"detail": detail}, status_code=422)


admin_only = [Depends(require_admin)]
app.include_router(system.router)
app.include_router(auth.router)
app.include_router(sensors.router, dependencies=admin_only)
app.include_router(alerts.router, dependencies=admin_only)
app.include_router(reports.router)
app.include_router(reports.photos_router)
app.include_router(shelters.router, dependencies=admin_only)
app.include_router(water.router, dependencies=admin_only)
app.include_router(operations.router)
app.include_router(dev.router, dependencies=admin_only)
