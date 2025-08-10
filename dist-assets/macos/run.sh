#!/bin/sh
# Serene Pub Application Launcher
# Licensed under AGPL-3.0 - See LICENSE file
# Source: https://github.com/doolijb/serene-pub

DIR=$(dirname "$0")
export NODE_ENV=production
NODE_BIN="$DIR/node"
APP_MAIN="$DIR/build/index.js"

# Load environment variables from .env file if present
ENV_FILE="$DIR/.env"
if [ -f "$ENV_FILE" ]; then
    echo "Loading environment variables from .env file..."
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

echo "========================================"
echo "Serene Pub - AI Chat Application"
echo "https://github.com/doolijb/serene-pub"
echo "========================================"
echo

# Verify Node.js runtime exists
if [ ! -f "$NODE_BIN" ]; then
    echo "ERROR: Node.js runtime not found at $NODE_BIN"
    echo "Please ensure all application files are present in this directory."
    echo "Press Enter to exit..."
    read
    exit 1
fi

# Verify application files exist
if [ ! -f "$APP_MAIN" ]; then
    echo "ERROR: Application file not found at $APP_MAIN"
    echo "Please ensure all application files are present in this directory."
    echo "Press Enter to exit..."
    read
    exit 1
fi

chmod +x "$NODE_BIN"

echo "Starting Serene Pub..."
echo
echo "The application will be available at:"
echo "  - http://localhost:3000"
echo "  - http://127.0.0.1:3000"
echo
echo "Press Ctrl+C to stop the application."
echo "========================================"
echo

# Set up signal handling for graceful shutdown
trap 'echo; echo "Shutting down Serene Pub..."; kill $NODE_PID 2>/dev/null; wait $NODE_PID 2>/dev/null; echo "Serene Pub stopped."; exit 0' INT TERM

# Start the application in background to handle signals
"$NODE_BIN" "$APP_MAIN" "$@" &
NODE_PID=$!

# Wait for the Node.js process
wait $NODE_PID
EXIT_CODE=$?

echo
echo "========================================"
if [ $EXIT_CODE -eq 0 ]; then
    echo "Serene Pub stopped normally."
else
    echo "Serene Pub exited with code: $EXIT_CODE"
    echo "Check the output above for any error messages."
fi
echo

echo "Press Enter to exit..."
read
exit $EXIT_CODE
read
