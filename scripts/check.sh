#!/usr/bin/env bash
# Kiểm trước khi deploy: cú pháp JS, file được trỏ tới có thật, không lộ IP/key.
set -euo pipefail
cd "$(dirname "$0")/.."
for d in site/aws site/cloudflare; do
  cat $(grep -oE 'src="[^"]+\.js"' "$d/index.html" | sed -E 's/src="(.*)"/'"${d//\//\\/}"'\/\1/') > /tmp/all.js
  node --check /tmp/all.js
  for f in $(grep -oE '(src|href)="[^"/:#]+\.(js|css)"' "$d/index.html" | sed -E 's/.*="(.*)"/\1/'); do test -f "$d/$f" || { echo "Thiếu $d/$f"; exit 1; }; done
done
# Chạy thử dữ liệu trang Cloudflare: mọi mục phải dựng ra HTML (chuỗi). node --check không bắt được lỗi chèn sai vị trí.
node -e "
const fs=require('fs'); global.window={addEventListener(){}};
eval(fs.readFileSync('site/cloudflare/data.js','utf8')+fs.readFileSync('site/cloudflare/zone.js','utf8')+';globalThis.P=PAGES;');
const bad=[]; P.forEach(p=>p.sections.forEach(s=>{ if(typeof s.html!=='string') bad.push(p.id+'/'+s.h); }));
const imgs=[...(fs.readFileSync('site/cloudflare/data.js','utf8')+fs.readFileSync('site/cloudflare/zone.js','utf8')).matchAll(/shot\\('([^']+)'/g)].map(m=>m[1]).filter(f=>!fs.existsSync('site/cloudflare/img/'+f+'.png'));
if(bad.length||imgs.length){ console.log('Mục hỏng:',bad,'Ảnh thiếu:',imgs); process.exit(1);} console.log('PAGES', P.length, 'OK');"
if grep -rnE '([0-9]{1,3}\.){3}[0-9]{1,3}' site --include=*.js --include=*.html | grep -vE '10\.0\.|0\.0\.0\.0|127\.0\.0\.1|169\.254\.169\.254|8\.8\.8\.8|1\.1\.1\.1|[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/[0-9]+' ; then echo "Có IP lạ trong site/"; exit 1; fi
if grep -rnE 'AKIA[0-9A-Z]{16}|-----BEGIN|Bearer [A-Za-z0-9_-]{20,}' site; then echo "Có thứ giống secret"; exit 1; fi
echo "check OK"
