@echo off
setlocal
cd /d "%~dp0"

echo Checking repository...
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERROR: Run this file inside your my-study-hub Git repository.
  pause
  exit /b 1
)

git add src/App.tsx .gitattributes package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml GITHUB_BUILD_FIX_2.0.1.md

git diff --cached --quiet
if not errorlevel 1 (
  echo Nothing new to commit. The fix may already be applied.
  pause
  exit /b 0
)

git commit -m "Fix TypeScript select state types"
if errorlevel 1 (
  echo Commit failed.
  pause
  exit /b 1
)

git push
if errorlevel 1 (
  echo Push failed. Review the Git output above.
  pause
  exit /b 1
)

echo.
echo Fix pushed. GitHub Actions should start a new build automatically.
pause
