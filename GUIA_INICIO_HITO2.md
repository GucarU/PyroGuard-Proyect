# PyroGuard · Hito 2 · Guía de inicio

## Antes de usar

Este proyecto es un **prototipo universitario** para la demo del Hito 2. **No presta servicios de emergencia reales**, no notifica a Bomberos ni tiene catastro certificado de grifos.

La aplicación tiene ahora cuatro pestañas: **Central y mapa**, **Sensores**, **Ciudadanía** y **Logística**. El backend guarda operaciones de prueba en SQLite. El rol seleccionado es **solo para pruebas** y no equivale a autenticación.

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
4. Visita **http://localhost:5173**. La API se comprueba en **http://127.0.0.1:8000/docs**.

**Si PowerShell bloquea `npm`**, usa `npm.cmd`. No vuelvas a ejecutar `cd frontend` si ya estás dentro de esa carpeta.

**Si no sale nada en pantalla:** confirma que las dos ventanas estén abiertas, que npm haya instalado las dependencias (se necesita internet la primera vez) y que los puertos 5173 y 8000 estén libres. Revisa que la pestaña diga **API conectada**. Si aparece error `EAI_AGAIN`, es la red o DNS de npm, no un fallo de React.

## Recorrido recomendado para la demo

| Paso | Pestaña | Acción | Qué debe observarse |
|---|---|---|---|
| 1 | Central | Simular detección | Nueva alerta creada en la base y marcador naranja |
| 2 | Central | Validar foco y confirmar | Estado VALIDADO y marcador rojo, incluso tras actualizar |
| 3 | Central | Simular otra alerta y descartar | Falsa alarma guardada en historial, oculta del mapa |
| 4 | Central | Filtrar sector | Lista y mapa acotados al sector elegido |
| 5 | Ciudadanía | Estoy a salvo | Nuevo registro de prueba en la API |
| 6 | Logística | Elegir rol municipal o bombero | Habilita la gestión de grifos de prueba |
| 7 | Logística | Rellenar ejemplo ficticio, guardar, volver a Central | Grifo de práctica marcado con gota en el mapa cuando el rol está habilitado |
| 8 | Sensores | Cambiar batería, viento y ver temperatura | Pruebas de módulos existentes |
| 9 | Ciudadanía / Logística | Reporte vecinal, albergues, solicitud de agua | Se conservaron las funciones de tus compañeros |

**Importante:** El rol es una **simulación con cabecera HTTP controlable**. Se agregó validación en la API, pero no hay usuarios registrados ni permisos reales. Por tanto, el rol oficial de la HU-05/HU-14 **no está terminado para un entorno real**. Tampoco existe un catastro oficial de grifos; sus coordenadas son ingresadas por el usuario y etiquetadas como ficticias.

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

El `npm.cmd test` requiere instalar las dependencias con `npm.cmd install` primero. Los 6 tests de componentes incluyen renderizado, eventos, estado, condicionales y comunicación con API simulada.

## Evidencias para la rúbrica

En el informe final deberás incorporar capturas reales del tablero Taiga para cada sprint, registros de pruebas ejecutadas en tu computador, enlaces del repositorio y un video demo de 3 minutos. **Estos materiales no pueden reconstruirse artificialmente desde el código.**

En `docs/hito2/FRONTEND_MAXI_CAMBIOS.md` tienes la relación de las cinco HU, archivos y limitaciones.
