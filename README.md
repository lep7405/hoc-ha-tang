# Trang học hạ tầng

Ghi chép tự học AWS và Cloudflare: làm gì, vì sao, lỗi gặp phải.

- Xem: https://bai.phuoc-review-app-1.uk/hoc/
- `site/aws/`: nhật ký setup AWS (nội dung trong `app.js`, mảng `PAGES`). Chuyển từ repo `aws-hoc-setup`.
- `site/cloudflare/`: học Cloudflare (nội dung trong `data.js`, mảng `PAGES`; `app.js` chỉ dựng trang).
- Trang tĩnh, không cần build. Mở `site/index.html` trực tiếp cũng được.

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
