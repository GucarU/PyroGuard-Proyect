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

Las pruebas usan archivos SQLite temporales por prueba y no llaman al endpoint de borrado de datos de desarrollo. Incluyen validaciones 422, persistencia, prioridad, falla de base de datos 500 y respuestas 404/409.

La prioridad del backend es `ALTA` con nivel de humo ≥ 70, `MEDIA` entre 40 y 69 y `BAJA` entre 0 y 39. El despacho de unidad existe en la API actual, pero es una funcionalidad adicional: no cuenta como criterio de aceptación de HU-01 mientras el equipo no acuerde incorporarlo como CA-04.

## 4. Simulador de sensor
Con el backend activo, desde la raíz del repositorio:

```powershell
python src\simulador\sensor_simulador.py --modo humo
python src\simulador\sensor_simulador.py --modo sin-humo
python src\simulador\sensor_simulador.py --modo invalido
python src\simulador\sensor_simulador.py --modo aleatorio --cantidad 5 --intervalo 3
```

El modo inválido envía `smoke_level: 150` para mostrar la respuesta 422. El simulador comunica directamente con la API y no depende del panel.

## 5. Medición de RNF01
Con el backend activo, ejecuta desde la raíz:

```powershell
python scripts\medir_latencia.py
```

El script hace diez detecciones por defecto, espera que cada una aparezca en `GET /api/alerts` e informa promedio y máximo. Añade los resultados observados a `docs/sprint1/rnf01.md`. Los errores de conexión o una muestra que exceda el límite detienen la medición para no registrar un resultado incompleto como exitoso.

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
