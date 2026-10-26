@echo off
cd /d "%~dp0"
python -m pip install -r requirements.txt
if errorlevel 1 (
  echo ERROR: Fallo al instalar los paquetes de Python.
  pause
  exit /b 1
)
python -m uvicorn backend.main:app --reload
pause
