// Trang docs một file: mỗi phần tử PAGES là một trang (hash #id). Nội dung là HTML tĩnh do mình viết.
const ul = (items) => '<ul>' + items.map((x) => `<li>${x}</li>`).join('') + '</ul>';
const callout = (kind, title, body) => `<div class="callout ${kind}"><b>${title}</b><div>${body}</div></div>`;

// Chặng của một request trong hệ thống thật. learned: true = đã làm trong bài lab, false = chưa học.
const HOPS = [
  { n: 'Trình duyệt', where: 'Máy người dùng', learned: true, what: 'Người dùng gõ <code>https://shop.example.com/cart</code>. Trình duyệt cần biết IP của tên miền này trước.', fail: '' },
  { n: 'DNS (Route 53 / Cloudflare)', where: 'Internet', learned: false, week: 'Tuần 6 (DNS) · Tuần 13 (Route 53)', what: 'Đổi tên miền thành IP. Hệ thống thật trả về địa chỉ của CDN hoặc load balancer, không phải IP của từng server.', fail: '<code>ERR_NAME_NOT_RESOLVED</code>: sai record hoặc tên miền hết hạn.' },
  { n: 'CDN (CloudFront / Cloudflare)', where: 'Edge, gần người dùng', learned: false, week: 'Tuần 13', what: 'Giữ bản sao (cache) của ảnh, CSS, JS ở máy chủ gần người dùng. Có sẵn trong cache thì trả luôn, request không đi tiếp vào AWS. Đây cũng là nơi bắt đầu HTTPS (chứng chỉ ACM).', fail: 'Trả bản cũ do cache; lỗi cert (<code>NET::ERR_CERT_…</code>).' },
  { n: 'WAF', where: 'Trước CDN / ALB', learned: false, week: 'Sau giai đoạn 1', what: 'Firewall cho web: chặn SQL injection, bot, IP xấu, giới hạn số request.', fail: '<code>403</code> do WAF chặn nhầm.' },
  { n: 'Internet Gateway', where: 'Cửa của VPC', learned: true, week: 'Đã làm', what: 'Request từ Internet đi vào VPC. Đổi public IP thành private IP của ALB hoặc EC2.', fail: 'Route table thiếu <code>0.0.0.0/0 → IGW</code> → timeout (thí nghiệm 3).' },
  { n: 'ALB (Load Balancer)', where: 'Public subnet, 2 AZ', learned: false, week: 'Tuần 12', what: 'Nhận mọi request, kiểm tra server nào còn sống (health check), rồi chia đều cho các EC2 phía sau. Một server chết thì không gửi request tới nó nữa. Có Security Group riêng mở 80/443 cho Internet.', fail: '<code>502</code> (server phía sau lỗi), <code>503</code> (không còn server nào khoẻ), <code>504</code> (server trả lời quá chậm).' },
  { n: 'NACL + Security Group của EC2', where: 'Subnet / từng máy', learned: true, week: 'Đã làm', what: 'Hệ thống thật đặt EC2 ở <b>private subnet</b>. Security Group của EC2 chỉ cho phép <b>Security Group của ALB</b> vào cổng 80, nên người ngoài không gọi thẳng vào EC2 được.', fail: 'Thiếu rule → ALB không gọi được EC2 → health check fail → <code>503</code>.' },
  { n: 'EC2: nginx', where: 'Private subnet', learned: true, week: 'Đã làm', what: 'nginx nghe cổng 80. File tĩnh thì trả luôn; request tới PHP thì chuyển cho PHP-FPM/Laravel (reverse proxy).', fail: 'Không có ai nghe cổng → <code>refused</code> (lỗi 2). App phía sau chết → <code>502</code>.' },
  { n: 'App (Laravel / PHP-FPM, hoặc container ECS)', where: 'Trong EC2 / ECS', learned: false, week: 'Tuần 19 (capstone)', what: 'Chạy code: đọc session, kiểm tra đăng nhập, lấy giỏ hàng.', fail: '<code>500</code>: lỗi code; xem log app.' },
  { n: 'ElastiCache (Redis)', where: 'Private subnet', learned: false, week: 'Tuần 14', what: 'Lấy session, cache. Nhanh, đỡ phải gọi database.', fail: 'Timeout khi kết nối: Security Group của Redis chưa cho phép app vào cổng 6379.' },
  { n: 'RDS (MySQL)', where: 'Private subnet, Multi-AZ', learned: false, week: 'Tuần 14', what: 'Đọc/ghi dữ liệu: giỏ hàng, đơn hàng. Không có public IP; chỉ Security Group của app được vào cổng 3306.', fail: '<code>SQLSTATE[HY000] [2002]</code> timeout: thiếu rule 3306; database quá tải.' },
  { n: 'S3 (qua VPC endpoint)', where: 'Ngoài VPC, đi đường tắt', learned: false, week: 'Tuần 13', what: 'Lấy/lưu ảnh sản phẩm. Đi qua VPC endpoint (đường tắt miễn phí), không cần ra Internet.', fail: '<code>AccessDenied</code>: IAM role của EC2 thiếu quyền S3.' },
  { n: 'NAT Gateway (chiều ra)', where: 'Public subnet', learned: false, week: 'Tuần 11', what: 'Khi app cần gọi API bên ngoài (cổng thanh toán, Shopify…), máy ở private subnet đi ra qua NAT. Bên ngoài không gọi ngược vào được.', fail: 'Thiếu NAT hoặc thiếu route → gọi API ngoài bị timeout.' },
  { n: 'Trả kết quả về', where: 'Đi ngược lại', learned: true, week: 'Đã làm', what: 'App → nginx → ALB → IGW → CDN → trình duyệt. Security Group là stateful nên gói trả lời tự được cho ra; route table phải có đường về.', fail: 'Thiếu đường về → timeout (thí nghiệm 3).' },
  { n: 'CloudWatch (ghi lại mọi thứ)', where: 'Song song', learned: false, week: 'Tuần 15', what: 'Mọi tầng đều ghi log và số liệu (metric). Vượt ngưỡng thì báo động (alarm), gửi email qua SNS. Đây là công cụ chính của người vận hành.', fail: '' },
];
const journeyHtml = () => '<div class="journey">' + HOPS.map((h, i) => `
  <details class="hop ${h.learned ? 'done' : 'todo'}"${i < 2 ? ' open' : ''}>
    <summary><span class="hn">${i + 1}</span><span class="ht">${h.n}</span><span class="hw">${h.where}</span><span class="badge">${h.learned ? 'Đã học' : 'Chưa học'}</span></summary>
    <div class="hb"><p>${h.what}</p>${h.fail ? `<p class="hf"><b>Hỏng thì thấy:</b> ${h.fail}</p>` : ''}${h.week ? `<p class="hk">${h.learned ? '' : 'Học ở: '}${h.week}</p>` : ''}</div>
  </details>`).join('') + '</div>';


const B = (t, sub, learned) => `<div class="box${learned ? ' learned' : ''}"><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
const archHtml = () => `<div class="arch">
  <div class="zone"><span class="zl">Internet</span>
    <div class="row">${B('Người dùng', 'gõ shop.example.com', true)}</div>
    <div class="ar">↓ DNS (Route 53) đổi tên miền → IP của CDN</div>
    <div class="row">${B('CloudFront (CDN)', 'cache ảnh/CSS, HTTPS')}${B('WAF', 'chặn tấn công web')}</div>
  </div>
  <div class="ar">↓</div>
  <div class="zone vpc"><span class="zl">VPC 10.0.0.0/16</span>
    <div class="row">${B('Internet Gateway', 'cửa vào/ra VPC', true)}</div>
    <div class="ar">↓</div>
    <div class="zone pub"><span class="zl">Public subnet · AZ 1a + 1c</span>
      <div class="row">${B('ALB', 'chia request cho các EC2')}${B('NAT Gateway', 'cho private subnet đi ra')}</div>
    </div>
    <div class="ar">↓ chỉ ALB được gọi vào (Security Group)</div>
    <div class="zone priv"><span class="zl">Private subnet · AZ 1a + 1c</span>
      <div class="row">${B('EC2 #1 (1a)', 'nginx + Laravel', true)}${B('EC2 #2 (1c)', 'nginx + Laravel')}</div>
      <div class="ar">↓</div>
      <div class="row">${B('ElastiCache Redis', 'session, cache')}${B('RDS MySQL', 'Multi-AZ, không public IP')}</div>
    </div>
  </div>
  <div class="row">${B('S3', 'ảnh, qua VPC endpoint')}${B('CloudWatch', 'log + metric mọi tầng')}</div>
  <p class="legend"><span class="box learned mini"></span> viền xanh = đã làm trong bài lab</p>
</div>`;

const PAGES = [
  // ---------- Tổng quan ----------
  { id: 'hanh-trinh', group: 'Tổng quan', title: 'Hành trình của một request',
    lead: 'Từ lúc gõ địa chỉ tới lúc trang hiện ra, một request trong hệ thống thật đi qua khoảng 15 chặng. Bài lab hiện tại mới đi qua 5 chặng. Bấm vào từng chặng để xem nó làm gì và hỏng thì ra lỗi gì.',
    sections: [
      { h: 'Sơ đồ hệ thống thật', html: archHtml() },
      { h: 'Từng chặng', html: journeyHtml() },
      { h: 'Bài lab hiện tại khác gì', html: '<div class="tablewrap"><table><thead><tr><th></th><th>Bài lab hiện tại</th><th>Hệ thống thật</th></tr></thead><tbody><tr><td>Người dùng vào bằng</td><td>Public IP của EC2</td><td>Tên miền → CDN → ALB</td></tr><tr><td>EC2 nằm ở</td><td>Public subnet, có public IP</td><td><b>Private subnet</b>, không có public IP</td></tr><tr><td>Số server</td><td>1</td><td>≥ 2, ở 2 AZ, sau ALB</td></tr><tr><td>HTTPS</td><td>Chưa có ("Not secure")</td><td>Cert ACM ở CloudFront/ALB</td></tr><tr><td>Database</td><td>Chưa có</td><td>RDS ở private subnet</td></tr><tr><td>Vào server để sửa</td><td>SSH qua public IP</td><td>Session Manager, không mở cổng 22</td></tr></tbody></table></div><p>Bài lab cố ý đơn giản để thấy từng lớp. Các tuần sau sẽ lần lượt chuyển sang mô hình bên phải.</p>' },
    ] },
  { id: 'ban-do', group: 'Tổng quan', title: 'Bản đồ kiến thức: đã học và sắp học',
    lead: 'Biết mình đang ở đâu trên toàn bộ bức tranh.',
    sections: [
      { h: 'Theo tầng', html: '<div class="tablewrap"><table><thead><tr><th>Tầng</th><th>Thành phần</th><th>Trạng thái</th></tr></thead><tbody>'
        + '<tr><td>Tài khoản & quyền</td><td>Root + MFA, IAM user, policy, Billing, Budget, CLI</td><td><span class="pill ok">Đã học</span> · IAM role cho EC2: <span class="pill">Tuần 10</span></td></tr>'
        + '<tr><td>Mạng</td><td>VPC, subnet, route table, IGW, Security Group, NACL, public/private IP</td><td><span class="pill ok">Đã học</span> · NAT, VPC endpoint, VPN: <span class="pill">Tuần 11 / mạng</span></td></tr>'
        + '<tr><td>Máy chủ</td><td>EC2, key pair, User data, nginx, SSH, deploy đường dẫn con</td><td><span class="pill ok">Đã học</span> · Session Manager, AMI: <span class="pill">Tuần 12</span></td></tr>'
        + '<tr><td>Chia tải & mở rộng</td><td>ALB, target group, health check, Auto Scaling</td><td><span class="pill">Tuần 12</span></td></tr>'
        + '<tr><td>Tên miền & HTTPS</td><td>Route 53, ACM, CloudFront, S3</td><td><span class="pill">Tuần 13</span></td></tr>'
        + '<tr><td>Dữ liệu</td><td>RDS, backup/restore, Multi-AZ, ElastiCache</td><td><span class="pill">Tuần 14</span></td></tr>'
        + '<tr><td>Vận hành</td><td>CloudWatch, alarm, log, CloudTrail, 障害対応</td><td><span class="pill">Tuần 15 + 8–9</span></td></tr>'
        + '<tr><td>Tự động hoá</td><td>Terraform, CI/CD, Docker/ECS</td><td><span class="pill">Tuần 16, 19</span></td></tr>'
        + '</tbody></table></div>' },
    ] },
  { id: 'trong-ec2', group: 'Tổng quan', title: 'Bên trong EC2: request vào máy rồi đi đâu',
    lead: 'Qua được Security Group, gói tin mới tới hệ điều hành. Từ đây là chuyện của Linux.',
    sections: [
      { h: 'Đường đi trong máy', html: '<pre><code>Card mạng (eth0 / ens5, IP 10.0.3.176)\n  ▼  Linux kernel: cổng 80 có chương trình nào nghe không?\n  │     không  → trả RST → trình duyệt báo REFUSED   (lỗi 2)\n  ▼     có     → giao cho nginx\nnginx (master + các worker)\n  │  đọc /etc/nginx/sites-enabled/default + snippets/*.conf\n  │  khớp location nào?\n  ├─ /aws-hoc-setup/  → alias tới /var/www/sites/aws-hoc-setup/ → trả file tĩnh\n  ├─ /                → /var/www/html/index.html\n  └─ (sau này) *.php  → chuyển cho PHP-FPM (Laravel) → MySQL / Redis\n  ▼\nGhi log: /var/log/nginx/access.log (request nào, mã gì)\n         /var/log/nginx/error.log  (lỗi cấu hình, không đọc được file)</code></pre>' },
      { h: 'Lệnh để soi từng bước', html: '<div class="tablewrap"><table><thead><tr><th>Muốn biết</th><th>Lệnh</th></tr></thead><tbody><tr><td>Máy có IP gì</td><td><code>ip a</code></td></tr><tr><td>Cổng nào đang có chương trình nghe</td><td><code>sudo ss -tlnp</code></td></tr><tr><td>nginx có đang chạy</td><td><code>systemctl status nginx</code></td></tr><tr><td>Cấu hình nginx có lỗi không</td><td><code>sudo nginx -t</code></td></tr><tr><td>Request có vào tới máy không</td><td><code>sudo tail -f /var/log/nginx/access.log</code></td></tr><tr><td>nginx báo lỗi gì</td><td><code>sudo tail /var/log/nginx/error.log</code></td></tr><tr><td>Tự gọi thử từ trong máy</td><td><code>curl -I http://localhost/aws-hoc-setup/</code></td></tr></tbody></table></div>' },
      { h: 'Mẹo khoanh vùng', html: callout('ok', 'Gọi từ trong máy trước', 'Trong máy chạy <code>curl localhost</code>: nếu <b>được</b> mà từ ngoài không được, lỗi nằm ở <b>mạng</b> (Security Group, route, public IP). Nếu trong máy cũng <b>không được</b>, lỗi nằm ở <b>nginx/app</b>.') },
    ] },

  // ---------- Tài khoản ----------
  { id: 'tai-khoan', group: 'Tài khoản', title: 'Tạo tài khoản, hiểu gói Free plan',
    lead: 'Tài khoản mới ở gói Free: có credit, không bị trừ tiền thẻ.',
    sections: [
      { h: 'Làm gì', html: ul(['Đăng ký tài khoản AWS mới, chọn gói <b>Free</b>.', 'Đợi email <i>"Your account with Free plan is ready"</i>.']) },
      { h: 'Vì sao', html: ul(['Free plan có <b>100 USD credit</b> (làm thêm việc trong "Explore AWS" thì được cộng tối đa 100 USD nữa). Dùng được tới <b>24/5/2027</b> hoặc tới khi hết credit.', 'Ở gói Free, AWS <b>không trừ tiền thẻ</b>. Hết credit thì dừng, không tự tính tiền.']) },
      { h: 'Sai lầm đã gặp', html: callout('bad', 'Vào trang nào cũng bị chuyển sang "Complete your account setup"', 'Lúc đó tài khoản <b>chưa kích hoạt xong</b>: đang xác minh thẻ và danh tính, mất tới 24 giờ. Không phải lỗi. Chờ có email "ready" rồi vào lại là được. <b>Đừng bấm "Upgrade plan"</b>: lên gói Paid thì dùng vượt sẽ trừ tiền thẻ thật.') },
      { h: 'Bẫy cần tránh', html: callout('warn', 'AWS Organizations', 'Dùng Organizations (kể cả nút "Try out the new page" ở trang Account, hay Control Tower) thì tài khoản <b>tự lên gói Paid</b>.') },
    ] },
  { id: 'mfa', group: 'Tài khoản', title: 'Bật MFA cho root',
    lead: 'Root là tài khoản gốc, làm được mọi thứ. Phải khoá thêm một lớp.',
    sections: [
      { h: 'Làm gì', html: ul(['Search <code>IAM</code> → Dashboard → <b>Add MFA for root user</b> → dùng app Authenticator hoặc passkey.']) },
      { h: 'Vì sao', html: ul(['<b>Root</b> (email + mật khẩu) làm được mọi thứ, kể cả đóng tài khoản. Lộ mật khẩu root là mất tất cả.', 'MFA bắt nhập thêm mã 6 số từ điện thoại. Có mật khẩu mà không có điện thoại thì vẫn không vào được.']) },
    ] },
  { id: 'billing', group: 'Tài khoản', title: 'Cho IAM user xem được Billing',
    lead: 'Mặc định chỉ root xem được tiền, kể cả admin cũng bị chặn.',
    sections: [
      { h: 'Làm gì', html: ul(['Đăng nhập <b>root</b> → Billing → <b>Account</b> → cuộn xuống cuối, mục <i>IAM user and role access to Billing information</i> → Edit → tick <b>Activate IAM Access</b> → <b>Update</b>.']) },
      { h: 'Vì sao', html: ul(['IAM user có quyền <code>AdministratorAccess</code> vào trang Billing vẫn bị "Access denied" nếu chưa bật mục này.', 'Bật rồi thì user nào có quyền billing mới xem được. User không có quyền vẫn bị chặn, nên tài khoản không kém an toàn hơn.']) },
    ] },
  { id: 'iam-user', group: 'Tài khoản', title: 'Tạo IAM user admin để dùng hằng ngày', bug: true,
    lead: 'Không dùng root cho việc hằng ngày. Và trong AWS, mặc định là không được làm gì.',
    sections: [
      { h: 'Làm gì', html: ul(['IAM → Users → <b>Create user</b> → tick <i>Provide user access to the AWS Management Console</i> (cho đăng nhập trang web console) → Custom password.', 'Gán quyền: <b>Add user to group</b> → group <code>Admins</code> có policy <code>AdministratorAccess</code>.', 'Lưu link đăng nhập <code>https://&lt;số-tài-khoản&gt;.signin.aws.amazon.com/console</code>. Từ nay chỉ dùng user này.']) },
      { h: 'Quyền AdministratorAccess là gì', html: '<pre><code>{ "Effect": "Allow", "Action": "*", "Resource": "*" }</code></pre>' + ul(['Được làm <b>mọi hành động trên mọi tài nguyên</b>: tạo/xoá EC2, S3, IAM, xem Billing…', 'Những việc chỉ root làm được: đóng tài khoản, đổi email root, đổi gói hỗ trợ, một số cài đặt thanh toán.', 'Ở công ty không ai được giao quyền này cho việc hằng ngày. Mỗi người chỉ được đúng quyền cho việc của mình (最小権限 saishou kengen, quyền tối thiểu).']) },
      { h: 'Sai lầm đã gặp', html: callout('bad', 'Tạo user xong mà mở trang nào cũng "Access denied"', 'User <b>chưa được gán policy nào</b>. Thông báo ghi <code>no identity-based policy allows the action</code>, nghĩa là không có policy nào cho phép hành động này. User đó cũng không tự cấp quyền cho mình được.<br><b>Sửa:</b> đăng nhập root → IAM → Users → chọn user → Permissions → Add permissions → <code>AdministratorAccess</code>.<br><b>Bài học:</b> mặc định là bị chặn hết. Phải có policy Allow thì mới làm được.') },
    ] },
  { id: 'budget', group: 'Tài khoản', title: 'Đặt cảnh báo tiền (Budget)',
    lead: 'Budget chỉ gửi email, không tự tắt dịch vụ.',
    sections: [
      { h: 'Làm gì', html: ul(['Billing → Budgets → Create budget → template <b>Monthly cost budget</b> → <code>5</code> USD → điền email.']) },
      { h: 'Hiểu đúng', html: callout('warn', 'Budget không phải giới hạn chi tiêu', 'Vượt 5 USD thì mọi thứ <b>vẫn chạy</b> và vẫn bị trừ credit. Budget chỉ báo qua email. Muốn tự dừng thì phải cài thêm Budget actions. Cách chắc ăn nhất: học xong buổi nào thì xoá tài nguyên buổi đó.') },
    ] },
  { id: 'cli', group: 'Tài khoản', title: 'Cài CLI với profile riêng',
    lead: 'Đặt tên profile riêng để không bao giờ chạy lệnh nhầm sang tài khoản đang tính tiền.',
    sections: [
      { h: 'Làm gì', html: '<pre><code>aws login --profile hoc\naws configure set region ap-northeast-1 --profile hoc\naws sts get-caller-identity --profile hoc   # phải ra đúng số tài khoản học\nexport AWS_PROFILE=hoc                       # trước mỗi buổi lab</code></pre>' },
      { h: 'Vì sao', html: ul(['Máy đã có profile <code>default</code> trỏ vào <b>tài khoản cũ gói Paid</b>. Chạy nhầm sang đó là mất tiền thật.', '<code>aws login</code> dùng tài khoản đăng nhập web, <b>không tạo access key</b>, nên không có file key nào bị lộ.', 'CLI dùng để tự động hoá và để viết 手順書 (tejunsho, tài liệu các bước). Terraform cũng đăng nhập theo cùng cách.']) },
    ] },

  // ---------- Mạng ----------
  { id: 'vpc', group: 'Mạng', title: 'VPC: mạng riêng trên AWS',
    lead: 'Giống mạng wifi ở nhà, nhưng nằm trong data center AWS và thiết bị cắm vào là máy chủ.',
    sections: [
      { h: 'Mục đích của VPC', html: '<p>VPC <b>không chạy gì cả</b>: không phải server, không xử lý request. Nó là <b>cái mạng</b> để các server, database, load balancer cắm vào. VPC giải quyết 5 việc:</p><div class="tablewrap"><table><thead><tr><th>Mục đích</th><th>Nghĩa là</th><th>Ví dụ</th></tr></thead><tbody>'
        + '<tr><td><b>1. Tách riêng</b></td><td>Máy của bạn nằm trong mạng riêng, không lẫn với hàng triệu khách khác của AWS</td><td>VPC của công ty khác dùng trùng <code>10.0.0.0/16</code> cũng không thấy nhau</td></tr>'
        + '<tr><td><b>2. Quyết định ai gọi được ai</b></td><td>Chia tầng public/private, mỗi máy một Security Group</td><td>Chỉ ALB ra Internet; database ở private subnet, chỉ app gọi được</td></tr>'
        + '<tr><td><b>3. Quyết định đường đi</b></td><td>Route table chỉ đường cho từng subnet: ra Internet, qua NAT, đi tắt tới S3, sang VPC khác</td><td>Private subnet ra ngoài được (qua NAT) nhưng không ai gọi vào được</td></tr>'
        + '<tr><td><b>4. Quy hoạch địa chỉ IP</b></td><td>Tự chọn dải IP để sau này nối với mạng khác không bị trùng</td><td>Dev <code>10.0.0.0/16</code>, prod <code>10.1.0.0/16</code>, văn phòng <code>192.168.0.0/16</code></td></tr>'
        + '<tr><td><b>5. Nối với mạng khác</b></td><td>VPN tới văn phòng, nối 2 VPC (peering), Direct Connect (đường cáp riêng)</td><td>Nhân viên ở văn phòng vào được server nội bộ mà không cần mở ra Internet</td></tr>'
        + '</tbody></table></div><p>Thêm nữa: <b>VPC Flow Logs</b> ghi lại mọi kết nối ra vào, dùng khi điều tra sự cố hay audit. Công ty thường tách <b>mỗi môi trường một VPC</b> (dev, staging, prod), để lỗi ở dev không lan sang prod.</p>'
        + callout('ok', 'Tóm một câu', 'VPC = bạn tự <b>thiết kế mạng</b> trên AWS: dải IP, khu vực công khai và khu vực kín, ai được nói chuyện với ai, đi đường nào. Không có VPC thì không có chỗ để đặt EC2, RDS, ALB.') },
      { h: 'Làm gì', html: ul(['Đổi region sang <b>Tokyo</b>. Search <code>VPC</code> → <b>Create VPC</b> → <b>VPC and more</b>.', 'Name <code>hoc</code>, IPv4 CIDR <code>10.0.0.0/16</code>, No IPv6, Tenancy Default, <b>2 AZ</b>, 2 public + 2 private subnet, <b>NAT gateways: None</b>, bật cả 2 tuỳ chọn DNS.']) },
      { h: 'Các thành phần', html: ul([
        '<b>VPC</b>: mạng riêng, <b>cách ly hoàn toàn</b> với VPC khác. Chỉ vào được khi chính bạn mở cửa: Internet Gateway, peering, hoặc VPN.',
        '<b>CIDR <code>10.0.0.0/16</code></b>: dải IP của mạng. <code>/16</code> = 2 số đầu cố định, nên có 65.536 địa chỉ (<code>10.0.0.0</code>–<code>10.0.255.255</code>). <code>/24</code> = 256 địa chỉ. Mỗi subnet AWS giữ lại 5 địa chỉ.',
        '<b>AZ</b>: một data center riêng trong region. 2 AZ = có <i>chỗ</i> ở 2 nơi (冗長化 jouchouka, làm dự phòng). Tạo VPC thì <b>chưa có server nào</b>.',
        '<b>Subnet</b>: phần nhỏ cắt ra từ VPC, nằm trong một AZ. Máy đặt vào subnet nào thì nhận <b>private IP</b> trong dải của subnet đó.',
        '<b>Internet Gateway</b>: cổng nối VPC với Internet, giống router ở nhà.',
        '<b>NAT Gateway ($)</b>: cửa <b>chỉ cho đi ra</b>, dành cho máy ở private subnet. Gần 45 USD/tháng nếu quên, nên chọn None.',
        '<b>DNS options</b>: cho phép gọi máy bằng tên (vd endpoint của RDS).',
      ]) },
      { h: 'Đọc Resource map', html: ul(['<b>Xanh lá</b> = subnet public, <b>xanh dương</b> = subnet private. Chữ A/C = AZ <code>1a</code>/<code>1c</code>.', 'Trước khi tạo đã có sẵn 1 VPC và 3 subnet: đó là <b>default VPC</b> AWS tạo sẵn ở mỗi region.', 'VPC, subnet, route table, IGW đều <b>miễn phí</b>.']) },
      { h: 'So với DigitalOcean', html: '<p>DigitalOcean làm sẵn cho đơn giản: Droplet tạo ra là có public IP, không có subnet public/private hay route table để chỉnh. AWS đưa từng phần nhỏ để bạn tự lắp: tự chia subnet, tự quyết máy nào được ra Internet. Doanh nghiệp cần sự chi tiết này để giấu database khỏi Internet.</p>' },
    ] },
  { id: 'route-table', group: 'Mạng', title: 'Route table: bảng chỉ đường',
    lead: 'Subnet là "public" vì route table của nó có đường ra Internet Gateway, không phải vì tên.',
    sections: [
      { h: 'Hai dòng của hoc-rtb-public', html: '<div class="tablewrap"><table><thead><tr><th>Destination</th><th>Target</th><th>Đọc thành lời</th></tr></thead><tbody><tr><td><code>10.0.0.0/16</code></td><td><code>local</code></td><td>Gửi tới máy trong VPC thì <b>đi nội bộ</b>. Dòng này AWS không cho xoá.</td></tr><tr><td><code>0.0.0.0/0</code></td><td><code>igw-…</code></td><td>Gửi tới <b>mọi địa chỉ còn lại</b> (Internet) thì đi qua Internet Gateway.</td></tr></tbody></table></div>' },
      { h: 'Khớp cụ thể nhất thắng', html: '<p>Địa chỉ <code>10.0.5.9</code> khớp cả <code>/16</code> lẫn <code>/0</code>. AWS chọn dòng <b>cụ thể hơn</b> (số sau dấu <code>/</code> lớn hơn), nên đi nội bộ. Gói tin gửi về IP nhà bạn không khớp <code>10.0.0.0/16</code>, nên rơi vào dòng <code>0.0.0.0/0</code>.</p>' },
      { h: 'Lối local khác lối igw thế nào', html: '<p><b>Phải có lối thì gói tin mới đi được.</b> Địa chỉ đích không khớp dòng nào thì AWS bỏ gói tin, không có lối mặc định ngầm.</p><div class="tablewrap"><table><thead><tr><th></th><th><code>local</code></th><th><code>igw-…</code></th></tr></thead><tbody><tr><td>Dùng khi đích là</td><td>Máy <b>trong cùng VPC</b> (IP <code>10.0.x.x</code>)</td><td>Máy <b>ngoài Internet</b> (mọi IP khác)</td></tr><tr><td>Gói tin đi đâu</td><td>Đi thẳng trong mạng nội bộ của VPC, không ra ngoài</td><td>Ra cổng Internet Gateway rồi ra Internet</td></tr><tr><td>Có đổi IP không</td><td>Không, giữ IP private</td><td>IGW đổi IP private thành <b>public IP</b>, vì Internet không hiểu IP <code>10.x</code></td></tr><tr><td>Có sẵn không</td><td><b>Tự có</b>, không xoá được</td><td>Phải tự tạo IGW, gắn vào VPC, rồi thêm dòng này</td></tr></tbody></table></div>' + callout('ok', 'Ví von: khu chung cư', 'VPC là một toà chung cư. <code>local</code> là <b>hành lang trong toà</b>: sang phòng hàng xóm thì đi bộ qua hành lang, không cần ra cổng. <code>igw</code> là <b>cổng ra phố</b>: gửi thư ra ngoài phải qua cổng, và bảo vệ ở cổng ghi địa chỉ thật của toà lên thư (đổi sang public IP) để thư trả lời quay về đúng chỗ.') + ul(['EC2 web gọi database <code>10.0.11.5</code>: khớp <code>10.0.0.0/16</code>, nên đi <code>local</code>.', 'EC2 chạy <code>apt install nginx</code> (máy chủ ngoài Internet): chỉ khớp <code>0.0.0.0/0</code>, nên đi ra <code>igw</code>.', '<b>Public subnet</b> thì route table có dòng <code>0.0.0.0/0 → igw</code>. <b>Private subnet</b> thì chỉ có <code>local</code>. Chỉ một dòng này quyết định subnet là public hay private.']) },
      { h: 'Mạng nội bộ (local) để làm gì', html: '<p>Mỗi VPC có một mạng nội bộ riêng. Đây không phải dây cáp riêng thật: AWS dùng chung hạ tầng vật lý rồi <b>tách bằng phần mềm</b>, nên máy trong VPC của bạn chỉ thấy máy trong VPC của bạn.</p>' + ul(['<b>An toàn</b> (lý do chính): database, Redis, máy xử lý job không cần và không nên có mặt trên Internet. Đặt chúng ở private subnet thì chỉ web server gọi được qua <code>local</code>, còn từ Internet không có đường nào chạm tới.', '<b>Nhanh</b>, nhưng <b>vẫn có latency</b>: gói tin vẫn phải chạy qua dây và switch. Cùng AZ thường khoảng 0,1 đến 0,5ms, khác AZ khoảng 1 đến 2ms, còn đi qua Internet thì hàng chục đến hàng trăm ms. Vì vậy app gọi DB hàng trăm lần cho một trang vẫn chậm, dù đi <code>local</code>.', '<b>Rẻ</b>: gửi dữ liệu trong VPC thường miễn phí (khác AZ thì tính phí rất rẻ). Gửi ra Internet thì AWS tính tiền theo GB.', '<b>Địa chỉ ổn định</b>: IP private giữ nguyên khi Stop/Start máy, còn public IP thì đổi. Cấu hình kiểu "web gọi DB ở <code>10.0.11.5</code>" vì thế không bị hỏng.']) + '<pre><code>Internet → [public subnet: Load Balancer]\n           → local → [private subnet: EC2 web]\n           → local → [private subnet: Database]</code></pre><p>Chỉ Load Balancer lộ ra Internet. Mọi thứ phía sau nói chuyện với nhau qua <code>local</code>. Bài 3 và bài 4 sẽ dựng đúng mô hình này.</p>' },
      { h: 'Destination và Target là gì', html: ul(['<b>Destination</b> = địa chỉ mà gói tin <b>muốn tới</b> (ghi trên "phong bì" của gói tin).', '<b>Target</b> = <b>cửa</b> để đi tới đó: <code>local</code> (đi nội bộ trong VPC), <code>igw-…</code> (ra Internet), <code>nat-…</code> (ra ngoài qua NAT), <code>pcx-…</code> (sang VPC khác), <code>vpce-…</code> (đi tắt tới S3).']) },
      { h: 'Route table chỉ được xét khi gói tin đi RA', html: '<p>Mỗi khi máy trong subnet <b>gửi</b> gói tin đi (trả lời request, gọi ra Internet, gọi sang máy khác), AWS dò route table để chọn đường. Gói tin từ Internet <b>đi vào</b> thì không dò route table của subnet: Internet Gateway giao thẳng tới máy.</p>' },
      { h: 'Ví dụ có số: mở web trên EC2', html: '<p>Máy nhà <code>14.x.x.x</code>; EC2 ở <code>tay-public-1a</code> có private IP <code>10.1.1.20</code>, public IP <code>54.1.2.3</code>.</p><pre><code>① Request đi VÀO (không dò route table)\nTrình duyệt gửi "tới 54.1.2.3:80"\n → Internet → tay-igw đổi 54.1.2.3 thành 10.1.1.20\n → NACL → Security Group cho cổng 80 → nginx nhận\n\n② EC2 trả lời (route table làm việc ở đây)\nnginx gửi "tới 14.x.x.x"\n → dò bảng của tay-public-1a:\n     10.1.0.0/16 ? 14.x.x.x không nằm trong 10.1.x.x → không khớp\n     0.0.0.0/0   ? mọi địa chỉ đều khớp            → khớp → tay-igw\n → tay-igw đổi 10.1.1.20 lại thành 54.1.2.3 → Internet → trình duyệt ✓\n\n③ Nếu bảng không có dòng 0.0.0.0/0\nnginx gửi "tới 14.x.x.x" → không khớp dòng nào → gói tin bị bỏ\n→ trình duyệt chờ mãi → TIMEOUT (vào được nhưng không trả lời được)</code></pre><p>Chiều đi ra khác: EC2 chạy <code>apt update</code> gửi tới <code>91.189.91.81</code> → khớp <code>0.0.0.0/0</code> → ra IGW. EC2 gọi database <code>10.1.11.50</code> → khớp cả hai dòng → chọn dòng <b>cụ thể hơn</b> <code>/16</code> → đi <code>local</code>.</p>' },
      { h: 'Vì sao chiều vào không cần route table', html: '<p>Route table chỉ làm một việc: <b>chọn đường</b>. Ở chiều vào thì không có gì để chọn, vì đích chính là máy đang nằm trong VPC. Ở chiều ra thì nhiều lựa chọn: nội bộ, Internet, NAT, VPC khác, S3.</p><p>Ví với bưu điện: thư <b>gửi đến</b> nhà bạn thì bưu tá giao thẳng tới địa chỉ, nhưng bảo vệ chung cư (NACL) và cửa căn hộ (Security Group) vẫn kiểm tra. Thư <b>bạn gửi đi</b> thì phải chọn đường: trong khu thì đưa tận tay, đi tỉnh khác thì ra bưu cục.</p><pre><code>Chiều vào vẫn có 3 lớp kiểm tra:\n ① Internet Gateway: public IP này có ghép với máy nào không? (không có → bỏ)\n ② NACL inbound: subnet có cho cổng này không?\n ③ Security Group inbound: máy có cho cổng này không?</code></pre>' },
      { h: 'Route table chỉ đường, không chặn', html: '<div class="tablewrap"><table><thead><tr><th></th><th>Route table</th><th>Security Group / NACL</th></tr></thead><tbody><tr><td>Trả lời câu hỏi</td><td>Đi tới đó <b>bằng đường nào</b>?</td><td>Có <b>được phép</b> qua không?</td></tr><tr><td>Thiếu thì</td><td>Không có đường → gói tin lạc mất</td><td>Bị cấm → gói tin bị chặn</td></tr><tr><td>Xét theo cổng (80, 22…)</td><td>Không, chỉ nhìn địa chỉ đích</td><td>Có</td></tr><tr><td>Chiều</td><td>Ra</td><td>Vào và ra</td></tr></tbody></table></div>' + callout('warn', 'Cả hai đều ra timeout', 'Thiếu đường (route table) và bị chặn (Security Group/NACL) đều làm trình duyệt báo timeout. Khi gặp timeout thì phải xem cả hai chỗ. Private subnet <b>dựa vào</b> việc không có đường để giữ kín, nhưng muốn chặn có chủ đích (chỉ cho 443, cấm một IP) thì dùng Security Group/NACL.') },
      { h: 'Private subnet', html: '<p>Route table của private subnet chỉ có dòng <code>local</code> (và đường tắt tới S3 qua VPC endpoint). Không có đường ra Internet, nên dù máy có public IP thì người ngoài vẫn không vào được. Đó là lý do database luôn đặt ở private subnet.</p>' },
    ] },
  { id: 'ip', group: 'Mạng', title: 'Private IP và public IP',
    lead: 'Subnet cấp số máy lẻ. AWS cấp thêm số điện thoại thật. Internet Gateway là tổng đài nối hai số.',
    sections: [
      { h: 'Hai loại IP', html: '<div class="tablewrap"><table><thead><tr><th></th><th>Private IP <code>10.0.3.176</code></th><th>Public IP <code>52.x.x.x</code></th></tr></thead><tbody><tr><td>Ai cấp</td><td><b>Subnet</b></td><td><b>AWS</b>, từ kho IP công khai, khi bật Auto-assign public IP</td></tr><tr><td>Giống</td><td>Số máy lẻ trong công ty</td><td>Số điện thoại thật</td></tr><tr><td>Duy nhất</td><td>Chỉ trong một VPC. VPC khác dùng trùng cũng được (trừ khi nối 2 VPC với nhau)</td><td>Trên toàn Internet</td></tr><tr><td>Máy có thấy không</td><td>Có (<code>ip a</code>)</td><td><b>Không</b>. Nó nằm ở Internet Gateway</td></tr></tbody></table></div>' },
      { h: 'Internet Gateway ghép cặp hai IP', html: '<pre><code>Gọi 52.x.x.x  →  IGW đổi thành 10.0.3.176  →  EC2 nhận\nEC2 trả lời từ 10.0.3.176  →  IGW đổi lại 52.x.x.x  →  Internet</code></pre><p>Cách đổi địa chỉ này gọi là NAT. Router wifi ở nhà cũng làm đúng việc đó. Stop rồi Start máy thì public IP đổi; muốn giữ cố định thì dùng Elastic IP (tính tiền khoảng 0,005 USD/giờ).</p>' },
    ] },
  { id: 'goi-tin', group: 'Mạng', title: 'Gói tin đi qua những lớp nào',
    lead: 'Chiều đi vào và chiều trả lời về gặp những lớp khác nhau.',
    sections: [
      { h: 'Chiều đi vào', html: '<pre><code>Trình duyệt → Internet\n → ① Internet Gateway (đổi public IP → private IP)\n → ② NACL của subnet        (mặc định cho qua hết)\n → ③ Security Group, inbound  ← lỗi 1 bị chặn ở đây\n → ④ Ubuntu / nginx có nghe cổng 80 không  ← lỗi 2 ở đây</code></pre>' },
      { h: 'Chiều trả lời về', html: '<pre><code>nginx trả lời\n → ③ Security Group (stateful: tự cho ra)\n → ② NACL\n → ⑤ Route table: gói tin gửi về IP nhà bạn đi đường nào?  ← thí nghiệm 3 ở đây\n → ① Internet Gateway → Internet → trình duyệt</code></pre>' },
      { h: 'Security Group và NACL', html: '<div class="tablewrap"><table><thead><tr><th></th><th>Security Group</th><th>NACL</th></tr></thead><tbody><tr><td>Gắn với</td><td>Từng máy</td><td>Cả subnet</td></tr><tr><td>Loại rule</td><td>Chỉ có <b>Allow</b>; không có rule thì bị chặn</td><td>Allow và Deny, xét theo số thứ tự</td></tr><tr><td>Có nhớ kết nối không</td><td><b>Stateful</b>: đã cho vào thì gói trả lời tự được cho ra</td><td><b>Stateless</b>: phải mở cả hai chiều</td></tr><tr><td>Thực tế</td><td>Cấu hình chủ yếu ở đây</td><td>Thường để mặc định</td></tr></tbody></table></div>' },
      { h: 'Một inbound rule gồm gì', html: ul(['<b>Type</b>: mẫu điền sẵn (HTTP = TCP 80, SSH = TCP 22).', '<b>Protocol</b>: TCP, UDP, ICMP.', '<b>Port</b>: 22, 80, 443, 3306…', '<b>Source</b>: <code>0.0.0.0/0</code> (mọi người), <code>x.x.x.x/32</code> (đúng 1 IP), <code>10.0.0.0/16</code>, hoặc <b>một Security Group khác</b> (vd database chỉ nhận kết nối từ <code>hoc-web-sg</code>).', 'Security Group không biết gói tin là của chương trình nào, chỉ nhìn giao thức, cổng và IP nguồn.']) },
      { h: 'Muốn người ngoài vào được máy', html: callout('ok', 'Cần đủ 3 thứ', 'Subnet có đường ra IGW + máy có public IP + Security Group mở cổng. Thiếu một thứ là không vào được. Thử tắt từng thứ trong trang <a href="#mo-phong">Mô phỏng</a>.') },
    ] },

  // ---------- EC2 ----------
  { id: 'ec2', group: 'EC2', title: 'Tạo EC2 Ubuntu + nginx',
    lead: 'EC2 là máy chủ ảo thuê theo giờ. VPC là mạng, EC2 là máy cắm vào mạng đó.',
    sections: [
      { h: 'Form Launch instance', html: ul([
        'Name <code>hoc-web-1</code>, AMI <b>Ubuntu 24.04</b> (đã quen; Amazon Linux thuộc dòng RHEL, mặc định của AWS, sẽ thử sau), <code>t3.micro</code>, Number of instances <b>1</b> (số máy giống hệt nhau tạo cùng lúc).',
        'Key pair <code>hoc-key</code> (ED25519, .pem) → lưu ở <code>~/.ssh/</code> trong WSL → <code>chmod 400</code>. Không commit, không gửi qua chat.',
        'Network → <b>Edit</b>: form mặc định chọn <b>default VPC</b>, phải đổi sang <code>hoc-vpc</code> → subnet <code>public1</code> → <b>Auto-assign public IP: Enable</b>.',
        'Security Group <code>hoc-web-sg</code>: SSH 22 nguồn <b>My IP</b> (<code>/32</code> = đúng 1 IP); HTTP 80 nguồn <b>Anywhere</b>.',
        'Advanced details → <b>User data</b> (script chạy một lần lúc máy khởi động lần đầu):',
      ]) + '<pre><code>#!/bin/bash\napt update &amp;&amp; apt install -y nginx\necho "&lt;h1&gt;Xin chao tu $(hostname)&lt;/h1&gt;" &gt; /var/www/html/index.html\nsystemctl enable --now nginx</code></pre>' },
      { h: 'SSH từ nhiều nơi', html: ul(['EC2 mặc định <b>không cho đăng nhập bằng mật khẩu</b>, chỉ bằng key, nên bot không dò được. Nhưng mở cổng 22 cho mọi người vẫn bị quét liên tục.', 'Đi nhiều chỗ thì: <b>Session Manager</b> (không mở cổng 22; cần IAM role <code>AmazonSSMManagedInstanceCore</code>), hoặc VPN WireGuard, hoặc sửa lại rule "My IP" mỗi lần đổi chỗ.']) },
    ] },
  { id: 'loi-timeout', group: 'EC2', title: 'Lỗi 1: ERR_CONNECTION_TIMED_OUT', bug: true,
    lead: 'Trình duyệt quay một lúc lâu rồi mới báo lỗi.',
    sections: [
      { h: 'Nguyên nhân', html: ul(['Kiểm tra bằng CLI: <code>aws ec2 describe-security-groups</code> → chỉ có rule SSH 22. Rule HTTP 80 bị sót lúc tạo.', 'Security Group <b>bỏ gói tin lặng lẽ</b> (DROP), không trả lời gì. Trình duyệt không biết là bị chặn hay mạng chậm nên cứ chờ, hết giờ thì báo timeout.', 'Gói tin <b>chưa hề tới máy</b>, nên log nginx không có gì.']) },
      { h: 'Sửa', html: '<p>EC2 → Security Groups → <code>hoc-web-sg</code> → Edit <b>inbound</b> rules → Add rule HTTP, nguồn Anywhere-IPv4 → Save. Có hiệu lực ngay, không cần khởi động lại máy.</p>' },
      { h: 'Ghi nhớ', html: callout('warn', 'Timeout = không có phản hồi nào', 'Gói tin bị chặn hoặc bị lạc trên đường: Security Group, NACL, route table thiếu đường, sai IP, máy đang tắt, hoặc IP nhà đã đổi nên không còn khớp rule "My IP".') },
    ] },
  { id: 'loi-refused', group: 'EC2', title: 'Lỗi 2: ERR_CONNECTION_REFUSED', bug: true,
    lead: 'Báo lỗi ngay lập tức. Lỗi đổi kiểu là tin tốt: gói tin đã qua được Security Group.',
    sections: [
      { h: 'Nguyên nhân', html: ul(['Gói tin <b>tới được máy</b>, nhưng không có chương trình nào nghe cổng 80, nên hệ điều hành trả lời ngay: từ chối.', 'Kiểm tra bằng CLI: <code>aws ec2 describe-instance-attribute --attribute userData</code> → <code>None</code>. Chưa dán User data, nên nginx chưa được cài.']) },
      { h: 'Sửa', html: '<pre><code>ssh -i ~/.ssh/hoc-key.pem ubuntu@&lt;public-ip&gt;\nsudo ss -tlnp            # chưa có gì nghe :80\nsudo apt update &amp;&amp; sudo apt install -y nginx\nsystemctl status nginx   # active (running)\nsudo ss -tlnp            # đã có :80</code></pre>' },
      { h: 'Ghi nhớ', html: callout('warn', 'Refused = tới máy rồi, nhưng dịch vụ không chạy', 'Không phải lỗi quyền. Lỗi quyền là <code>Permission denied</code> (SSH sai key) hoặc <code>403 Forbidden</code>: tới được dịch vụ nhưng không được phép.') },
    ] },
  { id: 'thi-nghiem-3', group: 'EC2', title: 'Thí nghiệm 3: xoá route ra Internet', bug: true,
    lead: 'Tự tay phá để thấy route table quan trọng thế nào.',
    sections: [
      { h: 'Làm gì', html: ul(['VPC → Route tables → <code>hoc-rtb-public</code> → Routes → Edit routes → <b>Remove</b> dòng <code>0.0.0.0/0 → igw</code> → Save.']) },
      { h: 'Kết quả', html: ul(['Web: <b>timeout</b>, giống lỗi 1, dù nguyên nhân khác hẳn.', 'SSH: cũng timeout. Mất luôn đường để vào máy sửa.', 'Gói tin <b>vào được</b> tới nginx (Security Group cho qua), nginx có trả lời, nhưng <b>gói trả lời không có đường về</b> Internet nên bị bỏ.']) },
      { h: 'Phân biệt với lỗi 1', html: '<div class="tablewrap"><table><thead><tr><th></th><th>Dừng ở</th><th>Tới được nginx chưa</th><th>Log nginx</th></tr></thead><tbody><tr><td>Lỗi 1 (thiếu rule 80)</td><td>Security Group, chiều vào</td><td>Chưa</td><td>Không có dòng nào</td></tr><tr><td>Thí nghiệm 3 (xoá route)</td><td>Route table, chiều về</td><td>Rồi</td><td>Có dòng request</td></tr></tbody></table></div><p>Cả hai đều timeout. Muốn phân biệt thì xem log. Nhưng lúc mất route thì SSH cũng không vào được, nên phải dùng Session Manager hoặc VPN.</p>' },
      { h: 'Trả lại', html: '<p>Edit routes → Add route → Destination <code>0.0.0.0/0</code>, Target <b>Internet Gateway</b> → <code>hoc-igw</code> → Save.</p>' },
    ] },
  { id: 'deploy', group: 'EC2', title: 'Deploy trang này lên EC2 (đường dẫn con)',
    lead: 'Mỗi project một thư mục và một file cấu hình nginx riêng. Trang gốc "/" để dành cho project chính.',
    sections: [
      { h: 'Cấu trúc thư mục', html: '<pre><code>/var/www/html/                           # trang gốc "/"\n/var/www/sites/aws-hoc-setup/            # project này (git clone)\n/etc/nginx/snippets/aws-hoc-setup.conf   # cấu hình nginx riêng</code></pre>' },
      { h: 'Cấu hình nginx', html: '<pre><code>location = /aws-hoc-setup { return 301 /aws-hoc-setup/; }\nlocation /aws-hoc-setup/ {\n    alias /var/www/sites/aws-hoc-setup/;\n    index index.html;\n    location ~ /\\.git { deny all; }   # chặn tải thư mục .git\n}</code></pre><p>Gắn vào site mặc định: thêm dòng <code>include snippets/aws-hoc-setup.conf;</code> ngay sau <code>server_name _;</code>. Chạy <code>sudo nginx -t</code> để kiểm tra cú pháp trước, rồi <code>sudo systemctl reload nginx</code> (reload không làm rớt kết nối đang có).</p>' },
      { h: 'Cập nhật', html: '<pre><code>git -C /var/www/sites/aws-hoc-setup pull</code></pre><p>Đây là file tĩnh nên không cần reload nginx. Terminate EC2 thì mất hết, phải dựng lại.</p>' },
    ] },
  { id: 'don-dep', group: 'EC2', title: 'Thí nghiệm tiếp theo và dọn dẹp',
    lead: 'Mỗi lần chỉ phá một thứ, đoán trước rồi mới thử.',
    sections: [
      { h: 'Còn lại', html: ul(['Tạo máy ở private subnet có bật public IP: vào được không?', 'Tạo máy ở public subnet nhưng tắt public IP.', 'Đổi rule SSH sang một IP sai.']) },
      { h: 'Dọn dẹp', html: ul(['EC2 → Instances → <b>Terminate</b>. Stop vẫn bị tính tiền ổ đĩa và public IP.', 'VPC, subnet, route table, Security Group để lại được, chúng miễn phí.']) },
    ] },

  // ---------- Học kỹ VPC + EC2 ----------
  { id: 'lo-trinh', group: 'Học kỹ VPC + EC2', title: 'Lộ trình 12 bài',
    lead: 'Hầu hết ứng dụng trên AWS đều cần VPC, và EC2 là loại máy chủ phổ biến nhất. Mỗi bài gồm: hiểu khái niệm → làm lab → tự phá rồi sửa.',
    sections: [
      { h: 'Danh sách bài', html: '<div class="tablewrap"><table><thead><tr><th>#</th><th>Bài</th><th>Học được</th><th>Chi phí</th></tr></thead><tbody>'
        + [['bai-1', 'Tự dựng VPC bằng tay', 'Từng mảnh VPC nối với nhau thế nào', 'Miễn phí'],
           ['bai-2', 'Default VPC và VPC tự dựng', 'Vì sao default VPC tạo máy là có public IP ngay', 'Miễn phí'],
           ['bai-3', 'Security Group sâu hơn', 'Nguồn là SG khác, outbound, stateful', 'EC2 vài cent'],
           ['bai-4', 'NACL', 'Deny, stateless, cổng tạm', 'EC2 vài cent'],
           ['bai-5', 'Private subnet + NAT + Session Manager', 'Máy kín vẫn đi ra được; vào máy không cần SSH', 'NAT ~0,06 USD/giờ, xoá ngay'],
           ['bai-6', 'VPC Flow Logs', 'Xem ACCEPT/REJECT để điều tra timeout', 'Vài cent'],
           ['bai-7', 'VPC endpoint + peering', 'Đi tắt tới S3; nối 2 VPC; lỗi trùng dải IP', 'Miễn phí (gateway endpoint)'],
           ['bai-8', 'Vòng đời EC2', 'Stop/Start/Reboot/Terminate, Elastic IP, EBS', 'Vài cent'],
           ['bai-9', 'Bên trong EC2', 'cloud-init, metadata IMDSv2, IAM role', 'Vài cent'],
           ['bai-10', 'EBS và AMI', 'Thêm ổ đĩa, snapshot, tạo máy từ AMI', 'Snapshot vài cent/GB'],
           ['bai-11', 'ALB + 2 EC2 ở 2 AZ', 'Chia tải, health check, chịu lỗi', 'ALB ~0,025 USD/giờ'],
           ['bai-12', 'Auto Scaling', 'Launch template, máy chết thì tự tạo lại', 'Như EC2']]
          .map(([id, t, l, c], i) => `<tr><td>${i + 1}</td><td><a href="#${id}">${t}</a></td><td>${l}</td><td>${c}</td></tr>`).join('')
        + '</tbody></table></div>' },
      { h: 'Cách học mỗi bài', html: ul(['Đọc phần "Hiểu trước" của bài.', 'Làm lab, ghi lại sai lầm gặp phải (gửi ảnh để cập nhật vào trang).', 'Làm phần "Tự phá": <b>đoán trước</b> rồi mới thử, thử xong trả lại như cũ.', 'Học xong thì xoá tài nguyên tốn tiền (EC2, NAT, ALB, snapshot).']) },
    ] },
  { id: 'bai-1', group: 'Học kỹ VPC + EC2', title: 'Bài 1: Tự dựng VPC bằng tay',
    lead: 'Wizard "VPC and more" làm hết nên khó thấy từng mảnh. Lần này tự tạo và tự nối từng thứ. Toàn bộ miễn phí.',
    sections: [
      { h: 'Hiểu trước', html: '<p>Một subnet là "public" khi có đủ chuỗi: <b>IGW đã attach vào VPC</b> → <b>route table có <code>0.0.0.0/0 → IGW</code></b> → <b>subnet được gắn vào route table đó</b>. Thiếu một mắt xích là subnet vẫn kín.</p>' },
      { h: 'Lab', html: '<ol><li><b>VPC</b>: Create VPC → <b>VPC only</b> → <code>tay-vpc</code>, CIDR <code>10.1.0.0/16</code>. Dùng <code>10.1</code> để không trùng <code>hoc-vpc</code>, chuẩn bị cho bài peering.</li><li><b>Subnet</b>: <code>tay-public-1a</code> <code>10.1.1.0/24</code> và <code>tay-private-1a</code> <code>10.1.11.0/24</code>, cùng AZ <code>ap-northeast-1a</code>.</li><li>Mở Route tables: AWS đã tự tạo <b>main route table</b>, chỉ có dòng <code>local</code>. Lúc này cả 2 subnet đều đang kín.</li><li><b>IGW</b>: tạo <code>tay-igw</code> → Actions → <b>Attach to VPC</b> <code>tay-vpc</code>.</li><li><b>Route table</b> <code>tay-rtb-public</code>: thêm route <code>0.0.0.0/0 → tay-igw</code>; tab Subnet associations → gắn <code>tay-public-1a</code>.</li><li><code>tay-public-1a</code> → Edit subnet settings → tick <b>Enable auto-assign public IPv4</b>.</li><li>So sánh Resource map của <code>tay-vpc</code> với <code>hoc-vpc</code>.</li></ol>' },
      { h: 'Tự phá', html: ul(['Bỏ gắn <code>tay-public-1a</code> khỏi <code>tay-rtb-public</code>: ô subnet trên Resource map đổi màu gì?', 'Detach IGW: AWS có cho detach không khi route vẫn đang trỏ tới nó? Route đó hiện trạng thái gì (gợi ý: <i>Blackhole</i>)?']) },
      { h: 'Lưu ý khi tạo bằng "VPC only"', html: callout('warn', 'Mới tạo thì có 0 subnet và DNS hostnames đang tắt', '"VPC only" chỉ tạo VPC và 4 thứ đi kèm: main route table (chỉ có <code>local</code>), main NACL, default Security Group, DHCP option set. <b>Subnet thì phải tự tạo</b> (bước 2). <b>DNS hostnames</b> mặc định <b>Disabled</b> (wizard thì bật sẵn): Actions → Edit VPC settings → tick Enable DNS hostnames. Mục này cần cho RDS và VPC endpoint sau này.') },
      { h: 'Câu hỏi tự kiểm tra', html: ul(['Bỏ qua bước gắn route table thì subnet là public hay private?', 'Có route tới IGW nhưng IGW chưa attach thì sao?', 'Vì sao subnet do wizard tạo không tự cấp public IP?']) },
    ] },
  { id: 'bai-2', group: 'Học kỹ VPC + EC2', title: 'Bài 2: Default VPC và VPC tự dựng',
    lead: 'Mỗi region có sẵn một default VPC, dựng sẵn để tạo máy là chạy được ngay.',
    sections: [
      { h: 'Hiểu trước', html: ul(['Default VPC: CIDR <code>172.31.0.0/16</code>, mỗi AZ một subnet <code>/20</code>, <b>mọi subnet đều public</b> và đều bật tự cấp public IP.', 'Tiện để thử nhanh, nhưng công ty không dùng cho hệ thống thật vì không có khu kín.']) },
      { h: 'Lab', html: '<ol><li>Mở default VPC: xem CIDR, các subnet, route table (có <code>0.0.0.0/0 → igw</code>), Internet Gateway.</li><li>Mở Subnet settings: "Auto-assign public IPv4" đang bật.</li><li>Lập bảng so sánh default VPC, <code>hoc-vpc</code> và <code>tay-vpc</code>.</li></ol>' },
      { h: 'Tự phá', html: ul(['Tạo EC2 nhưng quên đổi VPC (form mặc định chọn default VPC): máy nằm ở đâu, có public IP không? Đây là lỗi rất hay gặp.']) },
    ] },
  { id: 'bai-3', group: 'Học kỹ VPC + EC2', title: 'Bài 3: Security Group sâu hơn',
    lead: 'Cách hệ thống thật mở cửa: theo Security Group, không theo IP.',
    sections: [
      { h: 'Hiểu trước', html: ul(['Nguồn của rule có thể là <b>một Security Group khác</b>: "máy nào thuộc <code>web-sg</code> thì được vào cổng 3306". Thêm hay bớt máy web thì không phải sửa rule.', 'Outbound mặc định cho phép hết. Xoá hết rule outbound thì máy không đi ra được, nhưng vẫn <b>trả lời</b> được các kết nối đi vào (stateful).', 'Một máy có thể gắn nhiều Security Group; các rule được cộng lại.']) },
      { h: 'Lab', html: '<ol><li>Tạo <code>app-sg</code> và <code>db-sg</code>. Trong <code>db-sg</code>: TCP 3306, nguồn = <code>app-sg</code>.</li><li>Hai EC2: máy A gắn <code>app-sg</code>, máy B gắn <code>db-sg</code>, chạy <code>nc -l 3306</code> giả làm database.</li><li>Từ A: <code>nc -vz &lt;IP riêng của B&gt; 3306</code> → thành công. Từ một máy C không có <code>app-sg</code> → timeout.</li></ol>' },
      { h: 'Tự phá', html: ul(['Xoá hết outbound rule của A: <code>curl google.com</code> ra sao? SSH vào A còn được không? Vì sao?']) },
    ] },
  { id: 'bai-4', group: 'Học kỹ VPC + EC2', title: 'Bài 4: NACL',
    lead: 'Firewall ở tầng subnet: có Deny, xét theo số thứ tự, và không nhớ kết nối.',
    sections: [
      { h: 'Hiểu trước', html: ul(['Rule xét từ số nhỏ tới lớn, khớp rule nào thì dừng ở rule đó. Dòng <code>*</code> cuối cùng là Deny tất cả.', '<b>Stateless</b>: gói trả lời đi ra bằng một <b>cổng tạm</b> (1024–65535), nên outbound phải mở dải cổng đó.']) },
      { h: 'Lab', html: '<ol><li>Tạo NACL riêng cho subnet public của <code>tay-vpc</code>. NACL mới tạo mặc định Deny hết.</li><li>Inbound: cho 80, 22. Outbound: <b>chỉ</b> cho 80 → web bị timeout dù Security Group đã mở.</li><li>Outbound thêm 1024–65535 → web chạy.</li><li>Thêm rule Deny IP nhà bạn với số nhỏ hơn: bị chặn.</li></ol>' },
      { h: 'Tự phá', html: ul(['Đặt rule Deny với số lớn hơn rule Allow: Deny có còn tác dụng không?']) },
    ] },
  { id: 'bai-5', group: 'Học kỹ VPC + EC2', title: 'Bài 5: Private subnet + NAT + Session Manager',
    lead: 'Mô hình thật: máy chủ nằm ở khu kín, vẫn tải được gói, và vào máy không cần SSH.',
    sections: [
      { h: 'Hiểu trước', html: ul(['Máy ở private subnet không có đường ra Internet nên <code>apt update</code> bị treo.', 'NAT Gateway đặt ở <b>public</b> subnet. Route table của private subnet thêm <code>0.0.0.0/0 → nat-…</code>.', 'Session Manager: EC2 có IAM role <code>AmazonSSMManagedInstanceCore</code>, agent SSM đi ra ngoài gọi về AWS, nên không cần mở cổng 22.']) },
      { h: 'Lab', html: '<ol><li>Tạo IAM role <code>hoc-ec2-ssm</code>.</li><li>EC2 ở private subnet, gắn role, không có public IP.</li><li>Connect → Session Manager: chưa vào được, vì agent không có đường ra ngoài.</li><li>Tạo NAT Gateway, thêm route → Session Manager vào được, <code>apt update</code> chạy được.</li><li><b>Xoá NAT Gateway và Elastic IP</b> ngay sau khi học xong.</li></ol>' },
      { h: 'Tự phá', html: ul(['Đặt NAT Gateway nhầm vào private subnet: chuyện gì xảy ra?']) },
    ] },
  { id: 'bai-6', group: 'Học kỹ VPC + EC2', title: 'Bài 6: VPC Flow Logs',
    lead: 'Camera ghi lại mọi kết nối ra vào: biết gói tin bị chặn hay đã đi qua.',
    sections: [
      { h: 'Hiểu trước', html: ul(['Mỗi dòng log có: IP nguồn và đích, cổng, giao thức, và <b>ACCEPT/REJECT</b>.', 'REJECT do Security Group hay NACL chặn. Không thấy dòng log nào nghĩa là gói tin chưa hề tới nơi (sai IP, sai route).']) },
      { h: 'Lab', html: '<ol><li>Bật Flow Logs cho <code>hoc-vpc</code> → gửi về CloudWatch Logs.</li><li>Xoá rule HTTP, gọi web → tìm dòng REJECT cổng 80.</li><li>Dùng Logs Insights lọc theo IP nhà bạn.</li></ol>' },
      { h: 'Tự phá', html: ul(['Đọc log của lỗi 1 (thiếu rule 80) và thí nghiệm 3 (xoá route): log của hai trường hợp khác nhau thế nào?']) },
    ] },
  { id: 'bai-7', group: 'Học kỹ VPC + EC2', title: 'Bài 7: VPC endpoint + peering',
    lead: 'Đi tắt tới dịch vụ AWS, và nối hai mạng riêng với nhau.',
    sections: [
      { h: 'Hiểu trước', html: ul(['Gateway endpoint (S3, DynamoDB): miễn phí. Máy ở private subnet đọc được S3 mà không cần NAT.', 'Peering: nối 2 VPC; <b>dải IP không được trùng</b>; phải thêm route ở <b>cả hai bên</b>; không bắc cầu qua VPC thứ ba được.']) },
      { h: 'Lab', html: '<ol><li>Peering <code>hoc-vpc</code> (10.0) ↔ <code>tay-vpc</code> (10.1) → Accept → thêm route hai chiều → ping IP riêng.</li><li>Thử tạo một VPC <code>10.0.0.0/16</code> rồi peering với <code>hoc-vpc</code> → bị lỗi trùng dải.</li></ol>' },
      { h: 'Tự phá', html: ul(['Chỉ thêm route ở một bên: ping ra sao?']) },
    ] },
  { id: 'bai-8', group: 'Học kỹ VPC + EC2', title: 'Bài 8: Vòng đời EC2',
    lead: 'Stop, Start, Reboot, Terminate: cái gì còn, cái gì mất.',
    sections: [
      { h: 'Hiểu trước', html: '<div class="tablewrap"><table><thead><tr><th>Thao tác</th><th>Public IP</th><th>Private IP</th><th>Ổ EBS</th><th>Tính tiền</th></tr></thead><tbody><tr><td>Reboot</td><td>Giữ</td><td>Giữ</td><td>Giữ</td><td>Như cũ</td></tr><tr><td>Stop → Start</td><td><b>Đổi</b></td><td>Giữ</td><td>Giữ</td><td>Lúc stop: vẫn tính ổ + IP</td></tr><tr><td>Terminate</td><td>Mất</td><td>Mất</td><td>Mất (mặc định)</td><td>Hết</td></tr><tr><td>Elastic IP</td><td>Cố định</td><td></td><td></td><td>~0,005 USD/giờ</td></tr></tbody></table></div>' },
      { h: 'Lab', html: '<ol><li>Ghi lại IP của <code>hoc-web-1</code>, tạo một file trong máy → Stop → Start → so sánh IP, file còn không.</li><li>Gắn Elastic IP → Stop/Start → IP giữ nguyên. <b>Release</b> Elastic IP khi xong.</li><li>Bật Termination protection rồi thử Terminate.</li></ol>' },
      { h: 'Tự phá', html: ul(['Stop máy đang chạy web: trang <code>/aws-hoc-setup/</code> báo lỗi gì? Start lại thì link cũ còn dùng được không?']) },
    ] },
  { id: 'bai-9', group: 'Học kỹ VPC + EC2', title: 'Bài 9: Bên trong EC2',
    lead: 'cloud-init, metadata và IAM role: máy tự biết mình là ai.',
    sections: [
      { h: 'Hiểu trước', html: ul(['User data được <b>cloud-init</b> chạy lúc máy khởi động lần đầu. Log ở <code>/var/log/cloud-init-output.log</code>. Script lỗi thì đọc log này.', 'Metadata: <code>http://169.254.169.254</code> trả lời máy đang ở AZ nào, IP gì, role gì. IMDSv2 bắt lấy token trước.', 'IAM role gắn vào EC2 → AWS cấp key tạm qua metadata, tự xoay vòng, không phải lưu access key.']) },
      { h: 'Lab', html: '<pre><code>TOKEN=$(curl -sX PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60")\ncurl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4\ncurl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/availability-zone</code></pre><ol><li>Gắn role chỉ đọc S3 → trong máy chạy <code>aws s3 ls</code>, không cần cấu hình key.</li><li>Tạo máy với User data viết sai → đọc <code>cloud-init-output.log</code> để tìm lỗi.</li></ol>' },
      { h: 'Tự phá', html: ul(['Gỡ role ra khỏi máy: <code>aws s3 ls</code> báo lỗi gì?']) },
    ] },
  { id: 'bai-10', group: 'Học kỹ VPC + EC2', title: 'Bài 10: EBS và AMI',
    lead: 'Ổ đĩa tách rời máy; ảnh máy (AMI) để dựng hàng loạt máy giống hệt nhau.',
    sections: [
      { h: 'Hiểu trước', html: ul(['EBS là ổ mạng nằm trong <b>một AZ</b>, gắn được vào máy cùng AZ.', 'Snapshot lưu trên S3, khôi phục được ở AZ khác.', 'AMI = snapshot + cấu hình. Máy đã cài sẵn nginx + code → tạo AMI → mọi máy mới tạo từ đó đều giống hệt.']) },
      { h: 'Lab', html: '<ol><li>Tạo ổ 1 GiB → attach → <code>lsblk</code>, <code>mkfs</code>, <code>mount</code>, ghi file.</li><li>Snapshot → tạo ổ mới từ snapshot ở AZ khác.</li><li>Tạo AMI từ <code>hoc-web-1</code> → launch máy mới từ AMI → trang <code>/aws-hoc-setup/</code> có sẵn luôn.</li><li>Xoá AMI, snapshot và ổ thừa.</li></ol>' },
      { h: 'Tự phá', html: ul(['Attach ổ ở AZ <code>1c</code> vào máy ở <code>1a</code>: AWS báo gì?']) },
    ] },
  { id: 'bai-11', group: 'Học kỹ VPC + EC2', title: 'Bài 11: ALB + 2 EC2 ở 2 AZ',
    lead: 'Chuyển sang mô hình thật: người dùng gọi ALB, ALB chia request cho các máy.',
    sections: [
      { h: 'Hiểu trước', html: ul(['ALB đặt ở 2 public subnet. Target group chứa các EC2. Health check gọi <code>/</code> định kỳ, máy không trả 200 thì bị loại.', 'Security Group của EC2 chỉ cho phép <b>Security Group của ALB</b> vào cổng 80.']) },
      { h: 'Lab', html: '<ol><li>2 EC2 (dùng AMI bài 10), một ở <code>1a</code>, một ở <code>1c</code>. Trang chủ in ra hostname.</li><li>Target group + ALB → mở DNS của ALB, tải lại nhiều lần thấy hostname đổi qua lại.</li><li>Stop nginx ở một máy → health check fail → mọi request đi sang máy còn lại.</li><li><b>Xoá ALB</b> khi xong.</li></ol>' },
      { h: 'Tự phá', html: ul(['Tắt nginx ở cả 2 máy: ALB trả mã gì (502 hay 503)?', 'Security Group của EC2 không cho ALB vào: health check báo gì?']) },
    ] },
  { id: 'bai-12', group: 'Học kỹ VPC + EC2', title: 'Bài 12: Auto Scaling',
    lead: 'Máy chết thì tự tạo máy mới; tải tăng thì tự thêm máy.',
    sections: [
      { h: 'Hiểu trước', html: ul(['Launch template = công thức tạo máy (AMI, loại máy, Security Group, User data).', 'Auto Scaling group: giữ số máy trong khoảng min/max, gắn vào target group của ALB.']) },
      { h: 'Lab', html: '<ol><li>Launch template từ AMI bài 10.</li><li>ASG min 2 / max 3, 2 AZ, gắn target group.</li><li>Terminate tay một máy → ASG tự tạo máy mới.</li><li>Đặt desired = 0, xoá ASG + ALB khi xong.</li></ol>' },
      { h: 'Tự phá', html: ul(['Launch template có User data lỗi: ASG tạo máy, health check fail, rồi sao? (gợi ý: tạo đi tạo lại liên tục)']) },
    ] },

  // ---------- Công cụ ----------
  { id: 'mo-phong', group: 'Công cụ', title: 'Mô phỏng đường đi của request', sim: true,
    lead: 'Bỏ tick một điều kiện để xem request dừng ở đâu và trình duyệt báo lỗi gì.',
    sections: [{ h: 'Bộ mô phỏng', html: '<div class="sim"><div class="toggles" id="toggles"></div><div class="path" id="path" aria-live="polite"></div><div class="result" id="result"></div></div>' }] },
  { id: 'doc-loi', group: 'Công cụ', title: 'Bảng đọc lỗi',
    lead: 'Nhìn thông báo lỗi là khoanh được tầng bị hỏng. Đây là kỹ năng 障害対応 (shougai taiou, xử lý sự cố).',
    sections: [
      { h: 'Theo mức độ đi được xa', html: '<div class="tablewrap"><table><thead><tr><th>Lỗi</th><th>Gói tin đi được tới đâu</th><th>Thường do</th><th>Kiểm tra</th></tr></thead><tbody>'
        + '<tr><td><code>ERR_NAME_NOT_RESOLVED</code></td><td>Chưa đi được: không đổi được tên miền ra IP</td><td>Sai DNS record</td><td><code>dig ten-mien</code></td></tr>'
        + '<tr><td><code>ERR_CONNECTION_TIMED_OUT</code></td><td>Không tới được, hoặc không về được</td><td>Security Group, NACL, route table, sai IP, máy tắt</td><td>Inbound rules, Routes</td></tr>'
        + '<tr><td><code>ERR_CONNECTION_REFUSED</code></td><td>Tới máy, nhưng cổng không có ai nghe</td><td>Dịch vụ chưa chạy, sai cổng</td><td><code>sudo ss -tlnp</code></td></tr>'
        + '<tr><td><code>Permission denied</code> / <code>403</code></td><td>Tới dịch vụ, nhưng không được phép</td><td>Sai key, sai user, bị chặn có chủ đích</td><td>User <code>ubuntu</code>/<code>ec2-user</code>, quyền file</td></tr>'
        + '<tr><td><code>502 Bad Gateway</code></td><td>nginx chạy, app phía sau chết</td><td>PHP-FPM, container app</td><td>Log nginx, <code>docker ps</code></td></tr>'
        + '<tr><td><code>200 OK</code></td><td>Thành công</td><td></td><td></td></tr>'
        + '</tbody></table></div>' },
      { h: 'Lỗi SSH hay gặp', html: ul(['<code>UNPROTECTED PRIVATE KEY FILE</code> → <code>chmod 400 ~/.ssh/hoc-key.pem</code>.', 'Timeout khi SSH → IP nhà đổi, sửa lại rule "My IP".', '<code>Permission denied (publickey)</code> → sai user (Ubuntu dùng <code>ubuntu</code>) hoặc sai key.']) },
    ] },
];

// ---------- dựng trang ----------
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const groups = [...new Set(PAGES.map((p) => p.group))];
const sidebar = document.getElementById('sidebar');
// Nhóm thu gọn được; nhớ trạng thái trên trình duyệt này (localStorage, lỗi thì bỏ qua).
let collapsed = {};
try { collapsed = JSON.parse(localStorage.getItem('nav-collapsed') || '{}'); } catch (_) {}
const saveCollapsed = () => { try { localStorage.setItem('nav-collapsed', JSON.stringify(collapsed)); } catch (_) {} };
sidebar.innerHTML = groups.map((g, gi) => {
  const items = PAGES.filter((p) => p.group === g);
  return `<div class="group${collapsed[g] ? ' closed' : ''}" data-group="${g}">
    <button class="ghead" aria-expanded="${!collapsed[g]}" aria-controls="g${gi}"><span class="chev">›</span>${g}<span class="cnt">${items.length}</span></button>
    <div class="gitems" id="g${gi}">${items.map((p) => `<a href="#${p.id}" data-id="${p.id}">${p.bug ? '<span class="dot" title="Có lỗi đã gặp"></span>' : ''}${p.title}</a>`).join('')}</div>
  </div>`;
}).join('');
sidebar.addEventListener('click', (e) => {
  const b = e.target.closest('.ghead'); if (!b) return;
  const box = b.parentElement, g = box.dataset.group;
  const closed = box.classList.toggle('closed');
  b.setAttribute('aria-expanded', String(!closed));
  collapsed[g] = closed; saveCollapsed();
});

function render() {
  const id = location.hash.slice(1).split('--')[0];
  const i = Math.max(0, PAGES.findIndex((p) => p.id === id));
  const p = PAGES[i];
  const prev = PAGES[i - 1], next = PAGES[i + 1];
  document.getElementById('content').innerHTML = `<div class="inner">
    <div><div class="eyebrow">${p.group}</div><h1>${p.title}</h1></div>
    <p class="lead">${p.lead}</p>
    ${p.sections.map((s) => `<h2 id="${p.id}--${slug(s.h)}">${s.h}<a class="anchor" href="#${p.id}--${slug(s.h)}" aria-label="Link tới mục">#</a></h2>${s.html}`).join('')}
    <nav class="pager">${prev ? `<a href="#${prev.id}"><span class="k">← Trước</span>${prev.title}</a>` : ''}${next ? `<a class="next" href="#${next.id}"><span class="k">Sau →</span>${next.title}</a>` : ''}</nav>
  </div>`;
  document.getElementById('onpage').innerHTML = '<h5>☰ Trên trang này</h5>' + p.sections.map((s) => `<a href="#${p.id}--${slug(s.h)}">${s.h}</a>`).join('');
  sidebar.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.dataset.id === p.id));
  // nhóm chứa trang đang xem luôn mở
  const cur = sidebar.querySelector(`.group[data-group="${p.group}"]`);
  if (cur && cur.classList.contains('closed')) { cur.classList.remove('closed'); cur.querySelector('.ghead').setAttribute('aria-expanded', 'true'); collapsed[p.group] = false; saveCollapsed(); }
  document.title = p.title + ' · Nhật ký setup AWS';
  if (p.sim) setupSim();
  const sub = location.hash.includes('--') ? document.getElementById(location.hash.slice(1)) : null;
  if (sub) sub.scrollIntoView(); else if (id) window.scrollTo(0, 0);
  sidebar.classList.remove('open');
  document.getElementById('menuBtn').setAttribute('aria-expanded', 'false');
}
let lastPage = null;
window.addEventListener('hashchange', () => {
  const pageId = location.hash.slice(1).split('--')[0];
  if (pageId === lastPage && location.hash.includes('--')) { const el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); return; }
  lastPage = pageId; render();
});
lastPage = location.hash.slice(1).split('--')[0]; render();

document.getElementById('menuBtn').addEventListener('click', (e) => {
  const open = sidebar.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', String(open));
});

// mục "Trên trang này": tô mục đang đọc
window.addEventListener('scroll', () => {
  const hs = [...document.querySelectorAll('.content h2')];
  let cur = hs[0];
  hs.forEach((h) => { if (h.getBoundingClientRect().top < 120) cur = h; });
  document.querySelectorAll('.onpage a').forEach((a) => a.classList.toggle('active', cur && a.getAttribute('href') === '#' + cur.id));
}, { passive: true });

// ---------- mô phỏng ----------
function setupSim() {
  const CONDS = [
    { id: 'ip', label: 'Máy có public IP', note: 'Auto-assign public IP = Enable' },
    { id: 'route', label: 'Route table có 0.0.0.0/0 → IGW', note: 'Subnet là public' },
    { id: 'sg', label: 'Security Group mở cổng 80', note: 'Inbound rule HTTP, nguồn Anywhere' },
    { id: 'svc', label: 'nginx đang chạy, nghe cổng 80', note: 'sudo ss -tlnp có :80' },
  ];
  const NODES = ['Trình duyệt', 'Internet', 'Internet Gateway', 'NACL', 'Security Group', 'EC2 :80 nginx', 'Route table (đường về)'];
  const st = { ip: true, route: true, sg: true, svc: true };
  document.getElementById('toggles').innerHTML = CONDS.map((c) => `<label><input type="checkbox" id="c-${c.id}" checked><span>${c.label}<small>${c.note}</small></span></label>`).join('');
  CONDS.forEach((c) => document.getElementById('c-' + c.id).addEventListener('change', (e) => { st[c.id] = e.target.checked; run(); }));
  function run() {
    let stop = -1, r;
    if (!st.ip) { stop = 0; r = { ok: false, code: 'Không có địa chỉ để gõ', why: 'Máy chỉ có private IP <code>10.x</code>. Internet không định tuyến tới IP riêng, nên từ ngoài không gọi tới được.', fix: 'Bật public IP (máy mới: Auto-assign = Enable; máy cũ: gắn Elastic IP).' }; }
    else if (!st.sg) { stop = 4; r = { ok: false, code: 'ERR_CONNECTION_TIMED_OUT', why: 'Security Group <b>bỏ gói tin lặng lẽ</b> ở chiều đi vào. Gói tin chưa tới máy, log nginx không có gì. Đây là lỗi 1.', fix: 'Thêm inbound rule HTTP 80.' }; }
    else if (!st.svc) { stop = 5; r = { ok: false, code: 'ERR_CONNECTION_REFUSED', why: 'Gói tin tới máy, nhưng không có chương trình nào nghe cổng 80, nên máy từ chối ngay. Đây là lỗi 2.', fix: '<code>sudo systemctl start nginx</code>, hoặc cài nginx.' }; }
    else if (!st.route) { stop = 6; r = { ok: false, code: 'ERR_CONNECTION_TIMED_OUT', why: 'Gói tin vào tới nginx, nginx có trả lời, nhưng <b>gói trả lời không có đường về</b> Internet. Log nginx <b>có</b> dòng request. SSH cũng chết theo. Đây là thí nghiệm 3.', fix: 'Thêm lại route <code>0.0.0.0/0 → IGW</code>.' }; }
    else { r = { ok: true, code: '200 OK', why: 'Đủ cả 4 điều kiện: có địa chỉ, firewall cho qua, có dịch vụ trả lời, và có đường về.', fix: '' }; }
    document.getElementById('path').innerHTML = NODES.map((n, i) => {
      const cls = stop === -1 ? 'pass' : i < stop ? 'pass' : i === stop ? 'stop' : 'skip';
      return `<span class="node ${cls}">${n}</span>` + (i < NODES.length - 1 ? '<span class="arrow">→</span>' : '');
    }).join('');
    const el = document.getElementById('result');
    el.className = 'result ' + (r.ok ? 'ok' : 'bad');
    el.innerHTML = `<span class="code">${r.code}</span><span>${r.why}</span>${r.fix ? `<span><b>Sửa:</b> ${r.fix}</span>` : ''}`;
  }
  run();
}
