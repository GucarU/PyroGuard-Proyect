# PyroGuard — corrección del filtro por sector

## Problema corregido
Al cambiar el sector en el mapa central, la aplicación podía mantener seleccionado el último marcador de solicitud de apoyo. React-Leaflet priorizaba dicho marcador, centrando el mapa en la cuadrilla en lugar del cerro.

## Comportamiento tras la corrección
- El selector HU-06 filtra las alertas por sector y centra el mapa en ese sector cuando existen coordenadas.
- Cambiar el sector cancela el foco sobre una solicitud anterior y cierra su ficha emergente.
- Los marcadores de solicitudes 🚒 siguen visibles en el mapa central, pero no alteran el zoom ni la navegación del filtro.
- Solo el botón «Ver en el mapa» / «Ver la solicitud en el mapa central» centra expresamente la vista en una solicitud.
- La generación aleatoria de alertas, los sensores, grifos, albergues y la sección logística permanecen disponibles.

## Archivos afectados
- `frontend/src/App.jsx`: separa el evento de cambio de sector del enfoque sobre solicitudes.
- `frontend/src/components/AlertMap.jsx`: resuelve el enfoque con prioridad para el sector activo y cierra popups anteriores.
- `frontend/src/lib/mapFocus.js`: regla independiente del enfoque del mapa.
- `frontend/src/lib/mapFocus.test.js`: cinco pruebas de regresión.

## Probar en Windows
1. Cierra las ventanas anteriores de Vite y FastAPI para evitar ejecutar una versión vieja.
2. Descomprime este ZIP en una carpeta nueva y abre `PyroGuard-Proyect-main`.
3. Ejecuta `INICIAR_PYROGUARD.bat` o inicia backend y frontend desde VS Code.
4. En `Central y mapa`, selecciona un sector en HU-06. La vista debe seguir en el sector y no abrir la ficha de solicitud.
5. Cambia a otro sector y comprueba que no vuelve a la solicitud.
6. Pulsa «Ver en el mapa» de una solicitud. Recién ahí debe enfocarse la solicitud 🚒.

## Pruebas ejecutadas
- Python: `python -m pytest -q` → 37/37 aprobadas en el entorno de prueba.
- JavaScript de lógica: `node --test frontend/src/lib/*.test.js` → 5 pruebas nuevas de enfoque aprobadas, además de las existentes.
- La compilación completa de Vite/React debe verificarse con `npm.cmd run build` en tu PC (sin acceso a dependencias en este entorno).

Este proyecto es un prototipo académico; las solicitudes, alertas y grifos de demostración no corresponden a servicios reales de emergencia.
