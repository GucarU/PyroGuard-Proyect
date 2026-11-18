"""Cuentas, sesiones persistentes y dependencias de autorización."""
import hashlib
import os
import secrets
import sqlite3
import time
from typing import Annotated, Literal

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, HTTPException, Request

from .database import db_connection
from .schemas import AuthUser, CitizenRegistration, OperationalProfile


SESSION_COOKIE = "pyroguard_session"
PASSWORD_HASHER = PasswordHasher()
DUMMY_PASSWORD_HASH = PASSWORD_HASHER.hash(secrets.token_urlsafe(32))


class EmailAlreadyRegistered(Exception):
    pass


def create_user(
    db: sqlite3.Connection,
    account: CitizenRegistration,
    role: Literal["ADMIN", "CIUDADANO"],
    profile: OperationalProfile | None = None,
) -> AuthUser:
    email = account.email.lower()
    password_hash = PASSWORD_HASHER.hash(account.password.get_secret_value())
    result = db.execute(
        """INSERT INTO auth_users (name, email, password_hash, role, profile)
           VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING
           RETURNING id, name, email, role, profile""",
        (account.name, email, password_hash, role, profile),
    ).fetchone()
    if result is None:
        raise EmailAlreadyRegistered
    return AuthUser.model_validate(dict(result))


def verify_credentials(db: sqlite3.Connection, email: str, password: str) -> AuthUser | None:
    row = db.execute("SELECT * FROM auth_users WHERE email = ?", (email.lower(),)).fetchone()
    stored_hash = row["password_hash"] if row is not None else DUMMY_PASSWORD_HASH
    try:
        PASSWORD_HASHER.verify(stored_hash, password)
    except (VerificationError, InvalidHashError):
        return None
    if row is not None:
        if PASSWORD_HASHER.check_needs_rehash(stored_hash):
            db.execute(
                "UPDATE auth_users SET password_hash = ? WHERE id = ? AND password_hash = ?",
                (PASSWORD_HASHER.hash(password), row["id"], stored_hash),
            )
        return AuthUser.model_validate(dict(row))
    return None


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def revoke_session(db: sqlite3.Connection, token: str | None) -> None:
    if token:
        db.execute("DELETE FROM auth_sessions WHERE token_hash = ?", (_token_hash(token),))


def start_session(db: sqlite3.Connection, user: AuthUser, old_token: str | None) -> tuple[str, int]:
    lifetime = int(os.environ.get("PYROGUARD_SESSION_TTL_SECONDS", "28800"))
    if not 1 <= lifetime <= 30 * 86400:
        raise ValueError("PYROGUARD_SESSION_TTL_SECONDS debe estar entre 1 y 2592000.")
    now = int(time.time())
    token = secrets.token_urlsafe(32)
    db.execute("DELETE FROM auth_sessions WHERE expires_at <= ?", (now,))
    revoke_session(db, old_token)
    db.execute(
        "INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
        (_token_hash(token), user.id, now + lifetime),
    )
    return token, lifetime


def current_user(request: Request) -> AuthUser:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(401, "Inicia sesión para continuar.")
    with db_connection() as db:
        row = db.execute(
            """SELECT u.id, u.name, u.email, u.role, u.profile
               FROM auth_sessions AS s JOIN auth_users AS u ON u.id = s.user_id
               WHERE s.token_hash = ? AND s.expires_at > ?""",
            (_token_hash(token), int(time.time())),
        ).fetchone()
    if row is None:
        raise HTTPException(401, "Tu sesión expiró o se cerró. Vuelve a iniciar sesión.")
    return AuthUser.model_validate(dict(row))


def require_admin(user: Annotated[AuthUser, Depends(current_user)]) -> AuthUser:
    if user.role != "ADMIN":
        raise HTTPException(403, "Esta operación requiere una cuenta administrativa.")
    return user


def require_citizen(user: Annotated[AuthUser, Depends(current_user)]) -> AuthUser:
    if user.role != "CIUDADANO":
        raise HTTPException(403, "Esta operación requiere una cuenta ciudadana.")
    return user


def require_field_profile(user: Annotated[AuthUser, Depends(require_admin)]) -> AuthUser:
    if user.profile not in ("bombero", "municipal"):
        raise HTTPException(403, "Esta operación requiere el perfil Bombero o Municipal.")
    return user
