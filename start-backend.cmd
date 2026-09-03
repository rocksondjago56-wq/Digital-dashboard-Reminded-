@echo off
title TTU Dashboard Backend Server
cd /d "%~dp0server"
echo Starting TTU Dashboard Backend on http://localhost:3001 ...
npm.cmd run dev
pause
