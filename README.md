# PyroGuard

Sistema de alerta temprana y coordinación logística para incendios forestales en Valparaíso y Viña del Mar.

Este código conserva **HU-01** (alerta automática por humo) y agrega el desarrollo asignado a **José Marabolí**: **HU-02, HU-03, HU-04, HU-12 y HU-15**.

## Equipo

- Iván Mandiola
- Maximiliano Ávila
- José Luis Marabolí

## Tecnologías

- API: Python + FastAPI
- Persistencia: SQLite
- Panel web: React + Vite
- Mapa: Leaflet / React Leaflet
- Gráfico de temperatura: Recharts
- Pruebas: pytest + FastAPI TestClient

## Arquitectura backend

La rama refactorizada organiza el backend por capas:

```text
routers -> services -> repositories -> SQLite
```

## Ejecutar en Windows

Desde la raíz del repositorio:

```powershell
python -m pip install -r requirements.txt
python -m pytest -q
python -m uvicorn src.backend.main:app --reload
```

En otra ventana de PowerShell:

```powershell
cd src\frontend
npm install
npm run dev
```

Abrir:

- Panel: `http://127.0.0.1:5173`
- Swagger: `http://127.0.0.1:8000/docs`

## Parte de José

La explicación técnica, endpoints, reglas y evidencias sugeridas se encuentran en:

`docs/PARTE_JOSE.md`
