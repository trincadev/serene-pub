@echo off
REM Serene Pub Application Launcher
REM Licensed under AGPL-3.0 - See LICENSE file
REM Source: https://github.com/doolijb/serene-pub

setlocal enabledelayedexpansion

REM === Configuration ===
set NODE_ENV=production
set DIR=%~dp0
set DIR=%DIR:~0,-1%
set NODE_BIN=%DIR%\node.exe
set APP_MAIN=%DIR%\build\index.js

REM === Load Environment Variables ===
set ENV_FILE=%DIR%\.env
if exist "%ENV_FILE%" (
    echo Loading configuration from .env file...
    for /f "usebackq tokens=1,2 delims==" %%a in ("%ENV_FILE%") do (
        set "line=%%a"
        if not "!line:~0,1!"=="#" (
            if not "%%a"=="" if not "%%b"=="" (
                set "%%a=%%b"
            )
        )
    )
)

echo ========================================
echo Serene Pub - AI Chat Application
echo https://github.com/doolijb/serene-pub
echo ========================================
echo.

REM === Verify Node.js Runtime ===
if not exist "%NODE_BIN%" (
    echo ERROR: Node.js runtime not found at %NODE_BIN%
    echo Please ensure all application files are present in this directory.
    goto :Error
)

REM === Verify Application Files ===
if not exist "%APP_MAIN%" (
    echo ERROR: Application file not found at %APP_MAIN%
    echo Please ensure all application files are present in this directory.
    goto :Error
)

echo Starting Serene Pub...
echo.
echo The application will be available at:
echo   - http://localhost:3000
echo   - http://127.0.0.1:3000
echo.
echo Press Ctrl+C to stop the application.
echo ========================================
echo.

REM === Start Application ===
"%NODE_BIN%" "%APP_MAIN%"

REM === Application Exit Handling ===
set EXIT_CODE=%ERRORLEVEL%
echo.
echo ========================================
if %EXIT_CODE% equ 0 (
    echo Serene Pub stopped normally.
) else (
    echo Serene Pub exited with code: %EXIT_CODE%
    echo Check the output above for any error messages.
)
echo.
goto :End

:Error
echo.
echo ========================================
echo Setup failed. Please ensure:
echo 1. All application files are present
echo 2. Node.js runtime (node.exe) is included
echo 3. Visit https://github.com/doolijb/serene-pub for help
echo ========================================
echo.

:End
echo Press any key to exit...
pause >nul
exit /b %EXIT_CODE%
