#!/usr/bin/env bash
# Socodsii: ./start-mac-linux.sh   (rakibid + socodsiin / set up and start the app)
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js lama helin. Ka rakib: https://nodejs.org (nooca LTS)"
  echo "Node.js was not found. Install the LTS version from https://nodejs.org"
  exit 1
fi
exec node scripts/setup.mjs
