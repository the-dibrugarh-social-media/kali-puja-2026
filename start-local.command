#!/bin/zsh
set -e
cd "$(dirname "$0")"

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js and npm are required. Install the current LTS release from https://nodejs.org, then run this file again."
  read -r "?Press Return to close..."
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "Installing frontend dependencies (first run only)..."
  npm ci
fi

URL="http://localhost:5173"
(open "$URL" >/dev/null 2>&1 || true)
npm run dev -- --host 127.0.0.1
