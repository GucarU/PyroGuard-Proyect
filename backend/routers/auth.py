"""Registro ciudadano, acceso, consulta y cierre de sesión."""
import os
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from ..auth import (
    SESSION_COOKIE,
    EmailAlreadyRegistered,
    ReservedAdminEmail,
    create_user,
    current_user,
    revoke_session,
    start_session,
    verify_credentials,
)
from ..database import db_connection
from ..schemas import AuthUser, CitizenRegistration, LoginCredentials


router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


def _cookie_options(request: Request) -> dict:
    force_secure = os.environ.get("PYROGUARD_COOKIE_SECURE", "").lower() in {"1", "true"}
    return {"secure": force_secure or request.url.scheme == "https", "httponly": True, "samesite": "lax"}


@router.post("/register", response_model=AuthUser, status_code=201)
def register(account: CitizenRegistration, request: Request, response: Response):
    try:
        with db_connection() as db:
            user = create_user(db, account, "CIUDADANO")
            token, lifetime = start_session(db, user, request.cookies.get(SESSION_COOKIE))
    except EmailAlreadyRegistered as error:
        raise HTTPException(409, "Ya hay una cuenta registrada con este correo.") from error
    except ReservedAdminEmail as error:
        raise HTTPException(409, "Ese correo está reservado. Usa un correo ciudadano.") from error
    response.set_cookie(SESSION_COOKIE, token, max_age=lifetime, **_cookie_options(request))
    return user


@router.post("/login", response_model=AuthUser)
def login(credentials: LoginCredentials, request: Request, response: Response):
    with db_connection() as db:
        user = verify_credentials(db, credentials.email, credentials.password.get_secret_value())
        if user is None:
            raise HTTPException(401, "Correo o contraseña incorrectos.")
        token, lifetime = start_session(db, user, request.cookies.get(SESSION_COOKIE))
    response.set_cookie(SESSION_COOKIE, token, max_age=lifetime, **_cookie_options(request))
    return user


@router.get("/me", response_model=AuthUser)
def me(user: Annotated[AuthUser, Depends(current_user)]):
    return user


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        with db_connection() as db:
            revoke_session(db, token)
    response.delete_cookie(SESSION_COOKIE, **_cookie_options(request))
