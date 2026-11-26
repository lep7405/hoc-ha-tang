#!/usr/bin/env bash
# Kiểm trước khi deploy: cú pháp JS, file được trỏ tới có thật, không lộ IP/key.
set -euo pipefail
cd "$(dirname "$0")/.."
for d in site/aws site/cloudflare; do
  cat $(grep -oE 'src="[^"]+\.js"' "$d/index.html" | sed -E 's/src="(.*)"/'"${d//\//\\/}"'\/\1/') > /tmp/all.js
  node --check /tmp/all.js
  for f in $(grep -oE '(src|href)="[^"/:#]+\.(js|css)"' "$d/index.html" | sed -E 's/.*="(.*)"/\1/'); do test -f "$d/$f" || { echo "Thiếu $d/$f"; exit 1; }; done
done
if grep -rnE '([0-9]{1,3}\.){3}[0-9]{1,3}' site --include=*.js --include=*.html | grep -vE '10\.0\.|0\.0\.0\.0|127\.0\.0\.1|169\.254\.169\.254|[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/[0-9]+' ; then echo "Có IP lạ trong site/"; exit 1; fi
if grep -rnE 'AKIA[0-9A-Z]{16}|-----BEGIN|Bearer [A-Za-z0-9_-]{20,}' site; then echo "Có thứ giống secret"; exit 1; fi
echo "check OK"
