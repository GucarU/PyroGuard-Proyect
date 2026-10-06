@echo off
cd /d "%~dp0"
python -m pip install -r requirements.txt
python -m uvicorn src.backend.main:app --reload
pause
