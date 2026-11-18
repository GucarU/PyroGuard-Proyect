# PyroGuard desde varios dispositivos

Instala PyroGuard en un computador que pueda permanecer encendido. Los celulares y computadores abrirán la misma URL HTTPS. El servidor conservará un único archivo SQLite, con las cuentas, sesiones y reportes, y una carpeta de fotografías. Si ya tienes datos, apunta a las rutas existentes o migra la base y la carpeta de fotografías juntas con PyroGuard detenido.

## Preparar la base y la cuenta

En PowerShell, desde la raíz del proyecto, sustituye las rutas de ejemplo por las del servidor. Usa las mismas rutas cada vez que inicies el backend o ejecutes un comando de cuentas.

```powershell
$env:PYROGUARD_DB = 'C:\PyroGuard-datos\pyroguard.db'
$env:PYROGUARD_UPLOAD_DIR = 'C:\PyroGuard-datos\uploads'
$env:PYROGUARD_COOKIE_SECURE = '1'
$env:PYROGUARD_ENV = 'production'
Remove-Item Env:PYROGUARD_ADMIN_PASSWORD -ErrorAction SilentlyContinue
python -m pip install -r requirements.txt
python -m backend.create_admin --check
```

- Si indica **Por crear** y no hay conflictos, ejecuta `python -m backend.create_admin`. Escribe y confirma tu contraseña en la consola. El correo es `admin.pyroguard@example.com`.
- Si la cuenta ya existe, puedes usar su contraseña actual. Si quieres elegir una nueva, ejecuta `python -m backend.create_admin --reset-password`. Se conservan la cuenta, el perfil y sus registros. Las sesiones anteriores deberán iniciar sesión de nuevo.
- Si `--check` identifica administradores anteriores, revisa cada ID. Puedes convertir deliberadamente una cuenta antigua con otro correo en ciudadana mediante `python -m backend.create_admin --demote-conflicting-admin ID` (sustituye `ID` por su número). Conserva su cuenta y sus datos. Si el correo reservado pertenece a una cuenta ciudadana antigua, coordina con su titular el cambio de correo en la base antes de crear la cuenta administrativa. El comando conserva esos datos y muestra el conflicto.

## Servir por HTTPS

1. Apunta un nombre DNS público que controles a la IP del servidor. Instala Caddy y habilita los puertos TCP 80 y 443 hacia Caddy. Si usas un router con NAT, redirígelos al servidor. Caddy obtiene y renueva el certificado y redirige HTTP a HTTPS. [Requisitos de HTTPS de Caddy](https://caddyserver.com/docs/automatic-https)
2. Compila el frontend y arranca FastAPI en la interfaz local, en la misma consola donde definiste la base y la carpeta de fotos. [Configuración de Uvicorn](https://uvicorn.dev/settings/)

   ```powershell
   Push-Location frontend
   npm.cmd ci
   npm.cmd run build
   Pop-Location
   python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --proxy-headers --forwarded-allow-ips 127.0.0.1
   ```

3. En otra consola, crea un archivo `Caddyfile` con tu dominio y la ruta absoluta a `frontend/dist`. Las rutas de API y fotos pasan por FastAPI para que aplique los permisos. Las rutas de React, incluidas `/admin` y `/ciudadania`, cargan el frontend. [Patrón de aplicación React con API en Caddy](https://caddyserver.com/docs/caddyfile/patterns#single-page-apps)

   ```caddyfile
   pyroguard.example.com {
       encode
       @backend path /api/* /uploads/*
       handle @backend {
           reverse_proxy 127.0.0.1:8000
       }
       handle {
           root * "C:/PyroGuard/frontend/dist"
           try_files {path} /index.html
           file_server
       }
   }
   ```

4. Desde la carpeta del `Caddyfile`, ejecuta `caddy validate --config Caddyfile --adapter caddyfile` y luego `caddy run --config Caddyfile --adapter caddyfile`. Abre la URL HTTPS de tu dominio desde ambos dispositivos.

`INICIAR_PYROGUARD.bat` sigue disponible para desarrollo local en `http://localhost:5173`. En esa consola deja `PYROGUARD_COOKIE_SECURE` sin definir si vas a usar HTTP.

## Comprobar reportes y sesiones

1. En un computador, abre la URL del servidor e inicia sesión como `admin.pyroguard@example.com`. Se abre `/admin`.
2. En un celular o en otro navegador, abre la misma URL y crea una cuenta con **Registro ciudadano**. Envía un reporte con la ubicación y, si quieres, una foto. Anota el número de reporte.
3. El reporte pendiente aparece automáticamente en la bandeja administrativa y en **Central y mapa** como marcador morado. Las vistas abiertas consultan cambios cada cuatro segundos y al volver a la pestaña.
4. En administración, selecciona **Revisar**, **Validar** o **Descartar** y verifica el cambio en **Mis reportes** del celular. Un reporte validado puede vincularse manualmente a una alerta ya registrada.
5. Recarga y vuelve a abrir el navegador con el mismo perfil para comprobar que conserva la sesión hasta su expiración (ocho horas por defecto). Inicia sesión con el mismo correo administrativo en un segundo navegador para probar el acceso simultáneo. Cierra sesión en uno y verifica que el otro conserva su sesión.

Si varias personas usan la misma cuenta administrativa, el historial atribuye sus acciones a esa cuenta compartida.
