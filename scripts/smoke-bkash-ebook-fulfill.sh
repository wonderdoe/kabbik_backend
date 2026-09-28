#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://api.kabbik.com/v3/bkash}"
URL="${BASE_URL%/}/bkash-ebook-fulfill-payment"

echo "POST ${URL}"
headers="$(mktemp)"
body="$(mktemp)"
curl -s -D "${headers}" -o "${body}" -X POST "${URL}" \
  -H 'Content-Type: application/json' \
  -d '{"paymentId":"TR0011smoke-test"}'

grep -E 'HTTP/|X-Powered-By|Server:' "${headers}" || true
echo "--- body (first 500 chars) ---"
head -c 500 "${body}"
echo

if grep -qi 'X-Powered-By: Express' "${headers}"; then
  echo "OK: Express handled the request."
  exit 0
fi

echo "FAIL: No X-Powered-By: Express — deploy Node route or fix Apache proxy for bkash-ebook-fulfill-payment."
exit 1
