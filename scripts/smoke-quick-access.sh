#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
URL="${BASE_URL%/}/api/v4/home/quick-access"

echo "GET ${URL}"
headers="$(mktemp)"
body="$(mktemp)"
curl -sS -D "${headers}" -o "${body}" "${URL}"

grep -E 'HTTP/|X-Powered-By|Server:' "${headers}" || true
echo "--- body ---"
cat "${body}"
echo

if grep -q 'Route not found' "${body}"; then
  echo "FAIL: quick-access route not registered (PM2 likely running old cwd — run scripts/pm2-reload-backend.sh on the server)."
  exit 1
fi

if grep -qi 'Unauthorized' "${body}"; then
  echo "OK: quick-access route is registered (401 without token is expected)."
  exit 0
fi

if grep -q '"success":true' "${body}"; then
  echo "OK: quick-access returned success."
  exit 0
fi

echo "WARN: unexpected body; verify manually."
exit 1
