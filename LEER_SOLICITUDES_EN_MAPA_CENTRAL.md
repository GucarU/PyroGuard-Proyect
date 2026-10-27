# PyroGuard — Solicitudes de terreno en el mapa central (HU-16)

## Qué cambió
- Logística → Solicitud de apoyo o cuadrilla: eliges un punto en el mapa secundario y pulsas «Enviar solicitud».
- La API existente `/api/water-requests` guarda número de solicitud, solicitante, coordenadas, descripción y estado. No se creó un backend paralelo.
- Después de una respuesta exitosa, los datos se muestran inmediatamente en la sección Central y mapa, con marcador 🚒.
- Desde Logística aparece el botón «🚒 Ver la solicitud en el mapa central» que abre Central, centra el mapa en el lugar elegido y abre la ficha de la solicitud.
- Central se sincroniza automáticamente con las solicitudes guardadas cada 7 segundos, incluso si se registran desde otro navegador que utiliza el mismo backend.
- Central incluye un listado de solicitudes con un botón «Ver en el mapa» por cada una. No se filtran por sector, pues una petición logística puede estar en cualquier sector.

## Prueba manual (Windows)
1. Extrae el ZIP en una carpeta nueva, para no mezclar archivos de versiones anteriores.
2. Ejecuta `INICIAR_PYROGUARD.bat` y abre http://localhost:5173 cuando el frontend y backend estén listos.
3. Abre Logística, ve a «Solicitud de apoyo o cuadrilla en terreno».
4. Marca un punto en el mapa secundario, escribe quién solicita y en el detalle describe el apoyo requerido.
5. Pulsa «Enviar solicitud». Verifica que aparezca el número de solicitud y el botón «Ver la solicitud en el mapa central».
6. Pulsa ese botón. Debe abrir la sección «Central y mapa», acercarse al nuevo punto y abrir la ficha del marcador 🚒.
7. También debe aparecer la solicitud en la lista «Apoyo solicitado en el mapa» debajo del mapa.
8. Actualiza la página: la solicitud debe seguir en el mapa porque está guardada en SQLite.

## Verificaciones automatizadas
- Python: `python -m pytest -q` desde la raíz.
- Lógica JS: desde `frontend/`, `node --test src/lib/maxi.test.js src/lib/demoDetections.test.node.js src/lib/waterRequests.test.node.js`.
- Compilación visual/React: `npm.cmd install`, `npm.cmd run build` desde `frontend` en Windows. Si es necesario, ejecutar `npm.cmd test`.

## Alcance real
- Los registros corresponden al endpoint preexistente de **solicitudes de agua (HU-16)**. El formulario permite describir apoyo/cuadrilla, pero **no implementa asignación, notificación ni despacho real de personal**. Es un prototipo académico.
- Los puntos se dibujan con cartografía de OpenStreetMap, que requiere acceso a internet para cargar las imágenes del mapa.
