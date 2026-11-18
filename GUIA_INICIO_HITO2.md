# PyroGuard · Hito 2 · Guía de inicio

## Antes de usar

Este proyecto es un **prototipo universitario** para la demo del Hito 2. **No presta servicios de emergencia reales**, no notifica a Bomberos ni tiene catastro certificado de grifos.

El panel operativo tiene cuatro pestañas: **Central y mapa**, **Sensores**, **Logística** y **Reportes ciudadanos**. La ciudadanía envía reportes, consulta su historial y confirma si está a salvo desde su propio portal. [Consulta cómo crear y probar ambas cuentas](README.md#probar-las-cuentas).

## Iniciar en Windows

1. Descomprime el ZIP. Abre VS Code en la carpeta `PyroGuard-Proyect-main` que contiene `backend`, `frontend` y `requirements.txt`.
2. Ejecuta `INICIAR_BACKEND.bat` y deja abierta la ventana. Alternativa, PowerShell desde la raíz:
   ```powershell
   python -m pip install -r requirements.txt
   python -m uvicorn backend.main:app --reload
   ```
3. Ejecuta `INICIAR_FRONTEND.bat` y deja abierta la segunda ventana. Alternativa, desde otra terminal abierta en la raíz:
   ```powershell
   cd frontend
   npm.cmd install
   npm.cmd run dev
   ```
4. Visita **http://localhost:5173** e inicia sesión. La documentación de la API está en **http://127.0.0.1:8000/docs**.

**Si PowerShell bloquea `npm`**, usa `npm.cmd`. No vuelvas a ejecutar `cd frontend` si ya estás dentro de esa carpeta.

**Si no sale nada en pantalla:** confirma que las dos ventanas estén abiertas, que npm haya instalado las dependencias (se necesita internet la primera vez) y que los puertos 5173 y 8000 estén libres. Revisa que la pestaña diga **API conectada**. Si aparece error `EAI_AGAIN`, es la red o DNS de npm, no un fallo de React.

## Recorrido recomendado para la demo

| Paso | Pestaña | Acción | Qué debe observarse |
|---|---|---|---|
| 1 | Central | Simular detección | Nueva alerta creada en la base y marcador naranja |
| 2 | Central | Validar foco y confirmar | Estado VALIDADO y marcador rojo, incluso tras actualizar |
| 3 | Central | Simular otra alerta y descartar | Falsa alarma guardada en historial, oculta del mapa |
| 4 | Central | Filtrar sector | Lista y mapa acotados al sector elegido |
| 5 | Portal ciudadano | Estoy a salvo | Nuevo registro de prueba en la API |
| 6 | Logística | Entrar con una cuenta `municipal` o `bombero` | Gestión de grifos de prueba habilitada |
| 7 | Logística | Rellenar ejemplo ficticio, guardar, volver a Central | Grifo de práctica marcado con gota en el mapa |
| 8 | Sensores | Cambiar batería, viento y ver temperatura | Pruebas de módulos existentes |
| 9 | Portal ciudadano / Reportes ciudadanos | Enviar un reporte, abrirlo en el mapa y marcarlo como en revisión | Los dos usuarios ven el estado actualizado |
| 10 | Reportes ciudadanos | Validar el reporte y vincularlo a una alerta existente | El reporte muestra el vínculo; la alerta conserva su estado |

Los grifos de práctica se etiquetan como ficticios.

## Pruebas

Desde la carpeta principal:

```powershell
python -m pytest -q
```

Desde `frontend`:

```powershell
node --test src/lib/maxi.test.js
npm.cmd test
npm.cmd run build
```

El `npm.cmd test` requiere instalar las dependencias con `npm.cmd install` primero. Las pruebas de React comprueban los componentes y las redirecciones de ambas cuentas.

## Evidencias para la rúbrica

En el informe final deberás incorporar capturas reales del tablero Taiga para cada sprint, registros de pruebas ejecutadas en tu computador, enlaces del repositorio y un video demo de 3 minutos. **Estos materiales no pueden reconstruirse artificialmente desde el código.**

En `docs/hito2/FRONTEND_MAXI_CAMBIOS.md` tienes la relación de las cinco HU, archivos y limitaciones.
