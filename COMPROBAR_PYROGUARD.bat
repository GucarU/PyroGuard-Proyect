@echo off
setlocal
cd /d "%~dp0"
title PyroGuard - comprobacion

echo ================== PRUEBAS DEL BACKEND ==================
python -m pytest -q
if errorlevel 1 (
 echo ERROR: Pruebas Python fallidas. Revisa la salida anterior.
 pause
 exit /b 1
)
echo.
echo ================= PRUEBAS DE JAVASCRIPT =================
node --test frontend/src/lib/maxi.test.js frontend/src/lib/demoDetections.test.node.js
if errorlevel 1 (
 echo ERROR: Pruebas JavaScript fallidas.
 pause
 exit /b 1
)
echo.
echo ================== COMPILACION DE REACT =================
cd frontend
if not exist "node_modules\.bin\vite.cmd" (
 echo Instalando dependencias. Se requiere Internet.
 call npm.cmd install --no-audit --no-fund
 if errorlevel 1 (
  echo ERROR: npm no pudo instalar las dependencias. Revisa tu conexion.
  pause
  exit /b 1
 )
)
call npm.cmd run build
if errorlevel 1 (
 echo ERROR: Compilacion React fallida.
 pause
 exit /b 1
)
echo.
echo =================== PRUEBAS DE REACT ==================
call npm.cmd test
if errorlevel 1 (
 echo ERROR: Pruebas Vitest fallidas.
 pause
 exit /b 1
)
echo.
echo TODO APROBADO. Puedes tomar captura de esta ventana.
pause
