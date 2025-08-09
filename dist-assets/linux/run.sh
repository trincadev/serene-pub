#!/bin/sh
DIR=$(dirname "$0")
export NODE_ENV=production
NODE_BIN="$DIR/node"
NODE_URL="https://nodejs.org/dist/v20.13.1/node-v20.13.1-linux-x64.tar.xz"
NODE_ARCHIVE="node-archive.linux.tar.xz"
NODE_DIR="node-v20.13.1-linux-x64"
NODE_BIN_PATH="$NODE_DIR/bin/node"

# Load environment variables from .env file if present
ENV_FILE="$DIR/.env"
if [ -f "$ENV_FILE" ]; then
    echo "Loading environment variables from .env file..."
    export $(grep -v '^#' "$ENV_FILE" | xargs -d '\n')
fi

if [ ! -f "$NODE_BIN" ]; then
  echo "Downloading Node.js..."
  curl -L -o "$NODE_ARCHIVE" "$NODE_URL"
  tar -xf "$NODE_ARCHIVE"
  cp "$NODE_BIN_PATH" "$NODE_BIN"
  rm -rf "$NODE_DIR"
  rm -f "$NODE_ARCHIVE"
fi
chmod +x "$NODE_BIN"

echo "Starting Serene Pub..."
"$NODE_BIN" "$DIR/build/index.js" "$@"

echo "Press Enter to exit..."
read
