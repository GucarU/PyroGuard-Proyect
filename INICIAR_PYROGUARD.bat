@echo off
setlocal
cd /d "%~dp0"
title PyroGuard - inicio rapido

echo ============================================================
echo   PYROGUARD - INICIO COMPLETO ^(Frontend + Backend^)
echo ============================================================
echo.
where python >nul 2>&1
if errorlevel 1 (
  echo ERROR: No se encontro Python. Instala Python y marca Add to PATH.
  pause
  exit /b 1
)
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: No se encontro Node.js. Instala Node.js LTS.
  pause
  exit /b 1
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm.cmd no esta disponible. Reinstala Node.js LTS.
  pause
  exit /b 1
)
echo Abriendo el backend y el frontend en ventanas separadas...
echo.
start "" "%~dp0INICIAR_BACKEND.bat"
start "" "%~dp0INICIAR_FRONTEND.bat"
echo Cuando ambas ventanas indiquen que estan listas, abre:
echo     http://localhost:5173
echo.
echo Backend y documentacion: http://127.0.0.1:8000/docs
echo.
echo No cierres las ventanas del frontend y del backend mientras pruebas.
echo Si alguna muestra un error, envia una captura de ESA ventana.
echo.
pause
