# PyroGuard

Sistema de alerta temprana y coordinación logística para incendios forestales en Valparaíso y Viña del Mar. Este incremento implementa HU-01: recibir detecciones de sensores y crear alertas para la central de emergencias.

## Equipo

- Iván Mandiola
- Maximiliano Ávila
- José Luis Marabolí

## Tecnologías del Sprint 1

- API: Python y FastAPI
- Persistencia: SQLite
- Panel web: React y Vite
- Pruebas: pytest y FastAPI TestClient

## Organización

- `src/backend/`: API y persistencia del backend.
- `src/frontend/`: panel web del operador.
- `src/simulador/`: simulador de lecturas de sensor.
- `tests/`: pruebas de aceptación e integración para HU-01.
- `scripts/`: herramientas para medir RNF01.
- `docs/`: documentación y evidencias del Sprint 1.

## Puesta en marcha

Consulta [INSTRUCCIONES_HU01.md](INSTRUCCIONES_HU01.md) para instalar dependencias, iniciar el backend y el panel, ejecutar las pruebas y usar el simulador.

La documentación interactiva de la API está disponible en `http://127.0.0.1:8000/docs` cuando el backend está funcionando.
