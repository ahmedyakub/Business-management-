@echo off
REM Laba jeer guji faylkan si aad u rakibto oo u socodsiiso app-ka.
REM Double-click this file to set up and start the app.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js lama helin. Ka rakib: https://nodejs.org  ^(nooca LTS^)
  echo  Node.js was not found. Install the LTS version from https://nodejs.org
  echo.
  pause
  exit /b 1
)
node scripts\setup.mjs
pause
