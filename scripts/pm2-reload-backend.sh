#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

echo "Reloading PM2 from ${ROOT}"
pm2 startOrRestart ecosystem.config.js --update-env
pm2 save

echo "Smoke test (local):"
BASE_URL="${BASE_URL:-http://127.0.0.1:8080}" bash "${ROOT}/scripts/smoke-quick-access.sh"
