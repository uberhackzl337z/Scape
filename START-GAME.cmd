@echo off
setlocal
set "STORAGE=sqlite"
cd /d "%~dp0"
if not exist "dist\server.js" (
  echo Build the game first with pnpm run build. See README.md.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:3000 after the server is ready.
node dist\server.js
pause
