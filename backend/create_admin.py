"""Crea una cuenta operativa desde la consola del servidor."""
import os
from getpass import getpass

from pydantic import ValidationError

from .auth import EmailAlreadyRegistered, create_user
from .database import db_connection
from .schemas import AdminRegistration


def main() -> None:
    email = os.environ.get("PYROGUARD_ADMIN_EMAIL")
    if not email:
        raise SystemExit("Configura PYROGUARD_ADMIN_EMAIL antes de ejecutar este comando.")
    password = os.environ.get("PYROGUARD_ADMIN_PASSWORD")
    if password is None:
        password = getpass("Contraseña administrativa (12 a 128 caracteres): ")
        if password != getpass("Repite la contraseña: "):
            raise SystemExit("Las contraseñas no coinciden.")
    try:
        account = AdminRegistration(
            name=os.environ.get("PYROGUARD_ADMIN_NAME", "Administración PyroGuard"),
            email=email,
            password=password,
            profile=os.environ.get("PYROGUARD_ADMIN_PROFILE", "operador"),
        )
    except ValidationError as error:
        fields = ", ".join(str(item["loc"][0]) for item in error.errors())
        raise SystemExit(f"Revisa los campos de la cuenta administrativa ({fields}).") from None
    try:
        with db_connection() as db:
            create_user(db, account, "ADMIN", account.profile)
    except EmailAlreadyRegistered:
        raise SystemExit("Ese correo ya está registrado. Las cuentas existentes se conservan.") from None
    print(f"Cuenta administrativa creada con perfil {account.profile}.")


if __name__ == "__main__":
    main()
