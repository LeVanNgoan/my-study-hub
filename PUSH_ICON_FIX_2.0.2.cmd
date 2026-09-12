@echo off
setlocal
cd /d "%~dp0"

echo =========================================
echo My Study Hub - Push icon build fix 2.0.2
echo =========================================
echo.

if not exist ".git" (
  echo ERROR: Run this inside your Git repository folder.
  pause
  exit /b 1
)

if not exist "src-tauri\icons\icon.ico" (
  echo ERROR: src-tauri\icons\icon.ico is missing.
  pause
  exit /b 1
)

git add .
if errorlevel 1 goto :fail

git commit -m "Fix Tauri Windows icon build v2.0.2"
if errorlevel 1 (
  echo No new commit created. Continuing to push current branch...
)

git push origin main
if errorlevel 1 goto :fail

echo.
echo SUCCESS.
echo GitHub Actions should start automatically.
pause
exit /b 0

:fail
echo.
echo FAILED. Review the Git output above.
pause
exit /b 1
