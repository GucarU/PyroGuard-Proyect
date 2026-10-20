"""Fixtures compartidas: cada prueba trabaja con su propia base temporal."""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """Aísla la persistencia de pruebas de la base usada por la demo."""
    monkeypatch.setenv("PYROGUARD_DB", str(tmp_path / "pyroguard-test.db"))
    monkeypatch.setenv("PYROGUARD_ENV", "dev")
    from src.backend.main import app

    return TestClient(app)
