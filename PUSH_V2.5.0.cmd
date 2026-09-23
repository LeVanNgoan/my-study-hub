@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo My Study Hub v2.5.0 - Push Release
echo ========================================
echo.

if not exist ".git" (
  echo ERROR: Run this file inside your Git repository.
  pause
  exit /b 1
)

git add .
if errorlevel 1 goto :fail

git commit -m "My Study Hub v2.5.0 - folder import tags explore IT UI"
if errorlevel 1 (
  echo No new commit created. Continuing...
)

git push origin main
if errorlevel 1 goto :fail

echo.
echo SUCCESS: v2.5.0 pushed. GitHub Actions should build the Setup automatically.
pause
exit /b 0

:fail
echo.
echo FAILED. Review the Git output above.
pause
exit /b 1
