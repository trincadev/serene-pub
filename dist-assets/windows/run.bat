@echo off
REM Serene Pub Launcher - Batch File Version
REM This script downloads Node.js if needed and starts the application

setlocal enabledelayedexpansion

REM Set environment
set NODE_ENV=production

REM Get the directory where this script is located
set DIR=%~dp0
set DIR=%DIR:~0,-1%

REM Node.js configuration - detect architecture
set NODE_BIN=%DIR%\node.exe

REM Detect Windows architecture
if "%PROCESSOR_ARCHITECTURE%"=="ARM64" (
    set NODE_ARCH=arm64
    set NODE_URL=https://nodejs.org/dist/v20.13.1/node-v20.13.1-win-arm64.zip
    set NODE_DIR=%DIR%\node-v20.13.1-win-arm64
) else (
    set NODE_ARCH=x64
    set NODE_URL=https://nodejs.org/dist/v20.13.1/node-v20.13.1-win-x64.zip
    set NODE_DIR=%DIR%\node-v20.13.1-win-x64
)

set NODE_ARCHIVE=%DIR%\node-archive.win.zip
set NODE_BIN_PATH=%NODE_DIR%\node.exe

REM Application paths
set APP_MAIN=%DIR%\build\index.js

REM Load environment variables from .env file if present
set ENV_FILE=%DIR%\.env
if exist "%ENV_FILE%" (
    echo Loading environment variables from .env file...
    for /f "usebackq tokens=1,2 delims==" %%a in ("%ENV_FILE%") do (
        set "line=%%a"
        if not "!line:~0,1!"=="#" (
            if not "%%a"=="" if not "%%b"=="" (
                set "%%a=%%b"
            )
        )
    )
)

echo === Serene Pub Launcher ===
echo Checking Node.js installation...

REM Check if Node.js is already available
if not exist "%NODE_BIN%" (
    echo Node.js not found. Installing...
    call :InstallNodeJs
    if errorlevel 1 goto :error
) else (
    echo Node.js found.
)

REM Verify the main application file exists
if not exist "%APP_MAIN%" (
    echo Error: Application file not found at %APP_MAIN%
    echo Please ensure all application files are present.
    pause
    exit /b 1
)

REM Start the application
call :StartSerenePubl
goto :end

:InstallNodeJs
echo Downloading Node.js v20.13.1 for %NODE_ARCH%...

REM Use PowerShell for download (more reliable than curl/wget alternatives)
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'SilentlyContinue'; try { Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_ARCHIVE%' -UserAgent 'SerenePublauncher/1.0 (Windows)' } catch { Write-Host 'Download failed:' $_.Exception.Message; exit 1 }}"

if errorlevel 1 (
    echo Error downloading Node.js. Please check your internet connection.
    pause
    exit /b 1
)

echo Extracting Node.js...
powershell -Command "& {try { Expand-Archive -Path '%NODE_ARCHIVE%' -DestinationPath '%DIR%' -Force } catch { Write-Host 'Extraction failed:' $_.Exception.Message; exit 1 }}"

if errorlevel 1 (
    echo Error extracting Node.js archive.
    pause
    exit /b 1
)

REM Move node.exe to the expected location
if exist "%NODE_BIN_PATH%" (
    copy "%NODE_BIN_PATH%" "%NODE_BIN%" >nul
    echo Node.js installed successfully.
) else (
    echo Error: Node.js binary not found after extraction.
    pause
    exit /b 1
)

REM Cleanup
if exist "%NODE_DIR%" rmdir /s /q "%NODE_DIR%"
if exist "%NODE_ARCHIVE%" del "%NODE_ARCHIVE%"

exit /b 0

:StartSerenePubl
echo Starting Serene Pub...
echo Press Ctrl+C to stop the application.
echo.

REM Start the Node.js application
"%NODE_BIN%" "%APP_MAIN%"

if errorlevel 1 (
    echo Serene Pub exited with error code: %errorlevel%
) else (
    echo Serene Pub stopped successfully.
)

exit /b 0

:error
echo An error occurred. Please try again.
pause
exit /b 1

:end
echo.
pause
