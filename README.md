# Trang học hạ tầng

Ghi chép tự học AWS và Cloudflare: làm gì, vì sao, lỗi gặp phải.

- Xem: https://bai.phuoc-review-app-1.uk/hoc/
- `site/aws/`: nhật ký setup AWS (nội dung trong `app.js`, mảng `PAGES`). Chuyển từ repo `aws-hoc-setup` (đã archive 26/11/2026).
- `site/cloudflare/`: học Cloudflare (nội dung trong `data.js`, mảng `PAGES`; `app.js` chỉ dựng trang).
- Trang tĩnh, không cần build. Mở `site/index.html` trực tiếp cũng được.

## Chạy ở đâu
- VPS: https://bai.phuoc-review-app-1.uk/hoc/ (GitHub Actions deploy mỗi lần push).
- EC2 lab AWS: `http://<IP EC2>/hoc-ha-tang/` (cron `git pull` 10 phút/lần, cách dựng ở trang AWS → "Deploy trang này lên EC2"). `/aws-hoc-setup/` cũ chuyển hướng về đây.

## Deploy
Push lên `main` → GitHub Actions:
1. `check`: `scripts/check.sh` (cú pháp JS, file thiếu, IP/secret lộ).
2. `deploy`: SSH vào VPS bằng key chỉ chạy được `/usr/local/bin/hoc-deploy` (bản trong repo: `deploy/hoc-deploy`). Lệnh này kéo `origin/main` (chỉ fast-forward), chép `site/` sang `public/`, gắn `?v=<commit>` cho JS/CSS để Cloudflare và trình duyệt không giữ bản cũ, rồi khởi động lại container `hoc-ha-tang-web-1`.
3. Tải lại trang, kiểm đã đúng commit.

Secret của repo: `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`, `VPS_HOST`.

Server: `/opt/hoc-ha-tang`, container nginx `hoc-web` trên mạng `vocab-edge`. Gateway chung chuyển `bai.phuoc-review-app-1.uk/hoc/` vào container này (route nằm ở repo `simple-app-vocab`, file `deploy/nginx-domain.conf`).

Sửa `deploy/hoc-deploy` thì phải chép tay lên `/usr/local/bin/hoc-deploy` trên server, vì key deploy không làm được việc đó.

## Không đưa lên đây
Repo công khai. Không ghi IP server, số tài khoản, tên bucket/zone/token của công ty. `scripts/check.sh` chặn IP và chuỗi giống key.

## Chụp ảnh dashboard (Cloudflare)
1. Mở Chrome **thường** (không qua Playwright, vì Google chặn đăng nhập trong trình duyệt tự động hoá), profile riêng, cổng debug chỉ nghe localhost:
   `google-chrome --user-data-dir=$HOME/.cache/playwright-cloudflare/chrome-thuong --remote-debugging-port=9333 --remote-debugging-address=127.0.0.1 https://dash.cloudflare.com/login`
2. Tự đăng nhập trong cửa sổ đó.
3. `PW=<thư mục node_modules/playwright> node tools/chup-dashboard.js <đường dẫn sau account id> site/cloudflare/img/<tên>.png` (env `WAITFOR`, `CLICK`, `SCROLL`, `HIDE`, `FULL`: xem đầu file). Script tự che email, account ID, IP, chuỗi dài giống token trước khi chụp.
4. Xem lại từng ảnh trước khi commit (repo public). Xong thì đóng Chrome, vì cổng debug cho phép điều khiển phiên đã đăng nhập.
