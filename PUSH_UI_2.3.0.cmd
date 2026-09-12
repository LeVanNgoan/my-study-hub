@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo My Study Hub - Push UI Redesign v2.3.0
echo ========================================
echo.

if not exist ".git" (
  echo ERROR: This folder is not a Git repository.
  pause
  exit /b 1
)

git add .
if errorlevel 1 goto :fail

git commit -m "Redesign UI with React Tailwind v2.3.0"
if errorlevel 1 (
  echo No new commit created. Continuing to push current branch...
)

git push origin main
if errorlevel 1 goto :fail

echo.
echo SUCCESS: UI v2.3.0 pushed.
echo GitHub Actions should build the stable Windows Setup automatically.
pause
exit /b 0

:fail
echo.
echo FAILED. Review the Git output above.
pause
exit /b 1
