from pydantic import BaseModel
from datetime import datetime


class UsuarioCrear(BaseModel):
    nombre: str
    rut: str
    telefono: str | None = None
    rol: str


class UsuarioRespuesta(BaseModel):
    id: int
    nombre: str
    rut: str
    telefono: str | None = None
    rol: str
    fecha_registro: datetime

    class Config:
        from_attributes = True