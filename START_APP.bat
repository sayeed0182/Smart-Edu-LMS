@echo off
title SMART-EDU Launcher

echo [1/4] Killing stuck processes on port 3000 and 5001...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5001 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [2/4] Checking react-scripts...
if not exist "%~dp0node_modules\.bin\react-scripts.cmd" (
    echo react-scripts missing! Installing now...
    cd /d "%~dp0"
    npm install react-scripts@5.0.1 --legacy-peer-deps
)

echo [3/4] Starting Backend on port 5001...
start "SMART-EDU Backend" cmd /k "cd /d "%~dp0Server" && npm run dev"

timeout /t 4 /nobreak >nul

echo [4/4] Starting Frontend on port 3000...
start "SMART-EDU Frontend" cmd /k "cd /d "%~dp0" && npm start"

echo.
echo Both servers starting! Open http://localhost:3000
pause
