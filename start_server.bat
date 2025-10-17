@echo off
echo Starting Live Lecture Captions Backend...
echo.

cd /d "%~dp0"

REM Check if virtual environment exists
if not exist ".venv\Scripts\python.exe" (
    echo Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo Error: Failed to create virtual environment
        echo Make sure Python 3.8+ is installed and in PATH
        pause
        exit /b 1
    )
)

REM Install/update dependencies
echo Installing dependencies...
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
if errorlevel 1 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

REM Start the server
echo.
echo Starting server on http://localhost:8080
echo Press Ctrl+C to stop
echo.
cd backend
..\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload