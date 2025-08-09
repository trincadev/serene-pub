# Serene Pub Launcher - PowerShell Version
# This script downloads Node.js if needed and starts the application

# Set execution policy for this session only (bypass restrictions)
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

# Enable TLS 1.2 for secure downloads
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Get the directory where this script is located
$DIR = $PSScriptRoot
$env:NODE_ENV = "production"

# Node.js configuration - detect architecture
$NODE_BIN = Join-Path $DIR "node.exe"

# Detect Windows architecture
$arch = $env:PROCESSOR_ARCHITECTURE
if ($arch -eq "ARM64") {
    $NODE_ARCH = "arm64"
    $NODE_URL = "https://nodejs.org/dist/v20.13.1/node-v20.13.1-win-arm64.zip"
    $NODE_DIR = Join-Path $DIR "node-v20.13.1-win-arm64"
} else {
    $NODE_ARCH = "x64"
    $NODE_URL = "https://nodejs.org/dist/v20.13.1/node-v20.13.1-win-x64.zip"
    $NODE_DIR = Join-Path $DIR "node-v20.13.1-win-x64"
}

$NODE_ARCHIVE = Join-Path $DIR "node-archive.win.zip"
$NODE_BIN_PATH = Join-Path $NODE_DIR "node.exe"

# Application paths
$APP_MAIN = Join-Path $DIR "build\index.js"

# Load environment variables from .env file if present
$ENV_FILE = Join-Path $DIR ".env"
if (Test-Path $ENV_FILE) {
    Write-Host "Loading environment variables from .env file..." -ForegroundColor Green
    Get-Content $ENV_FILE | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $Matches[1].Trim()
            $value = $Matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Function to download and extract Node.js
function Install-NodeJs {
    try {
        Write-Host "Downloading Node.js v20.13.1 for $NODE_ARCH..." -ForegroundColor Green
        
        # Add user agent to appear less suspicious
        $headers = @{
            'User-Agent' = 'SerenePublauncher/1.0 (Windows)'
        }
        
        # Download with progress
        $ProgressPreference = 'Continue'
        Invoke-WebRequest -Uri $NODE_URL -OutFile $NODE_ARCHIVE -Headers $headers
        
        Write-Host "Extracting Node.js..." -ForegroundColor Green
        Expand-Archive -Path $NODE_ARCHIVE -DestinationPath $DIR -Force
        
        # Move node.exe to the expected location
        if (Test-Path $NODE_BIN_PATH) {
            Copy-Item $NODE_BIN_PATH $NODE_BIN -Force
            Write-Host "Node.js installed successfully." -ForegroundColor Green
        } else {
            throw "Node.js binary not found after extraction."
        }
        
        # Cleanup
        if (Test-Path $NODE_DIR) {
            Remove-Item $NODE_DIR -Recurse -Force
        }
        if (Test-Path $NODE_ARCHIVE) {
            Remove-Item $NODE_ARCHIVE -Force
        }
        
    } catch {
        Write-Host "Error installing Node.js: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Please check your internet connection and try again." -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Function to start the application
function Start-SerenePubl {
    try {
        Write-Host "Starting Serene Pub..." -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop the application." -ForegroundColor Yellow
        Write-Host ""
        
        # Start the Node.js application
        $process = Start-Process -FilePath $NODE_BIN -ArgumentList $APP_MAIN -NoNewWindow -PassThru -WorkingDirectory $DIR
        
        # Wait for the process to complete
        $process.WaitForExit()
        
        if ($process.ExitCode -eq 0) {
            Write-Host "Serene Pub stopped successfully." -ForegroundColor Green
        } else {
            Write-Host "Serene Pub exited with code: $($process.ExitCode)" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "Error starting Serene Pub: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Make sure the application files are not corrupted." -ForegroundColor Yellow
    }
}

# Main execution
Write-Host "=== Serene Pub Launcher ===" -ForegroundColor Cyan
Write-Host "Checking Node.js installation..." -ForegroundColor Gray

# Check if Node.js is already available
if (-not (Test-Path $NODE_BIN)) {
    Write-Host "Node.js not found. Installing..." -ForegroundColor Yellow
    Install-NodeJs
} else {
    Write-Host "Node.js found." -ForegroundColor Green
}

# Verify the main application file exists
if (-not (Test-Path $APP_MAIN)) {
    Write-Host "Error: Application file not found at $APP_MAIN" -ForegroundColor Red
    Write-Host "Please ensure all application files are present." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Start the application
Start-SerenePubl

# Keep console open
Write-Host ""
Read-Host "Press Enter to close this window"