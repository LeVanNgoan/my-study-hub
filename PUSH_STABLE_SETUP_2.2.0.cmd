@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo My Study Hub - Stable Setup 2.2.0
echo ==========================================
echo.

if not exist ".git" (
  echo ERROR: This folder is not your Git repository.
  pause
  exit /b 1
)

git add .
if errorlevel 1 goto :fail

git commit -m "Stable Windows setup v2.2.0"
if errorlevel 1 echo No new commit created. Continuing...

git push origin main
if errorlevel 1 goto :fail

echo.
echo SUCCESS. GitHub Actions will build the install-once setup EXE.
echo Open GitHub - Actions - Build Windows EXE.
pause
exit /b 0

:fail
echo.
echo FAILED. Review the Git output above.
pause
exit /b 1
