@echo off
setlocal
set DIR=%~dp0
set NODE_ENV=production
set NODE_BIN=%DIR%node.exe
set NODE_URL=https://nodejs.org/dist/v20.13.1/node-v20.13.1-win-x64.zip
set NODE_ARCHIVE=node-archive.win.zip
set NODE_DIR=node-v20.13.1-win-x64
set NODE_BIN_PATH=%NODE_DIR%\node.exe

REM Download Node.js if needed (do this first while we might still have admin privileges)
if not exist "%NODE_BIN%" (
  echo Downloading Node.js...
  powershell -Command "Invoke-WebRequest -Uri %NODE_URL% -OutFile %NODE_ARCHIVE%"
  powershell -Command "Expand-Archive -Path %NODE_ARCHIVE% -DestinationPath ."
  copy %NODE_BIN_PATH% %NODE_BIN%
  rmdir /s /q %NODE_DIR%
  del %NODE_ARCHIVE%
)

REM Check if running with administrator privileges
net session >nul 2>&1
if %errorLevel% == 0 (
  echo Administrator privileges detected. Re-launching with reduced privileges for PostgreSQL compatibility...
  powershell -Command "Start-Process -FilePath '%NODE_BIN%' -ArgumentList '%DIR%build\index.js %*' -Verb runAsUser"
  exit /b
)

"%NODE_BIN%" "%DIR%build\index.js" %*
