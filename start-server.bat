@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 24 LTS first.
  pause
  exit /b 1
)
if not exist .env copy .env.example .env >nul
if not exist node_modules (
  call npm install
  if errorlevel 1 exit /b 1
)
call npm run db:init
if errorlevel 1 exit /b 1
if not exist .next\BUILD_ID (
  call npm run build
  if errorlevel 1 exit /b 1
)
call npm run start
