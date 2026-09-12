@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo My Study Hub - Push UI v2.1.0
echo ========================================
echo.

if not exist ".git" (
  echo ERROR: Run this file from your existing Git repository folder.
  pause
  exit /b 1
)

git add .
if errorlevel 1 goto :fail

git commit -m "Redesign UI and switch interface to English v2.1.0"
if errorlevel 1 (
  echo No new commit was created. Continuing with push...
)

git push origin main
if errorlevel 1 goto :fail

echo.
echo SUCCESS: v2.1.0 pushed to GitHub.
echo GitHub Actions should start the Windows build automatically.
pause
exit /b 0

:fail
echo.
echo FAILED. Review the Git output above.
pause
exit /b 1
