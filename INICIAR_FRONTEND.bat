@echo off
cd /d "%~dp0frontend"
if not exist "node_modules\.bin\vite.cmd" (
  echo [PyroGuard] Instalando dependencias... requiere internet en primer arranque.
  call npm.cmd install
)
if errorlevel 1 (
  echo ERROR: No se pudieron instalar las dependencias. Revisa internet y Node.js.
  pause
  exit /b 1
)
echo [PyroGuard] Abre http://localhost:5173
call npm.cmd run dev
pause
