@echo off
title TTU Dashboard Launcher
cd /d "%~dp0"

echo ==========================================
echo   Starting TTU Dashboard Server and App
echo ==========================================

start "TTU Backend Server" cmd /k "cd /d %~dp0server && npm.cmd run dev"
timeout /t 2 /nobreak >nul
start "TTU Frontend Vite" cmd /k "cd /d %~dp0 && npm.cmd run dev"

echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5173
echo Both servers launched!
