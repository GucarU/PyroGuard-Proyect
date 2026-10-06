"""Fixtures compartidas: cada prueba trabaja con su propia base temporal."""

from pathlib import Path
import sqlite3
import tempfile

import pytest
from fastapi.testclient import TestClient

# main.py inicializa SQLite al importarse. En el backend actual todavía no se
# respeta PYROGUARD_DB, así que desviamos SOLO esa conexión de arranque a un
# directorio temporal antes de importar el módulo. Así ni la recolección de
# pruebas puede crear o abrir src/backend/pyroguard.db.
_startup_dir = tempfile.TemporaryDirectory(prefix="pyroguard-tests-import-")
_demo_db = Path(__file__).resolve().parents[1] / "src" / "backend" / "pyroguard.db"
_original_connect = sqlite3.connect


def _safe_startup_connect(database, *args, **kwargs):
    if Path(database).resolve() == _demo_db.resolve():
        database = Path(_startup_dir.name) / "startup-only.db"
    return _original_connect(database, *args, **kwargs)


sqlite3.connect = _safe_startup_connect
try:
    from src.backend import main
finally:
    sqlite3.connect = _original_connect


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """Aísla la persistencia de pruebas de la base usada por la demo."""
    database = tmp_path / "pyroguard-test.db"
    monkeypatch.setenv("PYROGUARD_DB", str(database))
    # Compatibilidad con el backend actual; José migrará la conexión a
    # PYROGUARD_DB y esta variable de entorno seguirá apuntando al mismo archivo.
    monkeypatch.setattr(main, "DB_PATH", database)
    main.init_db()
    return TestClient(main.app)
