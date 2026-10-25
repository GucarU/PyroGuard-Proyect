"""Fixtures compartidas: cada prueba trabaja con su propia base temporal."""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """Aísla persistencia, uploads y configuración de pruebas de la demo real."""
    monkeypatch.setenv("PYROGUARD_DB", str(tmp_path / "pyroguard-test.db"))
    monkeypatch.setenv("PYROGUARD_UPLOAD_DIR", str(tmp_path / "uploads"))
    monkeypatch.setenv("WIND_ALERT_THRESHOLD_KMH", "40")
    monkeypatch.setenv("PYROGUARD_ENV", "dev")
    from backend.main import app

    return TestClient(app)
