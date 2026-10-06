# PyroGuard HU-01 - Cómo ejecutar

## 1. Backend
Desde la carpeta raíz del proyecto:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn src.backend.main:app --reload
```

Abrir Swagger:

- http://127.0.0.1:8000/docs

## 2. Frontend
Abrir una segunda terminal:

```powershell
cd src\frontend
npm install
npm run dev
```

Abrir:

- http://localhost:5173

## 3. Pruebas automáticas
Desde la raíz:

```powershell
python -m pytest -q
```

## API REST principal

`POST /api/sensors/detections`

JSON Happy Path:

```json
{
  "sensor_id": "PG-VALPO-01",
  "sector": "Camino La Pólvora",
  "smoke_detected": true,
  "smoke_level": 82,
  "latitude": -33.0757,
  "longitude": -71.6136
}
```

Casos cubiertos:

- `201`: lectura válida; crea alerta si hay humo.
- `422`: campos faltantes, formato inválido o `smoke_level` fuera de 0-100.
- `alert_created: false`: lectura válida sin humo.
- `500`: error de persistencia SQLite.
