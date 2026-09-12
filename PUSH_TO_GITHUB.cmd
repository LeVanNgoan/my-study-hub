@echo off
setlocal
cd /d "%~dp0"

echo ===============================================
echo   MY STUDY HUB - PUSH TO GITHUB
 echo ===============================================
echo.
set /p REPO_URL=Paste GitHub repository URL (https://github.com/USER/REPO.git): 
if "%REPO_URL%"=="" (
  echo Repository URL is required.
  pause
  exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed or not available in PATH.
  echo Install Git for Windows first, then run this file again.
  pause
  exit /b 1
)

if not exist .git (
  git init || goto :error
)

git add . || goto :error
git commit -m "My Study Hub - local first app" 2>nul

git branch -M main || goto :error

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  git remote add origin "%REPO_URL%" || goto :error
) else (
  git remote set-url origin "%REPO_URL%" || goto :error
)

echo.
echo Pushing to GitHub...
git push -u origin main || goto :error

echo.
echo SUCCESS.
echo Open GitHub ^> Actions ^> Build Windows EXE.
echo If the workflow did not start automatically, click Run workflow.
pause
exit /b 0

:error
echo.
echo Push failed. Review the Git output above.
pause
exit /b 1
