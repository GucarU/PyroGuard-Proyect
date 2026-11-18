"""Fixtures compartidas: cada prueba trabaja con su propia base temporal."""
from contextlib import ExitStack
from io import BytesIO
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image


@pytest.fixture
def image_bytes():
    def encode(format="PNG"):
        with BytesIO() as output:
            Image.new("RGB", (8, 6), (210, 85, 37)).save(output, format=format)
            return output.getvalue()

    return encode


@pytest.fixture
def new_client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Aísla persistencia, uploads y configuración de pruebas de la demo real."""
    monkeypatch.setenv("PYROGUARD_DB", str(tmp_path / "pyroguard-test.db"))
    monkeypatch.setenv("PYROGUARD_UPLOAD_DIR", str(tmp_path / "uploads"))
    monkeypatch.setenv("WIND_ALERT_THRESHOLD_KMH", "40")
    monkeypatch.setenv("PYROGUARD_ENV", "dev")
    monkeypatch.delenv("PYROGUARD_COOKIE_SECURE", raising=False)
    monkeypatch.delenv("PYROGUARD_SESSION_TTL_SECONDS", raising=False)
    from backend.main import app

    with ExitStack() as stack:
        yield lambda **options: stack.enter_context(TestClient(app, **options))


@pytest.fixture
def anonymous_client(new_client) -> TestClient:
    return new_client()


@pytest.fixture
def login_admin(new_client, monkeypatch):
    from backend.create_admin import main

    def login(profile="operador"):
        email = f"{profile}@example.com"
        password = "Prueba operativa 123"
        with monkeypatch.context() as config:
            config.setenv("PYROGUARD_ADMIN_EMAIL", email)
            config.setenv("PYROGUARD_ADMIN_PASSWORD", password)
            config.setenv("PYROGUARD_ADMIN_NAME", "Personal PyroGuard")
            config.setenv("PYROGUARD_ADMIN_PROFILE", profile)
            main()
        client = new_client()
        response = client.post("/api/auth/login", json={"email": email, "password": password})
        assert response.status_code == 200
        return client

    return login


@pytest.fixture
def client(login_admin) -> TestClient:
    return login_admin()


@pytest.fixture
def citizen_client(new_client) -> TestClient:
    client = new_client()
    response = client.post("/api/auth/register", json={
        "name": "Vecina de prueba", "email": "vecina@example.com", "password": "Vecina de prueba 123",
    })
    assert response.status_code == 201
    return client
