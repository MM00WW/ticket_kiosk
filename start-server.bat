@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 24 LTS first.
  goto failed
)
if not exist .env copy .env.example .env >nul
if not exist node_modules (
  call npm ci
  if errorlevel 1 goto failed
)
call npm run db:init
if errorlevel 1 goto failed
if not exist .next\BUILD_ID (
  call npm run build
  if errorlevel 1 goto failed
)
call npm run start
if errorlevel 1 goto failed
exit /b 0

:failed
echo.
echo DeskFlow could not start. See the error above.
echo If the port is already in use, stop the existing server before starting again.
if not "%DESKFLOW_NO_PAUSE%"=="1" pause
exit /b 1
