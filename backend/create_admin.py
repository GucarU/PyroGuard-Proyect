"""Gestiona la cuenta administrativa única desde la consola del servidor."""
import argparse
import os
from getpass import getpass

from pydantic import ValidationError

from .auth import PASSWORD_HASHER, create_user
from .database import ADMIN_EMAIL, db_connection, get_db_path
from .schemas import AdminRegistration


def _accounts(db):
    rows = db.execute(
        "SELECT id, email, role, profile FROM auth_users WHERE role = 'ADMIN' OR lower(email) = ?",
        (ADMIN_EMAIL,),
    ).fetchall()
    admin = next((row for row in rows if row["email"] == ADMIN_EMAIL and row["role"] == "ADMIN"), None)
    return admin, [row for row in rows if row is not admin]


def _show_conflicts(conflicts):
    for row in conflicts:
        print(f"Conflicto: ID {row['id']} · {row['email']} · {row['role']}.")


def _existing_message(admin):
    return f"La cuenta {ADMIN_EMAIL} ya existe con perfil {admin['profile']}."


def _read_account():
    password = os.environ.get("PYROGUARD_ADMIN_PASSWORD")
    if password is None:
        password = getpass("Contraseña administrativa (12 a 128 caracteres): ")
        if password != getpass("Repite la contraseña: "):
            raise SystemExit("Las contraseñas no coinciden.")
    try:
        return AdminRegistration(
            name=os.environ.get("PYROGUARD_ADMIN_NAME", "Administración PyroGuard"),
            email=ADMIN_EMAIL,
            password=password,
            profile=os.environ.get("PYROGUARD_ADMIN_PROFILE", "bombero"),
        )
    except ValidationError as error:
        fields = ", ".join(str(item["loc"][0]) for item in error.errors())
        raise SystemExit(f"Revisa los campos de la cuenta administrativa ({fields}).") from None


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    actions = parser.add_mutually_exclusive_group()
    actions.add_argument("--check", action="store_true", help="Consulta la cuenta y los conflictos de roles.")
    actions.add_argument("--reset-password", action="store_true", help="Cambia la contraseña y revoca sus sesiones.")
    actions.add_argument("--demote-conflicting-admin", type=int, metavar="ID",
                         help="Cambia un administrador anterior a ciudadano y revoca sus sesiones.")
    args = parser.parse_args(argv)
    print(f"Base SQLite: {get_db_path().resolve()}")

    with db_connection() as db:
        if args.demote_conflicting_admin is not None:
            db.execute("BEGIN IMMEDIATE")
            _, conflicts = _accounts(db)
            legacy = next((row for row in conflicts if row["id"] == args.demote_conflicting_admin), None)
            if legacy is None or legacy["role"] != "ADMIN" or legacy["email"].lower() == ADMIN_EMAIL:
                raise SystemExit("El ID debe corresponder a un administrador anterior con otro correo.")
            db.execute("UPDATE auth_users SET role = 'CIUDADANO', profile = NULL WHERE id = ?", (legacy["id"],))
            db.execute("DELETE FROM auth_sessions WHERE user_id = ?", (legacy["id"],))
            print(f"La cuenta #{legacy['id']} ahora tiene rol CIUDADANO.")
            return
        admin, conflicts = _accounts(db)

    _show_conflicts(conflicts)
    if args.check:
        print(_existing_message(admin) if admin else f"Por crear: {ADMIN_EMAIL}.")
        return
    if os.environ.get("PYROGUARD_ADMIN_EMAIL", ADMIN_EMAIL).strip().lower() != ADMIN_EMAIL:
        raise SystemExit(f"PYROGUARD_ADMIN_EMAIL solo puede ser {ADMIN_EMAIL}.")
    if admin and not args.reset_password:
        print(_existing_message(admin))
        return
    if args.reset_password and not admin:
        raise SystemExit("Crea la cuenta administrativa antes de cambiar su contraseña.")
    if conflicts and not admin:
        raise SystemExit("Resuelve los conflictos que muestra --check antes de crear la cuenta.")

    account = _read_account()
    with db_connection() as db:
        db.execute("BEGIN IMMEDIATE")
        current, conflicts = _accounts(db)
        if args.reset_password:
            if current is None or current["id"] != admin["id"]:
                raise SystemExit("La cuenta cambió. Ejecuta --check y vuelve a intentarlo.")
            hashed = PASSWORD_HASHER.hash(account.password.get_secret_value())
            db.execute("UPDATE auth_users SET password_hash = ? WHERE id = ?", (hashed, current["id"]))
            db.execute("DELETE FROM auth_sessions WHERE user_id = ?", (current["id"],))
            print(f"Contraseña actualizada para {ADMIN_EMAIL}. Sus sesiones se cerraron.")
        elif current:
            print(_existing_message(current))
        elif conflicts:
            _show_conflicts(conflicts)
            raise SystemExit("Resuelve los conflictos antes de crear la cuenta.")
        else:
            create_user(db, account, "ADMIN", account.profile)
            print(f"Cuenta {ADMIN_EMAIL} creada con perfil {account.profile}.")


if __name__ == "__main__":
    main()
