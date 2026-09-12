@echo off
cd /d %~dp0
where node >nul 2>nul || (echo Node.js is not installed. & pause & exit /b 1)
if not exist node_modules call npm install
call npm run dev
pause
