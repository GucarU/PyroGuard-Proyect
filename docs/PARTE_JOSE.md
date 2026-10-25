# Desarrollo asignado a José Marabolí

Este incremento se integró sobre la rama refactorizada por capas del backend. Se mantuvo HU-01 y se añadieron las historias de usuario asignadas a José.

## HU-02 — Revisión de batería de sensores

- Persistencia: tabla `sensores_estado`.
- API: `GET /api/sensors/status` y `PATCH /api/sensors/{sensor_id}/battery`.
- Regla: `battery_alert = true` cuando la batería es **menor al 15 %**.
- Interfaz: tarjetas de sensores; la tarjeta/indicador se marca en rojo al quedar bajo el umbral.
- Demo rápida: botón **Batería 14%** y luego **Batería 80%**.

## HU-03 — Gráfico rápido de temperatura

- Persistencia: tabla `sensor_temperaturas`.
- API: `POST /api/sensors/{sensor_id}/temperature` y `GET /api/sensors/{sensor_id}/temperature-history`.
- Interfaz: modal de historial con gráfico `recharts` y formulario para agregar una lectura.
- Demo rápida: abrir **Ver temperatura**, ingresar una nueva temperatura y comprobar que aparece en el gráfico.

## HU-04 — Alerta por vientos fuertes

- La velocidad se almacena en `sensores_estado.wind_speed_kmh`.
- API: `PATCH /api/sensors/{sensor_id}/wind`.
- Regla: el umbral se configura con `WIND_ALERT_THRESHOLD_KMH`; si no se define se usa **40 km/h**.
- Interfaz: si el sensor supera el umbral, aparece una advertencia y un ícono 💨 en la ubicación del sensor en el mapa.
- Demo rápida: botón **Simular viento** (55 km/h).

> El documento de división del trabajo no entrega un umbral numérico, por eso se dejó configurable. Si el profesor/equipo define otro valor, se cambia sin modificar la lógica.

## HU-12 — Reporte vecinal rápido

- Persistencia: tabla `reportes_vecinales`.
- API: `POST /api/reports/neighborhood` (multipart) y `GET /api/reports/neighborhood`.
- La interfaz permite usar cámara/selector de archivo, obtener GPS del navegador y enviar foto + coordenadas + descripción.
- Formatos permitidos: JPG, JPEG, PNG y WEBP; máximo 5 MB.
- Las fotos se guardan en `backend/uploads/` y el registro queda con estado `PENDIENTE`.

## HU-15 — Actualizar cupos en albergues

- Persistencia: tabla `albergues`.
- API: `GET /api/shelters` y `PATCH /api/shelters/{id}/occupancy`.
- La interfaz tiene botones `+1` y `-1`.
- La API impide ocupación negativa y también superar la capacidad máxima.
- Al alcanzar la capacidad se muestra **LLENO** y la tarjeta cambia a rojo.

## Arquitectura usada

```text
router -> service -> repository -> SQLite
```

Archivos principales nuevos:

```text
backend/repositories/sensor_repository.py
backend/repositories/report_repository.py
backend/repositories/shelter_repository.py
backend/services/sensor_service.py
backend/services/report_service.py
backend/services/shelter_service.py
backend/routers/reports.py
backend/routers/shelters.py
frontend/src/components/SensorPanel.jsx
frontend/src/components/TemperatureModal.jsx
frontend/src/components/NeighborhoodReport.jsx
frontend/src/components/ShelterPanel.jsx
tests/test_jose_hu.py
```

## Pruebas

Ejecutar desde la raíz del proyecto:

```powershell
python -m pytest -q
```

Resultado obtenido al preparar este incremento: **24 pruebas aprobadas** (HU-01 existente + pruebas de las historias de José).

## Evidencias recomendadas

1. HU-02: sensor normal, clic en `Batería 14%`, captura del estado rojo.
2. HU-03: abrir gráfico, agregar una lectura, captura con el nuevo punto.
3. HU-04: simular 55 km/h, captura de `ALERTA` y del ícono 💨 en el mapa.
4. HU-12: seleccionar foto, obtener GPS, enviar, capturar respuesta y registro desde `/docs` o SQLite.
5. HU-15: sumar/restar personas y capturar un albergue en estado `LLENO`.
