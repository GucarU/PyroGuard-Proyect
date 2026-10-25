"""Endpoints de estado del sistema."""
from fastapi import APIRouter

router = APIRouter(tags=["Sistema"])


@router.get("/")
def root():
    return {
        "system": "PyroGuard",
        "user_story": "HU-01",
        "requirement": "RF01",
        "message": "API operativa. Documentación disponible en /docs.",
    }


@router.get("/health")
def health():
    return {"status": "ok"}
