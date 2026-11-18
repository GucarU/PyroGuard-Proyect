# PyroGuard — Hito 2

Prototipo académico de detección temprana, alertas y coordinación logística de incendios forestales, contextualizado en Valparaíso y Viña del Mar.

En Windows, ejecuta `INICIAR_PYROGUARD.bat` y abre `http://localhost:5173` cuando estén listas las dos ventanas. El recorrido por los módulos está en la [guía de inicio](GUIA_INICIO_HITO2.md).

- API Python/FastAPI y base SQLite en `backend/`.
- Frontend React/Vite en `frontend/`.
- Test Python en `tests/`. Pruebas de React junto a componentes en `frontend/src/components/`.
- Simulador y archivos de referencia en `simulador/`, `database/` y `docs/`.

**Alcance:** conserva módulos originales del equipo e incluye avances Hito 2 de HU-05, HU-06, HU-08, HU-10, HU-14 (detalles en [`docs/hito2/FRONTEND_MAXI_CAMBIOS.md`](docs/hito2/FRONTEND_MAXI_CAMBIOS.md)).

## Probar las cuentas

### Administración

En PowerShell, desde la carpeta principal, ejecuta:

```powershell
python -m pip install -r requirements.txt
$env:PYROGUARD_ADMIN_EMAIL = Read-Host 'Correo para tu cuenta administrativa'
$env:PYROGUARD_ADMIN_PROFILE = 'bombero'
python -m backend.create_admin
```

Usa un correo que todavía no esté registrado. La consola te pide escribir y confirmar una contraseña de 12 a 128 caracteres cuando `PYROGUARD_ADMIN_PASSWORD` está sin definir. En automatización puedes proporcionar esa variable como secreto de entorno. La orden crea la cuenta en la base del backend. Si usas una base personalizada, define el mismo `PYROGUARD_DB` al crear la cuenta y al iniciar PyroGuard.

Abre `http://localhost:5173` y elige **Iniciar sesión**. Usa el correo y la contraseña de la cuenta operativa. PyroGuard te lleva a `/admin`. El formulario **Registro ciudadano** crea exclusivamente cuentas de ciudadanía. El perfil `operador` es el predeterminado. Los perfiles `bombero` y `municipal` también pueden gestionar grifos y consultar registros de evacuación. Las validaciones y descartes de alertas quedan asociados al nombre de la cuenta que ejecutó la acción.

En **Reportes ciudadanos** puedes filtrar por estado, abrir la fotografía y ubicar el reporte en el mapa central. **Revisar** cambia el estado de pendiente a en revisión. **Validar** y **Descartar** registran la decisión final. Una vez validado, puedes vincular el reporte a una alerta operacional que ya exista. Varios reportes pueden apuntar a la misma alerta y la vinculación conserva el estado de la alerta. Los reportes anteriores que se guardaron sin cuenta asociada siguen disponibles para el personal.

### Ciudadanía

Usa una ventana privada o cierra la sesión administrativa. En **Registro ciudadano**, ingresa nombre, correo y contraseña. La cuenta abre `/ciudadania`. Pulsa **Reportar posible incendio**. Puedes tomar una foto, elegirla de la galería o continuar sin foto. Se aceptan JPG, PNG y WEBP de hasta 5 MB. Usa tu ubicación o toca el mapa para marcar dónde está el incendio, revisa el resumen y envía. Si el envío se interrumpe, **Reintentar envío** vuelve a usar el mismo identificador del reporte.

En **Mis reportes** puedes consultar tus propios avisos, las fotos y los detalles de revisión. **Seguridad** conserva la función «Estoy a salvo» y **Mi perfil** muestra tus datos y el cierre de sesión. Para probar el GPS en un celular, abre PyroGuard mediante HTTPS. En HTTP por red local, puedes marcar el lugar en el mapa aunque el navegador bloquee el GPS.

El control de **Apariencia** de la cabecera ofrece Claro, Oscuro y Automático. La elección se guarda para esa cuenta en el navegador y puede cambiarse durante un reporte.

Escribe `/admin` en la barra del navegador para comprobar que la sesión ciudadana vuelve a `/ciudadania`.

### Sesiones y pruebas

- La sesión dura ocho horas por defecto. Para probar la caducidad, define `$env:PYROGUARD_SESSION_TTL_SECONDS = '15'` antes de iniciar el backend, inicia sesión y vuelve a enfocar la ventana pasados 15 segundos. Cerrar sesión revoca la sesión en SQLite.
- El frontend usa el mismo origen para `/api` y `/uploads`. En un despliegue con HTTPS, configura `PYROGUARD_COOKIE_SECURE=1` y reenvía ambos caminos al backend con el host y el protocolo públicos. El servidor del frontend debe servir `index.html` al abrir directamente `/admin` o `/ciudadania`.
- El simulador de sensores y el script de latencia solicitan una cuenta operativa. También aceptan `PYROGUARD_ADMIN_EMAIL` y `PYROGUARD_ADMIN_PASSWORD` en el entorno del proceso.
- `COMPROBAR_PYROGUARD.bat` ejecuta las pruebas y la compilación. También puedes usar `python -m pytest -q` desde la raíz y `npm.cmd test` y `npm.cmd run build` desde `frontend`.

Los grifos y sensores son datos del prototipo académico.
