@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ===============================================
echo   MY STUDY HUB - PUSH TO GITHUB (FIXED)
echo ===============================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git is not installed or not available in PATH.
  echo Install Git for Windows, then run this file again.
  pause
  exit /b 1
)

set /p REPO_URL=Paste GitHub repository URL (https://github.com/USER/REPO.git): 
if "%REPO_URL%"=="" (
  echo [ERROR] Repository URL is required.
  pause
  exit /b 1
)

if not exist .git (
  echo.
  echo [1/7] Initializing Git repository...
  git init || goto :error
) else (
  echo.
  echo [1/7] Existing Git repository detected.
)

rem -------------------------------------------------
rem Ensure Git identity exists. Configure LOCAL repo only.
rem -------------------------------------------------
for /f "delims=" %%i in ('git config --get user.name 2^>nul') do set GIT_NAME=%%i
if not defined GIT_NAME (
  echo.
  echo Git user.name is not configured for this repository.
  set /p GIT_NAME=Enter your GitHub display name ^(example: LeVanNgoan^): 
  if not defined GIT_NAME (
    echo [ERROR] Git name is required.
    pause
    exit /b 1
  )
  git config user.name "%GIT_NAME%" || goto :error
)

for /f "delims=" %%i in ('git config --get user.email 2^>nul') do set GIT_EMAIL=%%i
if not defined GIT_EMAIL (
  echo.
  echo Git user.email is not configured for this repository.
  echo You can use your GitHub email or GitHub noreply email.
  set /p GIT_EMAIL=Enter your Git email: 
  if not defined GIT_EMAIL (
    echo [ERROR] Git email is required.
    pause
    exit /b 1
  )
  git config user.email "%GIT_EMAIL%" || goto :error
)

echo.
echo [2/7] Staging files...
git add . || goto :error

echo.
echo [3/7] Creating commit if needed...
git rev-parse --verify HEAD >nul 2>nul
if errorlevel 1 (
  git commit -m "Initial commit - My Study Hub local first app" || goto :error
) else (
  git diff --cached --quiet
  if errorlevel 1 (
    git commit -m "Update My Study Hub" || goto :error
  ) else (
    echo No new staged changes. Existing commit will be pushed.
  )
)

echo.
echo [4/7] Renaming branch to main...
git branch -M main || goto :error

echo.
echo [5/7] Configuring remote...
git remote get-url origin >nul 2>nul
if errorlevel 1 (
  git remote add origin "%REPO_URL%" || goto :error
) else (
  git remote set-url origin "%REPO_URL%" || goto :error
)

echo.
echo [6/7] Verifying repository state...
git log -1 --oneline || goto :error
git remote -v

echo.
echo [7/7] Pushing main to GitHub...
git push -u origin main || goto :push_error

echo.
echo ===============================================
echo SUCCESS - Source code has been pushed to GitHub.
echo ===============================================
echo.
echo Next:
echo   GitHub ^> your repository ^> Actions ^> Build Windows EXE
pause
exit /b 0

:push_error
echo.
echo [ERROR] GitHub push failed.
echo If a browser login appears, complete GitHub authentication and run this file again.
echo If GitHub says the remote contains commits you do not have, run:
echo   git pull --rebase origin main
 echo then run this script again.
pause
exit /b 1

:error
echo.
echo [ERROR] A Git command failed. The actual Git error is shown above.
pause
exit /b 1
