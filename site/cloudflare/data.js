// Nội dung trang Cloudflare: mỗi phần tử PAGES là một trang (hash #id). Chỉ kiến thức chung, không ghi tên zone/bucket/token của công ty.
const ul = (items) => '<ul>' + items.map((x) => `<li>${x}</li>`).join('') + '</ul>';
const callout = (kind, title, body) => `<div class="callout ${kind}"><b>${title}</b><div>${body}</div></div>`;
const table = (head, rows) => '<div class="tablewrap"><table><thead><tr>' + head.map((h) => `<th>${h}</th>`).join('') + '</tr></thead><tbody>'
  + rows.map((r) => '<tr>' + r.map((c) => `<td>${c}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>';

// Chặng của một request khi website đứng sau Cloudflare. learned: đã tìm hiểu kỹ chưa.
const HOPS = [
  { n: 'DNS của Cloudflare', where: 'Internet', learned: false, what: 'Tên miền dùng nameserver của Cloudflare. Bản ghi bật <b>đám mây cam</b> (proxied) thì DNS trả về IP của Cloudflare, không phải IP server thật. Đám mây xám (DNS only) thì trả IP server thật.', fail: '<code>ERR_NAME_NOT_RESOLVED</code>: chưa có bản ghi, hoặc nameserver chưa trỏ về Cloudflare.' },
  { n: 'Edge của Cloudflare', where: 'Máy chủ gần người dùng', learned: false, what: 'HTTPS bắt đầu ở đây. Cloudflare xét lần lượt: luật bảo mật (WAF, Bot, rate limit) → cache. Có sẵn trong cache thì trả luôn, không gọi về server.', fail: '<code>403</code> trang của Cloudflare: bị WAF/Bot chặn. Trả bản cũ: đang dính cache.' },
  { n: 'Đoạn Cloudflare → server (origin)', where: 'Internet', learned: false, what: 'Cache trượt thì Cloudflare gọi về server thật. Chế độ SSL quyết định đoạn này có mã hoá không: <b>Flexible</b> = HTTP trần, <b>Full</b> = HTTPS nhưng không kiểm cert, <b>Full (strict)</b> = HTTPS và kiểm cert.', fail: '<code>521</code> server từ chối, <code>522</code> kết nối quá 19 giây, <code>524</code> server trả lời quá chậm (khoảng 100 giây), <code>525/526</code> lỗi TLS.' },
  { n: 'Server (nginx → app)', where: 'VPS / EC2', learned: true, what: 'Server thấy IP của Cloudflare, không phải IP người dùng. IP thật nằm ở header <code>CF-Connecting-IP</code>. App phải tin header này <b>chỉ khi</b> request thật sự đến từ dải IP của Cloudflare.', fail: 'Rate limit theo IP mà không đọc IP thật thì gom mọi người dùng vào vài IP của Cloudflare.' },
  { n: 'R2 (lưu file)', where: 'Hạ tầng Cloudflare', learned: true, what: 'Ảnh, video phục vụ qua một tên miền riêng gắn vào bucket. Tải ra Internet không mất phí băng thông.', fail: '<code>403</code> khi key không tồn tại (không phải 404).' },
  { n: 'Email Sending + Queue', where: 'Hạ tầng Cloudflare', learned: true, what: 'App gọi API gửi mail. Sau đó Cloudflare đẩy kết quả (delivered, bounced, complained…) vào một Queue để app tự kéo về.', fail: 'Không kéo event về thì không biết địa chỉ nào hỏng, cứ gửi tiếp và làm xấu uy tín domain.' },
];
const journeyHtml = () => '<div class="journey">' + HOPS.map((h, i) => `
  <details class="hop ${h.learned ? 'done' : 'todo'}"${i < 2 ? ' open' : ''}>
    <summary><span class="hn">${i + 1}</span><span class="ht">${h.n}</span><span class="hw">${h.where}</span><span class="badge">${h.learned ? 'Đã tìm hiểu' : 'Chưa học kỹ'}</span></summary>
    <div class="hb"><p>${h.what}</p>${h.fail ? `<p class="hf"><b>Hỏng thì thấy:</b> ${h.fail}</p>` : ''}</div>
  </details>`).join('') + '</div>';

const B = (t, sub, learned) => `<div class="box${learned ? ' learned' : ''}"><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
const mapHtml = () => `<div class="arch">
  <div class="zone vpc"><span class="zl">Account (cái nhà chứa mọi thứ)</span>
    <div class="row">${B('Thành viên', 'user được mời, có vai trò', true)}${B('API token', 'account token / user token', true)}${B('Billing', 'gói Workers Paid…')}</div>
    <div class="zone pub"><span class="zl">Zone (một tên miền)</span>
      <div class="row">${B('DNS', 'bản ghi, đám mây cam/xám')}${B('Cache', 'TTL, purge')}${B('Bảo mật', 'WAF, Bot, rate limit')}</div>
    </div>
    <div class="zone priv"><span class="zl">Sản phẩm cấp account</span>
      <div class="row">${B('R2', 'lưu file, API giống S3', true)}${B('Email Sending', 'gửi mail qua API', true)}${B('Queues', 'hàng đợi + event', true)}${B('Workers', 'chạy code ở edge')}</div>
    </div>
  </div>
  <p class="legend"><span class="box learned mini"></span> viền xanh = đã tìm hiểu</p>
</div>`;

const PAGES = [
  // ---------- Tổng quan ----------
  { id: 'hanh-trinh', group: 'Tổng quan', title: 'Request đi qua Cloudflare thế nào',
    lead: 'Website đứng sau Cloudflare thì mọi request đi qua edge của Cloudflare trước rồi mới tới server. Bấm từng chặng để xem nó làm gì và hỏng thì ra lỗi gì.',
    sections: [
      { h: 'Các chặng', html: journeyHtml() },
      { h: 'So với AWS', html: table(['Việc', 'AWS', 'Cloudflare'], [
        ['DNS', 'Route 53', 'DNS (đi kèm zone)'], ['CDN', 'CloudFront', 'Proxy + cache (đám mây cam)'], ['Lưu file', 'S3', 'R2 (dùng được SDK S3)'],
        ['Gửi mail', 'SES', 'Email Sending'], ['Hàng đợi', 'SQS', 'Queues'], ['Chạy code không cần server', 'Lambda', 'Workers'], ['Firewall web', 'AWS WAF', 'WAF, Bot, rate limit']]) },
    ] },
  { id: 'ban-do', group: 'Tổng quan', title: 'Bản đồ: account, zone, sản phẩm',
    lead: 'Hiểu 3 tầng này trước thì mọi màn hình trong dashboard đều dễ đọc.',
    sections: [
      { h: 'Sơ đồ', html: mapHtml() },
      { h: 'Giải thích', html: ul([
        '<b>User</b>: là bạn, tức email đăng nhập.',
        '<b>Account</b>: cái nhà chứa mọi thứ, hiện ở góc trên bên trái dashboard (vd "Default account"). Một user có thể thuộc nhiều account; một account có nhiều thành viên.',
        '<b>Zone</b>: một tên miền trong account. DNS, cache, bảo mật cài theo từng zone.',
        '<b>Sản phẩm cấp account</b>: R2, Email Sending, Queues, Workers không thuộc riêng zone nào.']) },
      { h: 'Vì sao quan trọng', html: callout('warn', 'Account là một điểm chết chung', 'Mọi zone, bucket, mail nằm trong một account. Account bị khoá (thanh toán lỗi, vi phạm chính sách) là mọi thứ dừng cùng lúc. Nhiều dự án dùng chung một account thì càng phải biết ai giữ quyền Super Administrator và ai nhận mail billing.') },
    ] },

  // ---------- Tài khoản và quyền ----------
  { id: 'thanh-vien', group: 'Tài khoản và quyền', title: 'User, account, thành viên',
    lead: '"Rời tổ chức" nghĩa là bị gỡ khỏi danh sách thành viên của một account.',
    sections: [
      { h: 'Giống cái gì', html: ul(['Giống GitHub organization: repo thuộc org, người được mời vào org.', 'Xem danh sách: <b>Manage Account → Members</b>. Account cá nhân thì chỉ có một người là bạn.']) },
      { h: 'Vai trò hay gặp', html: table(['Vai trò', 'Làm được'], [
        ['Super Administrator', 'Mọi thứ, kể cả mời/gỡ thành viên và billing'], ['Administrator', 'Gần như mọi thứ, trừ một số việc của Super Admin'],
        ['Administrator Read Only', 'Xem mọi cấu hình, không sửa được. Hợp để học và để kiểm tra']]) },
      { h: 'Bài tập', html: ul(['Ở account công ty: xin quyền <b>Administrator Read Only</b> để tự đọc cấu hình (gói zone, WAF, cache rules) mà không sợ sửa nhầm.']) },
    ] },
  { id: 'token', group: 'Tài khoản và quyền', title: 'Account token và User token',
    lead: 'Hai loại có thể cấp cùng một quyền. Khác nhau ở chỗ token thuộc về ai.',
    sections: [
      { h: 'So sánh', html: table(['', 'Account API token', 'User API token'], [
        ['Thuộc về', 'Cả account', 'Người tạo ra token'], ['Người tạo rời account', 'Token <b>vẫn chạy</b>', 'Token <b>ngừng chạy</b>'], ['Nên dùng cho', 'Server, production', 'Việc cá nhân, thử nghiệm']]) },
      { h: 'Ví dụ hỏng', html: callout('bad', 'Người tạo token nghỉ việc, app lỗi đọc ảnh', 'Một dev tạo <b>User token</b> cho app đọc R2. Dev nghỉ, admin gỡ khỏi account → token chết theo → app lỗi ngay. Token chạy production phải là <b>Account token</b>.') },
      { h: 'Bẫy: Sippy tự tạo User token', html: ul(['Bật Sippy (chép dần từ S3 sang R2) trên dashboard sẽ tự tạo một User token tên <code>[Sippy] aws:… → r2:…</code>.', 'Người bật Sippy rời account thì Sippy có thể không ghi vào R2 được nữa (suy luận, chưa thử).']) },
      { h: 'Giữ token an toàn', html: ul(['Chọn quyền yếu nhất đủ dùng, chỉ cho đúng tài nguyên cần.', 'Bật <b>Client IP Address Filtering</b>: chỉ IP server được dùng token.', 'Đặt hạn dùng (TTL) nếu được, và ghi lại token nào cấp cho máy nào.', 'Không gửi token qua chat; đặt thẳng vào <code>.env</code> trên server.']) },
    ] },
  { id: 'quyen-r2', group: 'Tài khoản và quyền', title: 'Quyền R2: 4 mức và chọn bucket',
    lead: '4 lựa chọn là 2 câu hỏi ghép lại: được đụng tới cái gì, và được đọc hay được ghi.',
    sections: [
      { h: 'Hai câu hỏi', html: ul(['<b>Admin hay Object?</b> Admin quản lý cả <b>bucket</b> (tạo, xoá, sửa CORS, Sippy, custom domain) và mọi file. Object chỉ đụng tới <b>file trong bucket</b>.', '<b>Read only hay Read &amp; Write?</b> Write thêm quyền upload, ghi đè và xoá file.']) },
      { h: 'Bốn mức', html: table(['Mức', 'Làm được', 'Lộ token thì mất'], [
        ['Admin Read &amp; Write', 'Mọi thứ, kể cả <b>xoá cả bucket</b>', 'Toàn bộ dữ liệu R2 của account'],
        ['Admin Read only', 'Xem cấu hình mọi bucket, đọc mọi file', 'Bị đọc hết, không bị xoá'],
        ['Object Read &amp; Write', 'Đọc, ghi, xoá file trong bucket được chọn', 'File trong các bucket đó'],
        ['Object Read only', 'Chỉ đọc file trong bucket được chọn', 'Chỉ bị đọc trộm']]) },
      { h: 'Chọn thế nào', html: ul(['App upload và xoá ảnh → <b>Object Read &amp; Write</b>, chỉ đúng một bucket.', 'Script backup, đối soát → <b>Object Read only</b>.', 'Bật Sippy, sửa CORS → Admin, nhưng để người làm tay trên dashboard. Không đặt token Admin trong <code>.env</code>.', 'Luôn chọn <b>Apply to specific buckets only</b>, để lỡ lộ thì các bucket khác không sao.']) },
    ] },

  // ---------- R2 ----------
  { id: 'r2', group: 'R2', title: 'R2 là gì, tính tiền thế nào',
    lead: 'Kho lưu file giống S3, dùng được SDK S3, và không mất phí băng thông khi tải ra.',
    sections: [
      { h: 'Giá (đọc 25/11/2026)', html: table(['Khoản', 'Giá', 'Miễn phí mỗi tháng'], [
        ['Lưu trữ', '$0,015 / GB-tháng', '10 GB'], ['Class A (PUT, LIST…)', '$4,50 / triệu', '1 triệu'], ['Class B (GET, HEAD)', '$0,36 / triệu', '10 triệu'], ['Băng thông ra', '$0', '']]) },
      { h: 'Điểm khác S3', html: ul(['Region luôn là <code>auto</code>.', 'Không hỗ trợ ACL từng object (<code>x-amz-acl</code>).', 'Ghi cùng một key quá 1 lần/giây → <code>429</code>.', 'File &gt; 16 MiB qua SDK S3 thường tự chuyển sang multipart; upload dở tự huỷ sau 7 ngày.']) },
    ] },
  { id: 'r2-public', group: 'R2', title: 'Public qua tên miền riêng',
    lead: 'Gắn custom domain vào bucket thì mọi object đều đọc được nếu biết key.',
    sections: [
      { h: 'Hiểu đúng', html: ul(['Custom domain đi qua cache của zone đó, nên áp dụng luật cache của zone.', 'Không liệt kê được bucket ở gốc, nhưng key đoán được thì vẫn đọc được.', '<code>r2.dev</code> chỉ để thử: có giới hạn tốc độ, không có cache, WAF.']) },
      { h: 'Bẫy', html: callout('bad', 'Ghi file riêng tư vào bucket public là lộ', 'Bucket đã gắn custom domain thì không có khái niệm "file này private". File nhạy cảm phải nằm ở bucket khác, không gắn domain, đọc qua presigned URL.') },
      { h: 'Key không tồn tại', html: ul(['Qua custom domain, key không có trả <code>403</code> (trang HTML), không phải <code>404</code>. Đừng hiểu 403 là "bị chặn quyền".']) },
    ] },
  { id: 'sippy', group: 'R2', title: 'Sippy: chép dần từ S3 sang R2',
    lead: 'Bật Sippy thì lần đầu ai GET một file chưa có trên R2, R2 tự lấy từ S3 rồi giữ lại.',
    sections: [
      { h: 'Hành vi', html: ul(['Chỉ GET mới kích chép. <code>HEAD</code> (vd hàm <code>exists()</code>) <b>không</b> kích.', 'Xoá trên R2 không xoá bên S3; lần GET sau lại chép về.', 'Sửa file ở S3 sau khi đã chép thì R2 không biết.']) },
      { h: 'Bật/tắt bằng lệnh', html: '<pre><code>npx wrangler r2 bucket sippy get &lt;bucket&gt;\nnpx wrangler r2 bucket sippy disable &lt;bucket&gt;</code></pre>' },
    ] },

  // ---------- Email và Queue ----------
  { id: 'email', group: 'Email và Queue', title: 'Email Sending: gửi mail qua API',
    lead: 'Phải onboard domain trước, From phải thuộc đúng domain đó.',
    sections: [
      { h: 'Gửi', html: ul(['<code>POST /client/v4/accounts/{account_id}/email/sending/send</code>, token có quyền <b>Email Sending: Edit</b>.', 'Response có <code>message_id</code>, <code>delivered</code>, <code>queued</code>, <code>permanent_bounces</code>, <code>suppressed_recipients</code>.', 'Gói Free chỉ gửi tới địa chỉ đã verify. Workers Paid: 3.000 mail/tháng, vượt thì $0,35/1.000.']) },
      { h: 'Suppression (danh sách không gửi)', html: table(['Lý do', 'Hết hạn'], [['Complaint (bấm "Spam")', 'Không bao giờ'], ['Hard bounce', '7 ngày; địa chỉ/domain không tồn tại thì không bao giờ'], ['Soft bounce', '24 giờ'], ['Thêm tay', 'Tuỳ đặt']]) },
      { h: 'Drop suppressed recipients', html: callout('warn', 'Mặc định TẮT', 'Tắt: chỉ cần một người nhận đang bị suppress là REST trả <code>400</code> cho <b>cả request</b>. Bật: bỏ người đó, gửi phần còn lại, trả danh sách trong <code>suppressed_recipients</code>. Cài ở Email Sending → domain → Settings.') },
      { h: 'Uy tín gửi', html: ul(['Ngưỡng an toàn: bounce &lt; 2%, complaint &lt; 0,1%, delivery &gt; 98%.', 'Vượt nhiều thì Cloudflare có thể dừng gửi <b>cả account</b> (403/10207).', 'Mail không có link huỷ đăng ký thì người nhận chỉ còn nút Spam → complaint tăng.']) },
    ] },
  { id: 'event-sub', group: 'Email và Queue', title: 'Event Subscription: kết quả gửi mail về đâu',
    lead: 'Không có webhook. Cloudflare đẩy event vào một Queue, app tự kéo về.',
    sections: [
      { h: 'Luồng', html: '<pre><code>App gửi mail ──► Email Sending ──► Event Subscription ──► Queue ◄── App kéo về (pull) rồi ack</code></pre>' },
      { h: '6 loại event', html: ul(['<code>cf.email.sending.message.delivered</code>, <code>.deferred</code>, <code>.bounced</code>, <code>.failed</code>, <code>.rejected</code>, <code>.complained</code>.', 'Mỗi subscription gắn với <b>một domain gửi</b>.', 'Tạo: Queues → chọn queue → Subscriptions → Subscribe to events → nguồn Email Sending.']) },
      { h: 'Trong một event có gì', html: '<pre><code>{ "type": "cf.email.sending.message.bounced",\n  "payload": { "eventId", "messageId", "recipient",\n               "delivery": { "status", "smtpEnhancedStatusCode" },\n               "bounce": { "type": "hard|soft", "classification" } },\n  "metadata": { "eventTimestamp" } }</code></pre>' },
      { h: 'Bẫy', html: ul(['Docs ví dụ <code>messageId</code> của event dạng <code>0101…-msg-…</code>, còn REST trả <code>&lt;…@domain&gt;</code>. Có khớp nhau không phải tự đo trên event thật.', '<code>bounced</code> có thể mang <code>type: soft</code> (hết lượt thử tạm thời).', 'Docs có câu "events … to verified destination addresses": phải kiểm có event cho người nhận thật không.']) },
    ] },
  { id: 'queue', group: 'Email và Queue', title: 'Queue: pull, ack, retry',
    lead: 'Queue giao message ít nhất một lần. App phải chịu được message trùng và không theo thứ tự.',
    sections: [
      { h: 'Kéo về (pull)', html: '<pre><code>POST /accounts/{id}/queues/{queue_id}/messages/pull\n{ "batch_size": 100, "visibility_timeout_ms": 120000 }</code></pre>' + ul(['Mỗi message có <code>lease_id</code>: giữ chỗ trong thời gian visibility timeout (mặc định 30 giây, tối đa 12 giờ).', '<code>body</code> dạng json/bytes là base64, phải giải mã.', 'Hết timeout mà chưa ack thì message tự quay lại hàng đợi.']) },
      { h: 'Trả lời (ack)', html: '<pre><code>POST …/messages/ack\n{ "acks": [{ "lease_id": "…" }],\n  "retries": [{ "lease_id": "…", "delay_seconds": 300 }] }</code></pre>' + ul(['<code>acks</code>: xử lý xong, xoá.', '<code>retries</code>: giao lại sau N giây (tối đa 24 giờ).']) },
      { h: 'Giới hạn', html: table(['Thứ', 'Giá trị'], [['Giữ message', 'Paid: mặc định 4 ngày, tối đa 14 · Free: 24 giờ'], ['max_retries', 'Mặc định 3, tối đa 100; quá thì xoá hoặc vào dead-letter queue'], ['Kích thước message', '128 KB'], ['Backlog mỗi queue', '25 GB']]) },
      { h: 'Docs không nói', html: callout('warn', 'Cần tự đo', 'Gọi <code>retries</code> có làm tăng <code>attempts</code> không; hết visibility timeout có tính là một lần thử không; dead-letter queue có chạy với HTTP pull không. Code nào dựa vào <code>attempts</code> để quyết định thì phải thử trên queue thật trước.') },
      { h: 'Giá', html: ul(['Mỗi 64 KB ghi, đọc, xoá = 1 thao tác. Message thường = 3 thao tác. Mỗi lần giao lại +1 đọc.', '<b>Pull rỗng cũng tính 1 đọc.</b>', 'Workers Paid có sẵn 1 triệu thao tác/tháng, vượt $0,40/triệu.']) },
    ] },
  { id: 'pull-worker', group: 'Email và Queue', title: 'HTTP pull hay Worker',
    lead: 'Mỗi queue chọn một kiểu consumer.',
    sections: [
      { h: 'So sánh', html: table(['', 'HTTP pull', 'Worker (push)'], [
        ['Ai chủ động', 'App tự gọi API kéo về (cron)', 'Cloudflare gọi hàm <code>queue(batch)</code> của Worker'],
        ['Phải làm thêm', 'Một lệnh chạy định kỳ', 'Viết + deploy Worker; muốn về app thì Worker gọi endpoint public của app'],
        ['App chết vài ngày', 'Event nằm chờ trong Queue', 'Worker vẫn chạy, nhưng gọi về app lỗi → hết retry thì mất'],
        ['Độ trễ', 'Theo nhịp cron (vd 5 phút)', 'Gần như ngay']]) },
      { h: 'Bật pull', html: '<pre><code>npx wrangler queues consumer http add &lt;queue&gt;</code></pre>' + ul(['Đang có Worker consumer thì phải gỡ trước.', 'Token cần <b>Queues Read + Write</b> (ack là ghi). Quyền này áp lên mọi queue trong account, nên bật giới hạn IP.']) },
    ] },

  // ---------- Proxy và cache ----------
  { id: 'proxy', group: 'Proxy và cache', title: 'Đám mây cam, SSL mode, IP thật',
    lead: 'Phần này chưa học kỹ. Đây là các ý chính cần nắm.',
    sections: [
      { h: 'Ý chính', html: ul(['Đám mây cam: request đi qua Cloudflare (có cache, WAF, ẩn IP server). Đám mây xám: chỉ là DNS.', 'Flexible: đoạn Cloudflare → server là HTTP trần, và ai biết IP server vẫn vào thẳng được. Nên dùng Full (strict).', 'IP người dùng thật: header <code>CF-Connecting-IP</code>. Quốc gia: <code>CF-IPCountry</code> (<code>XX</code> = không rõ, <code>T1</code> = Tor).']) },
      { h: 'Thời gian chờ', html: ul(['Server trả lời quá khoảng 100 giây → <code>524</code>. Gói thường không nâng được.', 'Việc chạy lâu phải đưa vào job/hàng đợi, không làm trong request.']) },
    ] },
  { id: 'cache', group: 'Proxy và cache', title: 'Cache và purge',
    lead: 'Cloudflare mặc định cache theo đuôi file, không cache HTML.',
    sections: [
      { h: 'Mặc định', html: ul(['Cache theo đuôi file (js, css, jpg…), không xét Content-Type. HTML, JSON không cache.', 'Cache key gồm cả query string: <code>a.js?v=2</code> là một bản khác <code>a.js</code>.', 'Server không gửi Cache-Control → edge giữ 2 giờ; trình duyệt giữ theo Browser TTL (mặc định 4 giờ).', 'Có <code>Set-Cookie</code> hoặc <code>Cache-Control: no-cache/no-store/private</code> thì không cache.']) },
      { h: 'Bẫy', html: callout('bad', 'Purge rồi mà người dùng vẫn thấy bản cũ', 'Purge chỉ xoá ở edge, không xoá bản trong trình duyệt. File đổi nội dung tại cùng URL thì nên đổi URL (thêm <code>?v=&lt;commit&gt;</code>) thay vì trông vào purge.') },
    ] },

  // ---------- Công cụ ----------
  { id: 'mo-phong', group: 'Công cụ', title: 'Mô phỏng một message trong Queue', sim: true,
    lead: 'Bấm các nút để xem một message đi qua pull, ack, retry và hết visibility timeout. Giả định: mỗi lần giao (pull) tăng attempts lên 1, max_retries = 3.',
    sections: [{ h: 'Bộ mô phỏng', html: '<div class="sim"><div class="toggles" id="qbtn"></div><div class="path" id="qpath" aria-live="polite"></div><div class="result" id="qres"></div></div>' }] },
  { id: 'doc-loi', group: 'Công cụ', title: 'Bảng đọc lỗi Cloudflare',
    lead: 'Nhìn mã lỗi là biết hỏng ở chặng nào.',
    sections: [
      { h: 'Lỗi HTTP do Cloudflare sinh', html: table(['Mã', 'Nghĩa', 'Kiểm'], [
        ['520', 'Server trả rỗng/hỏng, header quá lớn, cắt kết nối giữa chừng', 'Log lỗi nginx cùng giờ'], ['521', 'Server từ chối kết nối', 'Web server có chạy không, firewall có chặn IP Cloudflare không'],
        ['522', 'Không kết nối được trong 19 giây', 'Server quá tải, firewall bỏ gói'], ['524', 'Kết nối được nhưng trả lời quá ~100 giây', 'Request chạy lâu → đưa vào job'],
        ['525 / 526', 'Lỗi TLS giữa Cloudflare và server', 'SSL mode, cert của server'], ['403 (trang Cloudflare)', 'Bị WAF/Bot chặn', 'Security → Events'], ['429', 'Vượt rate limit', 'Header <code>Retry-After</code>']]) },
      { h: 'Lỗi API hay gặp', html: table(['Mã', 'Nghĩa'], [['401 / 10101', 'Token sai'], ['403 / 10102', 'Token thiếu quyền'], ['404 / 7003', 'Sai account id'], ['403 / 10203', 'Domain/account chưa bật gửi mail'], ['403 / 10207', 'Account bị dừng gửi mail (uy tín xấu)'], ['400 (gửi mail)', 'Có người nhận bị suppress mà chưa bật Drop suppressed recipients']]) },
    ] },
];

// Mô phỏng vòng đời một message trong Queue (chạy khi mở trang mo-phong).
function setupSim() {
  const MAX = 3;
  const st = { state: 'trong hàng đợi', attempts: 0, log: [] };
  const BTN = [
    { id: 'pull', label: 'Pull', note: 'App kéo message về, nhận lease_id' },
    { id: 'ack', label: 'Ack', note: 'Xử lý xong, xoá message' },
    { id: 'retry', label: 'Retry (delay 300 s)', note: 'Giao lại sau, vd vì DB lỗi' },
    { id: 'timeout', label: 'Hết visibility timeout', note: 'App chết giữa chừng, không ack' },
    { id: 'reset', label: 'Làm lại', note: 'Message mới' },
  ];
  document.getElementById('qbtn').innerHTML = BTN.map((b) => `<label><input type="radio" name="qb" value="${b.id}"><span>${b.label}<small>${b.note}</small></span></label>`).join('');
  document.getElementById('qbtn').addEventListener('change', (e) => { act(e.target.value); e.target.checked = false; });
  function act(a) {
    if (a === 'reset') { st.state = 'trong hàng đợi'; st.attempts = 0; st.log = []; return draw(); }
    if (st.state === 'đã xoá' || st.state === 'mất (quá max_retries)') { st.log.push(`${a}: message không còn nữa`); return draw(); }
    if (a === 'pull') {
      if (st.state !== 'trong hàng đợi') { st.log.push('pull: message đang được giữ chỗ, app khác không thấy'); return draw(); }
      st.attempts += 1; st.state = 'đang giữ chỗ'; st.log.push(`pull: attempts = ${st.attempts}`);
    } else if (st.state !== 'đang giữ chỗ') { st.log.push(`${a}: phải pull trước`); }
    else if (a === 'ack') { st.state = 'đã xoá'; st.log.push('ack: xong, message bị xoá'); }
    else {
      st.log.push(a === 'retry' ? 'retry: quay lại hàng đợi sau 300 giây' : 'timeout: không ack → tự quay lại hàng đợi');
      st.state = st.attempts >= MAX ? 'mất (quá max_retries)' : 'trong hàng đợi';
      if (st.attempts >= MAX) st.log.push(`attempts ${st.attempts} = max_retries ${MAX} → bị xoá (không có dead-letter queue)`);
    }
    draw();
  }
  function draw() {
    const NODES = ['trong hàng đợi', 'đang giữ chỗ', 'đã xoá', 'mất (quá max_retries)'];
    document.getElementById('qpath').innerHTML = NODES.map((n, i) => `<span class="node ${n === st.state ? (n.startsWith('mất') ? 'stop' : 'pass') : 'skip'}">${n}</span>` + (i < NODES.length - 1 ? '<span class="arrow">·</span>' : '')).join('');
    const el = document.getElementById('qres');
    el.className = 'result ' + (st.state.startsWith('mất') ? 'bad' : 'ok');
    el.innerHTML = `<span class="code">attempts = ${st.attempts} / max_retries = ${MAX}</span>` + (st.log.length ? `<span>${st.log.slice(-6).join('<br>')}</span>` : '<span>Bấm Pull để bắt đầu.</span>')
      + '<span><b>Bài học:</b> mỗi lần app lỗi rồi không ack (hoặc gọi retry) là tốn một lượt. Hết lượt mà không có dead-letter queue thì event mất hẳn. Docs không nói rõ retry có tăng attempts không, nên đây là giả định cần đo.</span>';
  }
  draw();
}
