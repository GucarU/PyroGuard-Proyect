# PyroGuard — frontend Hito 2 (versión actualizada)

**Base utilizada:** el ZIP «PyroGuard-Proyect-main (2)(2).zip» proporcionado por el equipo.

## Arranque en Windows / Visual Studio Code

En la **carpeta principal** del proyecto abre DOS terminales de PowerShell.

**Terminal 1: API y BD del equipo**
```powershell
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --reload
```
Comprueba http://127.0.0.1:8000/docs

**Terminal 2: React**
```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```
Abre http://localhost:5173/ (o la URL que muestre Vite).

> PowerShell puede bloquear `npm.ps1`: usa `npm.cmd` sin cambiar políticas.

## Qué hace cada botón nuevo

- **Crear alerta ficticia para practicar**: añade un foco de demostración solo en memoria. Funciona incluso si la API está apagada.
- **Validar foco** (HU-05): confirma la decisión y pinta el marcador rojo **solo en el navegador**. El estado real sigue igual en la BD.
- **Filtrar mapa por cerro/sector** (HU-06): filtra las alertas y centra el mapa si hay coordenadas; funciona con datos existentes y con alertas ficticias.
- **Descartar falsa alarma** (HU-08): esconde el foco del mapa, conservándolo en el listado con etiqueta **DEMO LOCAL**; **no elimina/modifica el incidente real**.
- **Estoy a salvo** (HU-10): enseña el flujo visual de confirmación; **no envía un aviso a las autoridades**.
- **Grifos** (HU-14): selector de rol *simulado* y tres marcadores **ficticios** identificados como DEMO. No es autorización real y **no sirve para ubicar grifos**.
- **Reiniciar demo**: limpia las anotaciones y ejemplos locales, no altera datos del backend.

El botón original **Simular detección de humo** sigue usando la API real. El panel de sensores, reportes, albergues y solicitud de agua (HU-16) permanece conectado a los módulos originales del equipo.

## Qué sigue necesitando backend

| HU | Para pasar del prototipo a funcionalidad real |
|---|---|
| HU-05 | Identidad/permisos de Oficial y endpoint para validar foco; persistir VALIDADO |
| HU-06 | Catálogo real de cerros y endpoint de filtro; en React ya hay filtro local y zoom |
| HU-08 | Endpoint para clasificar falsa alarma y conservar auditoría |
| HU-10 | Autenticación personal y endpoint para registrar evacuación segura |
| HU-14 | Catálogo *oficial* de grifos y permisos verificados en servidor |

**No marques HU-05, HU-08, HU-10 y HU-14 como DONE end-to-end** solamente por la demo local.

## Pruebas

Backend original:
```powershell
# Desde la carpeta principal
python -m pytest -q
```

Pruebas puras del frontend que no requieren npm:
```powershell
# Desde frontend
node --test src/lib/maxi.test.js
```

Pruebas de componentes React del taller:
```powershell
# Desde frontend; con dependencias instaladas
npm.cmd test
```
`npm.cmd install` instala Vitest, jsdom y React Testing Library según package.json. Si no se puede acceder al registro npm, estas pruebas de React no pueden ejecutarse hasta solucionar la conexión.

**Evidencia real del Hito 2**: toma capturas de Taiga para cada sprint, terminal de pruebas y pantalla funcionando. Documenta por separado demo local y funcionalidades efectivamente persistidas por el backend. No se han inventado capturas, resultados ni commits.

## Archivos modificados

Se conservaron todos los archivos de `backend/`, `database/`, `tests/` y los módulos de los compañeros. Solo se adaptaron estos archivos que ya existían dentro de `frontend/`:
- `src/App.jsx` — integración de controles y avisos de demo
- `src/components/AlertMap.jsx` — estilos de foco, filtro/zoom y puntos demo
- `src/styles.css` — estilos para nuevas interfaces
- `package.json` — script de pruebas y dependencias de desarrollo

Se añadieron `src/components/Maxi*.jsx`, `src/lib/maxi.js`, pruebas, configuración Vitest y documentación. El `package-lock.json` existente se conserva y **npm.cmd install** lo actualizará al resolver las nuevas dependencias.

## Limitaciones de la verificación en el entorno de preparación

- `python -m pytest -q`: **24 pruebas PASS**.
- `node --test src/lib/maxi.test.js`: **12 pruebas PASS**.
- No se pudo descargar npm desde aquí (falló la resolución DNS de `registry.npmjs.org`), por lo que **no se han ejecutado** las seis pruebas React ni se ha compilado Vite en este entorno. Ejecútalas en tu PC antes de entregar.
