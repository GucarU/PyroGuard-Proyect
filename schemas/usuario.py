from pydantic import BaseModel, EmailStr
from datetime import datetime

class UsuarioCrear(BaseModel):
    nombre: str
    correo: EmailStr
    password: str


class UsuarioRespuesta(BaseModel):
    id: int
    nombre: str
    correo: EmailStr
    rol: str
    activo: bool
    fecha_creacion: datetime

    class Config:
        from_attributes = True
