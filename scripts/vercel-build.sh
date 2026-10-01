#!/usr/bin/env bash
# Vercel build (vercel.json): the Expo web app as static files plus the API as one Node function,
# written in Vercel's Build Output API format (.vercel/output).
set -euo pipefail
cd "$(dirname "$0")/.."
out="$PWD/.vercel/output"
rm -rf "$out"
mkdir -p "$out/static"

(cd apps/mobile && EXPO_OFFLINE=1 npx expo export --platform web --output-dir dist)
cp -R apps/mobile/dist/. "$out/static/"

(cd apps/api && node scripts/bundle-vercel.mjs "$out/functions/api.func")

# API paths go to the function; built files are served as they are; every other path is an app
# screen, so it gets index.html and the app's router takes over.
cat > "$out/config.json" <<'JSON'
{
  "version": 3,
  "routes": [
    { "src": "^/(v1/.*|health)$", "dest": "/api?__path=$1" },
    { "src": "^/_expo/static/(.*)$", "headers": { "cache-control": "public, max-age=31536000, immutable" }, "continue": true },
    { "handle": "filesystem" },
    { "src": "^/(.*)$", "dest": "/index.html" }
  ]
}
JSON
echo "Vercel output ready in $out"
