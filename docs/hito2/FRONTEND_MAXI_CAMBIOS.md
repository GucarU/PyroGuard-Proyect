# Hito 2 — Frontend y pruebas de Maximiliano

Se mantuvieron los módulos existentes de HU-01, HU-02, HU-03, HU-04, HU-12, HU-13, HU-15 y HU-16. Se adaptó el backend **solo para habilitar los flujos reales de la demo** necesarios en tus cinco HU y se mantuvo compatibilidad con las pruebas existentes.

| Sprint | Historia | Qué se puede demostrar ahora | Límite pendiente |
|---|---|---|---|
| 1 | HU-05 Validación de foco | Confirmación, PATCH `/api/alerts/{id}/validate`, actor/fecha en SQLite, marcador rojo | Autenticación y rol de Oficial real |
| 2 | HU-06 Filtrar cerro/sector | Selector dinámico, filtrado del panel y mapa, enfoque del mapa, GET `/api/alerts?sector=` y `/api/sectors` | Catálogo completo/verificado de cerros si el profesor lo exige |
| 2 | HU-08 Falsa alarma | Confirmación, PATCH `/api/alerts/{id}/discard`, auditoría, exclusión del mapa, historial intacto | Autorización basada en identidad real |
| 3 | HU-10 Estoy a salvo | Formulario y confirmación, POST `/api/evacuations/safe`, vista de registros para rol de práctica | Autenticación de vecinos, verificación de identidad y servicios operacionales |
| 3 | HU-14 Grifos | Formulario, GET/POST `/api/hydrants`, capa en mapa y control por cabecera de rol de prueba | Inventario oficial de grifos, permisos verificados en servidor |

## Organización del frontend

- `frontend/src/App.jsx`: navegación por pestañas, alertas, filtros, conexión y avisos.
- `frontend/src/components/MaxiIncidentActions.jsx`: HU-05 y HU-08 con confirmación y estado ocupado.
- `frontend/src/components/MaxiSectorFilter.jsx`: HU-06.
- `frontend/src/components/MaxiSafeCheckin.jsx`: HU-10.
- `frontend/src/components/MaxiHydrants.jsx`: HU-14.
- `frontend/src/components/AlertMap.jsx`: mapa con estados y marcadores filtrados.
- `frontend/src/lib/api.js`: manejo centralizado de red y errores.
- `frontend/src/components/MaxiFrontend.test.jsx`: seis pruebas propuestas para Vitest.
- `tests/test_hito2_mx.py`: diez pruebas automatizadas de API.

## Compatibilidad y pruebas de esta preparación

- `python -m pytest -q`: 34/34 PASS (24 originales + 10 nuevas).
- `node --test frontend/src/lib/maxi.test.js`: 12/12 PASS.
- Sintaxis de 17 archivos JS/JSX revisada con el parser de TypeScript: sin errores sintácticos detectados.
- **No se pudieron ejecutar Vitest ni `vite build`** en este entorno: el registro de npm no resolvió (EAI_AGAIN). Debes correr ambos comandos en tu PC antes de registrar PASS en las pruebas React o la compilación.

## Precaución sobre evidencias

No se añadieron capturas de Taiga ni se inventó un historial de commits. Las acciones sí persisten en la base SQLite de práctica, pero **no son notificaciones reales a emergencias**. Este software NO debe usarse para coordinar evacuaciones reales.
