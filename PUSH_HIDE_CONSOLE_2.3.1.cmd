@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo My Study Hub - Hide Console Fix v2.3.1
echo ============================================
echo.

if not exist ".git" (
  echo ERROR: This folder is not your Git repository.
  pause
  exit /b 1
)

git add .
if errorlevel 1 goto :fail

git commit -m "Hide Windows console in release build v2.3.1"
if errorlevel 1 (
  echo No new commit created. Continuing...
)

git push origin main
if errorlevel 1 goto :fail

echo.
echo SUCCESS: Changes pushed.
echo GitHub Actions should build the new Setup automatically.
pause
exit /b 0

:fail
echo.
echo FAILED. Review the Git output above.
pause
exit /b 1
