@echo off
cd /d %~dp0
where node >nul 2>nul || (echo Node.js is not installed. & pause & exit /b 1)
where cargo >nul 2>nul || (echo Rust is not installed. Install rustup first. & pause & exit /b 1)
if not exist node_modules call npm install
call npm run tauri build
pause
