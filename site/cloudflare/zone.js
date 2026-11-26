// Nhóm "Domain (zone)": đi theo đúng thứ tự menu của một domain trên dashboard Cloudflare.
// Mỗi trang trả lời: vấn đề gì → Cloudflare giải quyết thế nào → trong stack của mình ra sao → trên dashboard trông thế nào.
// Ảnh chụp từ zone cá nhân (gói Free), đã che IP/email/ID. Nạp sau data.js, chèn vào PAGES trước nhóm "Công cụ".
const G = 'Domain (zone)';
const flow = (nodes) => '<div class="path">' + nodes.map((n, i) => `<span class="node ${n[1] || ''}">${n[0]}</span>` + (i < nodes.length - 1 ? '<span class="arrow">→</span>' : '')).join('') + '</div>';
const four = (problem, solve, stack) => [
  { h: 'Vấn đề', html: problem },
  { h: 'Cloudflare giải quyết thế nào', html: solve },
  { h: 'Trong stack của mình', html: stack },
];

const ZONE_PAGES = [
  { id: 'zone', group: G, title: 'Domain gồm những gì (đọc trước)',
    lead: 'Bấm vào một domain là vào menu riêng của domain đó. Hầu hết các mục trong menu chỉ chạy với bản ghi để đám mây cam, vì chúng làm việc trên request đi qua Cloudflare.',
    sections: [
      { h: 'Ý chính', html: ul([
        'Domain (Cloudflare gọi là <b>zone</b>) = một tên miền bạn đưa nameserver về Cloudflare, vd <code>phuoc-review-app-1.uk</code>.',
        'Bản ghi <b>đám mây cam</b>: request đi qua Cloudflare, nên mọi thứ bên dưới (SSL, Security, Cache, Rules…) mới có tác dụng.',
        'Bản ghi <b>đám mây xám</b>: Cloudflare chỉ trả IP, request đi thẳng vào server. Hầu hết menu dưới đây <b>không áp dụng</b> cho bản ghi đó.']) },
      { h: 'Một request đi qua các mục theo thứ tự', html: flow([['DNS'], ['SSL/TLS (đoạn 1)'], ['Security'], ['Rules'], ['Cache'], ['SSL/TLS (đoạn 2)'], ['Server']])
        + '<p>Ngoài đường đi chính: <b>Analytics/Observability</b> ghi lại mọi thứ; <b>Speed</b> tối ưu nội dung trả về; <b>Network</b> chọn giao thức; <b>Traffic</b> chọn server nào nhận; <b>Error Pages</b> đổi trang lỗi; <b>Access</b> bắt đăng nhập trước khi vào.</p>' },
      { h: 'Bảng tra nhanh', html: table(['Mục', 'Một câu: để làm gì', 'Cần ngay?'], [
        ['Overview', 'Tóm tắt traffic + trạng thái domain', 'Xem'],
        ['AI Crawl Control', 'Biết và chặn bot AI cào nội dung', 'Tuỳ'],
        ['Agent Readiness', 'Giúp AI agent đọc/dùng site (beta)', 'Chưa'],
        ['Analytics / Observability', 'Xem ai gọi vào, từ đâu, lỗi gì', 'Có'],
        ['DNS', 'Tên miền trỏ đi đâu, cam hay xám', '<b>Có</b>'],
        ['Email', 'Chống người khác giả mail mang tên domain mình', 'Có nếu gửi mail'],
        ['SSL/TLS', 'Mã hoá 2 đoạn đường + chứng chỉ', '<b>Có</b>'],
        ['Security', 'WAF, bot, rate limit, xem ai bị chặn', '<b>Có</b>'],
        ['Access', 'Màn đăng nhập trước app nội bộ', 'Tuỳ'],
        ['Speed', 'Đo và tối ưu tốc độ trang', 'Tuỳ'],
        ['Caching', 'Giữ file tĩnh ở edge, purge', '<b>Có</b>'],
        ['Workers Routes', 'Chạy code của mình ngay ở edge', 'Chưa'],
        ['Rules', 'Đổi URL, header, chuyển hướng, cấu hình theo đường dẫn', 'Có'],
        ['Error Pages', 'Trang lỗi riêng thay trang của Cloudflare', 'Gói Pro'],
        ['Network', 'IPv6, WebSocket, header quốc gia…', 'Xem'],
        ['Traffic', 'Nhiều server, failover, hàng chờ', 'Khi lớn'],
        ['Web3', 'Cổng IPFS/Ethereum', 'Không']]) },
    ] },

  { id: 'zone-overview', group: G, title: 'Overview',
    lead: 'Trang đầu của domain: số liệu 24 giờ và trạng thái.',
    sections: [
      ...four(ul(['Cần nhìn một chỗ là biết domain có đang chạy không, đông hay vắng, cache có ăn không.']),
        ul(['Unique Visitors, Total Requests, <b>Percent Cached</b>, Total Data Served, Data Cached.', 'Bên phải (cuộn xuống): gói đang dùng, nameserver, trạng thái domain.']),
        ul(['Zone cá nhân 25–26/11: 887 request, <b>28,69% được cache</b>. Phần lớn còn lại là HTML/API (không cache) và bot quét.', 'Percent Cached thấp không phải lúc nào cũng xấu: app có đăng nhập thì đa số request vốn không cache được.'])),
      { h: 'Trên dashboard', html: shot('zone-overview', 'Overview của zone: các con số 24 giờ và gợi ý bật tối ưu tốc độ.') },
    ] },

  { id: 'zone-ai', group: G, title: 'AI Crawl Control',
    lead: 'Biết bot AI nào đang cào nội dung site, và cho phép hay chặn từng con.',
    sections: [
      ...four(ul(['Bot của OpenAI, Anthropic, Google… đọc nội dung web để huấn luyện mô hình hoặc trả lời câu hỏi. Chủ site muốn biết <b>ai cào gì</b> và có quyền nói "không".', '<code>robots.txt</code> chỉ là lời đề nghị, bot có thể lờ đi.']),
        ul(['Cloudflare nhận diện bot AI ở edge, đếm theo từng nhà cung cấp, cho chặn hoặc cho phép từng con.', '<b>Bot Preference Sync</b>: tự ghi luật của bạn vào đầu <code>robots.txt</code>.', '<b>Markdown for Agents</b> (gói Pro): trả bản Markdown khi bot xin <code>Accept: text/markdown</code>, đỡ tốn băng thông HTML.']),
        ul(['7 ngày: <b>477 request từ bot AI</b>, đường bị cào nhiều nhất là <code>webhook.phuoc-review-app-1.uk/userfiles</code>.', '<b>474/477 nhận HTTP 530</b>: 530 là lỗi Cloudflare sinh khi không tới được origin, thường kèm mã 1xxx như 1033 (tunnel không chạy) hoặc 1016 (DNS origin lỗi). Tức tunnel <code>webhook.</code> đang tắt mà bot vẫn gõ cửa.', 'Với LAI: widget review hiện trên storefront của shop chứ không phải domain LAI, nên mục này ít quan trọng hơn Security.'])),
      { h: 'Trên dashboard', html: shot('zone-ai', 'AI Crawl Control → Overview: tóm tắt số request bot AI, đường bị cào nhiều nhất, và các nhà cung cấp (Google, OpenAI, Microsoft, Anthropic, Apple).') },
    ] },

  { id: 'zone-agent', group: G, title: 'Agent Readiness (beta)',
    lead: 'Ngược với AI Crawl Control: giúp AI agent dùng được site của bạn.',
    sections: [
      ...four(ul(['AI agent (trợ lý tự đi đặt hàng, tra cứu thay người) đọc site rất kém nếu site toàn JS, popup, captcha.']),
        ul(['<b>Diagnostics</b>: quét site, chấm mức "thân thiện với agent", gợi ý sửa (do AI sinh, docs ghi rõ có thể sai).', '<b>Markdown for Agents</b>, <b>WebMCP</b>: cho agent đọc nội dung và gọi chức năng của site theo cách có cấu trúc.']),
        ul(['Quét <code>https://phuoc-review-app-1.uk</code> ra <b>HTTP 530</b>: domain gốc (apex) không có app nào chạy, nên không có gì để chấm.', 'Chưa cần học sâu. Chỉ nhớ: Cloudflare đang thêm nhiều thứ cho AI, mục nào có chữ Beta thì dễ đổi.'])),
      { h: 'Trên dashboard', html: shot('zone-agent', 'Agent Readiness → Diagnostics: quét domain gốc bị 530.') },
    ] },

  { id: 'zone-analytics', group: G, title: 'Analytics và Observability',
    lead: 'Xem ai đang gọi vào domain: đường dẫn nào, từ nước nào, IP nào, mã trả về gì.',
    sections: [
      ...four(ul(['Server chỉ thấy request đã tới nó. Request bị Cloudflare chặn, hoặc được trả từ cache, server không hề biết.', 'Khi có sự cố (trang chậm, lỗi 5xx, bị quét) cần nhìn từ phía edge mới đủ.']),
        ul(['<b>Analytics</b>: đếm request theo đường dẫn, quốc gia, IP, mã HTTP, cache hay không.', '<b>Observability → Logs/Traces</b>: tra từng request bằng ngôn ngữ truy vấn.', '<b>Logpush</b>: đẩy log ra kho riêng (R2, S3…) để giữ lâu. Gói nào có những gì: xem lại khi cần, chưa kiểm.']),
        ul(['Top đường dẫn 26/11: <code>/hoc/cloudflare/</code>, <code>data.js</code>… (chính là lúc mình kiểm trang học), và <b><code>/debug.php</code> 12 lần</b>: bot quét tìm file lộ cấu hình, site không có PHP nên vô hại.', 'Top quốc gia: Hà Lan 317, Mỹ 206, Hồng Kông 179, <b>nhiều hơn Việt Nam (128)</b>. Phần lớn là bot quét và crawler, không phải người dùng.', 'Đây là chỗ xem đầu tiên khi nghi bị tấn công hoặc khi cần biết "đổi cái này có ai bị ảnh hưởng không".'])),
      { h: 'Trên dashboard', html: shot('zone-analytics', 'Analytics: request theo đường dẫn, quốc gia, IP (đã che).') },
    ] },

  { id: 'zone-dns', group: G, title: 'DNS: bản ghi, cam/xám, TTL, type',
    lead: 'DNS trả lời câu "tên miền này ở đâu". Ở Cloudflare nó còn quyết định request có đi qua Cloudflare hay không.',
    sections: [
      ...four(ul(['Người dùng gõ tên, máy cần IP. Phải có chỗ ghi "tên này → IP kia".', 'Muốn dùng proxy/cache/WAF của Cloudflare thì DNS phải trả IP của Cloudflare thay vì IP server.']),
        ul(['Mỗi bản ghi A/AAAA/CNAME có công tắc <b>Proxy status</b>: cam (Proxied) hoặc xám (DNS only).', 'Cam: DNS trả IP Cloudflare (<code>104.21.x</code>, <code>172.67.x</code>), giấu IP server. Xám: trả IP thật.']),
        table(['Tên', 'Để', 'Vì sao'], [
          ['<code>bai.</code>, <code>simple-vocab.</code>, <code>english.</code> (app trên VPS)', 'Cam', 'Có HTTPS miễn phí (gateway VPS chỉ nghe cổng 80), giấu IP, cache file tĩnh'],
          ['<code>image.</code> (R2), <code>abc.</code>/<code>auth.</code> (Tunnel)', 'Cam, bắt buộc', 'Custom domain R2 và Tunnel chỉ chạy qua proxy'],
          ['<code>phuoc-app-review.uk</code> (app dev LAI)', 'Cam (đổi 26/11)', 'Trước để xám: ai dig cũng thấy IP server'],
          ['SSH, MySQL, Elasticsearch', 'Không dùng tên / xám', 'Cam không chuyển tiếp SSH, MySQL. Dùng <code>~/.ssh/config</code> để có tên dễ nhớ mà không lộ IP'],
          ['MX, TXT (SPF/DKIM) của mail', 'Không có công tắc', 'Chỉ là thông tin tra cứu']])),
      { h: 'Khi nào cam, khi nào xám', html: ul(['Trình duyệt người khác mở bằng <code>https://</code> → <b>cam</b>.', 'Không phải web (SSH, mail, DB), cần đi thẳng, hoặc dịch vụ bên ngoài yêu cầu → <b>xám</b>.', 'Cam gây hại khi: request &gt; ~100 giây (524), upload &gt; 100 MB (gói Free), webhook/API đối tác bị luật Bot chặn nhầm.']) },
      { h: 'TTL', html: ul(['Số giây máy phân giải DNS (nhà mạng, 8.8.8.8…) được giữ câu trả lời trước khi hỏi lại. Auto = 300 giây.', '<b>Xám</b>: TTL do bạn chọn. Dài thì đổi IP server lâu có hiệu lực; trước khi chuyển server nên hạ TTL thấp vài giờ trước.', '<b>Cam</b>: TTL khoá ở Auto. Người dùng chỉ biết IP Cloudflare (gần như không đổi); đổi IP server thì chỉ Cloudflare biết và áp dụng gần như ngay.']) },
      { h: 'Các type hay gặp', html: table(['Type', 'Dùng để', 'Ví dụ'], [
        ['A', 'Tên → IPv4', 'Mỗi app trên VPS'], ['AAAA', 'Tên → IPv6', '—'],
        ['CNAME', 'Tên → một tên khác', 'Xác minh SendGrid, <code>_acme-challenge</code> (xin chứng chỉ), nối Vercel/Shopify. Tunnel và R2 cũng là CNAME bên dưới'],
        ['MX', 'Mail tới <code>@domain</code> giao cho server nào', 'Bản ghi <code>cf-bounce</code> của Email Sending'],
        ['TXT', 'Chữ để bên khác kiểm', 'SPF, DKIM, DMARC, xác minh Google'],
        ['NS', 'Ai quản lý DNS', '<code>*.ns.cloudflare.com</code>'], ['CAA', 'CA nào được cấp chứng chỉ', '—']])
        + '<p>Mẹo: bên kia đưa <b>IP</b> thì tạo A, đưa <b>một tên miền</b> thì tạo CNAME. CERT, DNSKEY, DS, LOC, NAPTR, SSHFP, TLSA… gần như không đụng tới.</p>' },
      { h: 'Trên dashboard', html: shot('dns', 'DNS → Records: cột Proxy status (đám mây cam), loại Tunnel và R2.') + shot('zone-dns-settings', 'DNS → Settings: nameserver của Cloudflare, DNSSEC (chống giả câu trả lời DNS).') },
    ] },

  { id: 'zone-email', group: G, title: 'Email (DMARC, Email Security)',
    lead: 'Phần email ở cấp domain lo chuyện người khác giả mạo mail mang tên domain của bạn. Gửi mail thì là Email Sending ở cấp account.',
    sections: [
      ...four(ul(['Ai cũng có thể gửi mail ghi From <code>support@domain-cua-ban</code>. Không có gì chặn thì kẻ lừa đảo mạo danh bạn được, và mail thật của bạn cũng dễ bị vào spam.']),
        ul(['3 bản ghi TXT: <b>SPF</b> (server nào được gửi thay domain), <b>DKIM</b> (chữ ký số trong mail), <b>DMARC</b> (mail không đạt SPF/DKIM thì bên nhận xử lý thế nào, và gửi báo cáo về đâu).', '<b>DMARC Management</b>: Cloudflare nhận và tóm tắt báo cáo DMARC, cho thấy ai đang gửi mail mang tên domain.', '<b>Email Security</b> (DNS → Settings): tạo nhanh các bản ghi cần thiết.']),
        ul(['DNS zone cá nhân đang có gợi ý "Email cannot reach @phuoc-review-app-1.uk addresses and they could be spoofed": chưa có MX và chưa có SPF/DKIM/DMARC cho domain gốc.', 'Domain gửi mail thật (<code>email.phuoc-app-review.uk</code>, <code>mail.laireviews.io</code>) thì Email Sending tự thêm SPF/DKIM khi onboard.'])),
    ] },

  { id: 'zone-ssl', group: G, title: 'SSL/TLS: chế độ, chứng chỉ, tấn công người đứng giữa',
    lead: 'Request đi qua 2 đoạn: trình duyệt → Cloudflare, rồi Cloudflare → server. Mục này quyết định mỗi đoạn được mã hoá thế nào.',
    sections: [
      { h: 'Hai đoạn đường', html: flow([['Trình duyệt'], ['Cloudflare', 'pass'], ['Server']]) + ul(['<b>Đoạn 1</b>: luôn HTTPS, Cloudflare tự cấp chứng chỉ (Edge Certificates).', '<b>Đoạn 2</b>: do chế độ bạn chọn.']) },
      { h: 'Các chế độ', html: table(['Chế độ', 'Đoạn 2', 'Server cần', 'Kẻ đứng giữa đọc được?'], [
        ['Off', 'Không mã hoá cả 2 đoạn', '—', 'Có'],
        ['Flexible', 'HTTP trần', 'Cổng 80', '<b>Có, đọc thẳng</b>'],
        ['Full', 'HTTPS, không kiểm chứng chỉ', 'Cổng 443, chứng chỉ bất kỳ (tự ký được)', 'Có, nếu làm giả chứng chỉ'],
        ['Full (strict)', 'HTTPS + kiểm chứng chỉ', 'Chứng chỉ hợp lệ (Let’s Encrypt hoặc Origin Certificate)', 'Không'],
        ['Automatic', 'Cloudflare tự dò và chọn mức cao nhất server chạy được', '—', 'Tuỳ mức đang chạy']]) },
      { h: 'Chứng chỉ và chứng chỉ tự ký', html: ul(['<b>Chứng chỉ</b> = căn cước của server: tên miền + khoá công khai + chữ ký của một CA đáng tin (Let’s Encrypt, DigiCert…).', '<b>Tự ký</b> = server tự làm căn cước, tự đóng dấu. Vẫn mã hoá được nhưng không chứng minh được danh tính, vì ai cũng tự làm được cái y hệt.', '<b>Cloudflare Origin Certificate</b> (SSL/TLS → Origin Server): miễn phí, hạn 15 năm, <b>chỉ Cloudflare tin</b>. Dùng được khi tên miền luôn để cam.']) },
      { h: 'Tấn công người đứng giữa (chế độ Full)', html: flow([['Cloudflare'], ['Kẻ đứng giữa (chứng chỉ tự ký giả)', 'stop'], ['Server thật']])
        + '<ol><li>Cloudflare gọi về IP server, nhưng đường đi bị chặn ở giữa (router hosting bị chiếm, giả tuyến BGP, chung mạng data center).</li><li>Kẻ đứng giữa đưa chứng chỉ tự ký. Full chấp nhận mọi chứng chỉ nên vẫn nói chuyện.</li><li>Hắn giải mã, đọc cookie/token/dữ liệu, rồi chuyển tiếp sang server thật. Không bên nào biết.</li></ol>'
        + '<p>Full (strict) đòi chứng chỉ do CA tin cậy ký, đúng tên miền → kẻ đứng giữa không làm giả được → Cloudflare ngắt và báo <code>526</code>. Rủi ro thực tế thấp vì khó đứng được vào giữa, nhưng strict chặn được với cái giá chỉ là cài một chứng chỉ.</p>' },
      { h: 'Automatic hay Full (strict) chọn tay', html: table(['', 'Automatic', 'Full (strict) chọn tay'], [
        ['Chứng chỉ chưa hợp lệ', 'Tự dừng ở Full, trang không sập', 'Lỗi 526, trang chết ngay'],
        ['Cài chứng chỉ hợp lệ sau', 'Tự nâng lên strict (dần dần)', 'Hết lỗi'],
        ['Hợp với', 'Server dev', 'Production, kèm theo dõi chứng chỉ hết hạn']]) },
      { h: 'Chuyển production sang strict an toàn', html: '<ol><li>Cài chứng chỉ hợp lệ cho <b>mọi</b> tên đang để cam (chế độ áp cả zone).</li><li>Chọn Automatic trước, chờ vài giờ: "Currently running" lên Full (strict) thì mới ghim tay strict.</li><li>Theo dõi 526; lỗi thì đổi lại Full trên dashboard, có hiệu lực trong vài giây, không cần deploy.</li></ol>' },
      { h: 'Trong stack của mình', html: ul(['Zone VPS cá nhân: <b>Flexible</b> (gateway chỉ nghe cổng 80). Muốn lên strict: mở 443 trên gateway + Origin Certificate.', 'Zone app dev LAI: <b>Full</b> (nginx dev dùng chứng chỉ tự ký).', 'Gõ <code>http://phuoc-app-review.uk</code> ra <b>521</b>: ở Full, khách gõ http thì Cloudflare gọi http về cổng 80 mà server không nghe. Sửa: Edge Certificates → <b>Always Use HTTPS</b>.', 'Ô "None (not secure)" trong Traffic Served Over TLS = số request khách gõ <code>http://</code>.', 'Edge Certificates gói Free: một chứng chỉ Universal cho <code>domain</code> và <code>*.domain</code> (một cấp), tự gia hạn. Tên nhiều cấp như <code>a.b.domain</code> <b>không</b> nằm trong chứng chỉ này.']) },
      { h: 'Trên dashboard', html: shot('ssl', 'SSL/TLS → Overview: chế độ đang chạy (Flexible) và số request theo phiên bản TLS.') + shot('zone-ssl-edge', 'Edge Certificates: chứng chỉ Universal (domain + *.domain) và bản dự phòng, Cloudflare tự quản lý và gia hạn.') + shot('zone-ssl-origin', 'Origin Server: tạo Origin Certificate miễn phí để cài lên server, chỉ Cloudflare tin.') },
    ] },

  { id: 'zone-security', group: G, title: 'Security',
    lead: 'Chặn request xấu ở edge, trước khi chúng tới server.',
    sections: [
      ...four(ul(['Site công khai nào cũng bị bot quét lỗ hổng (<code>/debug.php</code>, <code>/.env</code>, <code>/wp-admin</code>), thử SQL injection, spam form, DDoS.', 'Chặn ở server thì server vẫn tốn sức nhận và xử lý từng request.']),
        ul(['<b>Cloudflare managed ruleset</b> (WAF): luật do Cloudflare viết, bắt các mẫu tấn công phổ biến. Bản Free luôn bật.', '<b>Bot Fight Mode</b>: thách thức bot bị nghi. Phủ cả zone, không loại trừ theo đường dẫn được.', '<b>Security rules</b>: luật tự viết (chặn nước, chặn đường dẫn, rate limit; Free được 1 luật rate limit).', '<b>Analytics → Events</b>: từng request bị chặn, vì luật nào.', '<b>Overview</b>: gợi ý cấu hình (bật Bot Fight Mode, AI Labyrinth, security.txt).']),
        ul(['Zone cá nhân: Managed rules chặn request từ Hồng Kông, Singapore, Mỹ, Hà Lan trong 24 giờ.', 'Bẫy với app nhận webhook/API từ server khác: luật Bot/WAF quá chặt có thể chặn nhầm. Webhook Shopify bị lỗi 8 lần liên tiếp thì Shopify xoá subscription.', 'Gặp <code>403</code> lạ (trang HTML của Cloudflare thay vì JSON của app) → xem Events trước.'])),
      { h: 'Trên dashboard', html: shot('security', 'Security → Analytics → Events: request bị chặn, quốc gia, IP (đã che), luật chặn.') + shot('zone-security-overview', 'Security → Overview: gợi ý cấu hình và tổng quan 30 ngày.') + shot('zone-security-settings', 'Security → Settings: Cloudflare managed ruleset luôn bật, gắn nhãn Web application exploits, DDoS attacks, Bot traffic.') },
    ] },

  { id: 'zone-access', group: G, title: 'Access',
    lead: 'Đặt một màn đăng nhập trước app, mà không phải sửa code app.',
    sections: [
      ...four(ul(['App nội bộ (admin, staging, Horizon, Kibana, tool nội bộ) không nên ai cũng vào được.', 'Tự làm đăng nhập cho từng tool thì tốn công, dùng basic auth chung một mật khẩu thì dễ lộ.']),
        ul(['Request tới đường dẫn được bảo vệ → Cloudflare bắt đăng nhập (Google, GitHub, mã gửi email…) và kiểm theo chính sách (vd chỉ email <code>@congty.com</code>) → đạt mới cho qua tới server.', 'Khác WAF: WAF chặn <b>request xấu</b>; Access chặn <b>người không đủ quyền</b>, kể cả request hoàn toàn bình thường.', 'Bảo vệ được cả SSH, RDP, database qua Tunnel, không cần VPN.']),
        ul(['Ví dụ hợp: trang Horizon/tool nội bộ trên dev (note cũ ghi dev không có basic auth cho Horizon).', 'Gói Free của Zero Trust có giới hạn số người dùng; xem lại khi dùng thật.'])),
      { h: 'Trên dashboard', html: shot('zone-access', 'Access: giới thiệu "Put your applications behind a login screen" và khác biệt với WAF.') },
    ] },

  { id: 'zone-speed', group: G, title: 'Speed',
    lead: 'Đo tốc độ trang thật của người dùng và bật các tối ưu ở edge.',
    sections: [
      ...four(ul(['Trang chậm thì mất khách, và điểm Core Web Vitals ảnh hưởng SEO. Cần đo bằng người dùng thật, không chỉ máy dev.']),
        ul(['<b>Observatory</b>: chạy kiểm tra tốc độ (Lighthouse) định kỳ, kèm gợi ý.', '<b>Real user monitoring (RUM)</b>: chèn một đoạn JS beacon vào trang để đo tốc độ ở trình duyệt thật.', '<b>Settings</b>: tối ưu ảnh (Image Transformations, Polish: gói trả phí), nội dung (nén, Early Hints), giao thức (HTTP/3…).', '<b>Smart Shield</b>: gói giảm tải cho origin (gồm Argo Smart Routing).']),
        ul(['Zone cá nhân đang <b>bật RUM</b> → Cloudflare chèn <code>static.cloudflareinsights.com/beacon.min.js</code> vào mọi trang HTML. Đây chính là dòng lỗi console thấy lúc kiểm trang học bằng Playwright, không phải lỗi code trang.', 'LAI đã cân nhắc và <b>không dùng</b> Image Transformations (tính tiền theo biến thể, URL công khai dễ bị lạm dụng).'])),
      { h: 'Trên dashboard', html: shot('zone-speed-settings', 'Speed → Settings: Recommendations, Measurement (RUM đang Enabled), Image Optimization.') },
    ] },

  { id: 'zone-caching', group: G, title: 'Caching',
    lead: 'Giữ bản sao file tĩnh ở edge để trả nhanh và đỡ tải server.',
    sections: [
      ...four(ul(['Mỗi lần người dùng tải ảnh/JS/CSS mà phải về server thì chậm (xa) và server tốn băng thông.']),
        ul(['Cloudflare giữ response <b>theo từng URL, từng data center</b>, chỉ khi có người hỏi (MISS lần đầu, HIT lần sau).', '<b>Configuration</b>: Purge, Caching Level, <b>Browser Cache TTL</b>. <b>Cache Rules</b>: cache thêm hoặc bớt theo đường dẫn. <b>Tiered Cache</b>: data center gần origin làm tầng trên, giảm số lần về origin. <b>Cache Reserve</b>: lưu bền trên R2 (trả phí).']),
        ul(['Bằng chứng trang học: HTML trả <code>cf-cache-status: DYNAMIC</code> (không cache), <code>data.js</code> <code>MISS</code> + <code>max-age=14400</code> (giữ 4 giờ).', 'Vì cache theo URL nên deploy gắn <code>?v=&lt;commit&gt;</code> cho JS/CSS: đổi bản là đổi URL, khỏi chờ 4 giờ.', 'API/JSON/trang đăng nhập mặc định <b>không</b> cache, nên bật cam không làm dữ liệu người này lộ sang người kia. Chỉ khi tự tạo luật "Cache Everything" mới phải cẩn thận.'])),
      { h: 'Mặc định', html: ul(['Cache theo đuôi file (js, css, jpg…), không xét Content-Type. HTML, JSON không cache.', 'Cache key gồm cả query string: <code>a.js?v=2</code> là bản khác <code>a.js</code>. Tên khác nhau (<code>bai.</code>, <code>simple-vocab.</code>) cache riêng dù cùng IP.', 'Server không gửi Cache-Control → edge giữ 2 giờ; trình duyệt giữ theo Browser TTL (mặc định 4 giờ).', 'Có <code>Set-Cookie</code> hoặc <code>Cache-Control: no-cache/no-store/private</code> thì không cache.']) },
      { h: 'Bẫy', html: callout('bad', 'Purge rồi mà người dùng vẫn thấy bản cũ', 'Purge chỉ xoá ở edge, không xoá bản trong trình duyệt. File đổi nội dung tại cùng URL thì nên đổi URL (thêm <code>?v=&lt;commit&gt;</code>) thay vì trông vào purge.') },
      { h: 'Trên dashboard', html: shot('caching', 'Caching → Configuration: Purge Cache, Caching Level, Browser Cache TTL 4 giờ.') + shot('zone-cache-rules', 'Cache Rules: chưa có luật nào.') + shot('zone-tiered-cache', 'Tiered Cache: Smart Tiered Cache tự chọn tầng trên gần origin.') },
    ] },

  { id: 'zone-workers-routes', group: G, title: 'Workers Routes',
    lead: 'Cho một đoạn code của bạn (Worker) chạy ở edge với các URL khớp mẫu.',
    sections: [
      ...four(ul(['Có việc muốn làm <b>trước khi</b> request tới server mà cấu hình sẵn không đủ: ghép header, A/B test, kiểm token, gọi nhiều backend rồi gộp, trả lời luôn không cần server.']),
        ul(['Viết Worker (JavaScript), rồi tạo route kiểu <code>example.com/api/*</code> → Worker. Request khớp route chạy qua code của bạn ở edge.']),
        ul(['LAI và zone cá nhân hiện không có Worker nào.', 'Bẫy đã gặp ở LAI: request đi qua 2 chặng Cloudflare (Worker của bên khác) có thể giả IP bằng <code>X-Forwarded-For</code>; app phải lấy IP từ <code>CF-Connecting-IP</code>.'])),
      { h: 'Trên dashboard', html: shot('zone-workers-routes', 'Workers Routes của zone.') },
    ] },

  { id: 'zone-rules', group: G, title: 'Rules',
    lead: 'Sửa request/response theo điều kiện, mà không đụng code server.',
    sections: [
      ...four(ul(['Hay cần những việc nhỏ: chuyển <code>www</code> về domain gốc, đổi đường dẫn cũ sang mới, thêm header bảo mật, tắt một tính năng cho riêng một đường dẫn. Sửa code rồi deploy cho từng việc thì chậm.']),
        ul(['<b>Redirect Rules</b>: chuyển hướng. <b>URL Rewrite</b>: đổi đường dẫn trước khi gửi về server. <b>Request/Response Header Transform</b>: thêm/xoá header. <b>Configuration Rules</b>: bật/tắt tính năng theo điều kiện (vd tắt Bot Fight Mode cho <code>/webhooks</code>). <b>Compression Rules</b>, <b>Snippets</b> (đoạn code nhỏ).', 'Chạy theo thứ tự từ trên xuống, nhiều luật cùng sửa một thứ thì <b>luật chạy sau thắng</b>.', '<b>Page Rules</b> là kiểu cũ, đã bị thay bằng các loại rule trên. <b>Rule simulator</b>: thử một URL xem luật nào khớp.']),
        ul(['Zone cá nhân chưa có luật nào.', 'Gợi ý hữu ích: luật chuyển <code>http</code> → <code>https</code> hoặc bật Always Use HTTPS, tránh lỗi 521 ở zone dev.'])),
      { h: 'Trên dashboard', html: shot('zone-rules', 'Rules → Overview: danh sách các loại rule, hiện đều trống.') },
    ] },

  { id: 'zone-error-pages', group: G, title: 'Error Pages',
    lead: 'Thay trang lỗi mặc định của Cloudflare bằng trang của bạn.',
    sections: [
      ...four(ul(['Server chết thì người dùng thấy trang 52x màu xám của Cloudflare. Với API thì tệ hơn: client đợi JSON mà nhận HTML, code <code>res.json()</code> lỗi theo.']),
        ul(['Custom Errors: trả HTML, JSON, XML hoặc text theo mã lỗi, nguồn lỗi, quốc gia… Viết trực tiếp hoặc lấy từ một trang đã thiết kế.', 'Gói Pro trở lên mới có.']),
        ul(['Gói Free nên chưa dùng được. Code phía client phải tự chịu được response không phải JSON.'])),
      { h: 'Trên dashboard', html: shot('zone-error-pages', 'Error Pages: Custom Errors, chỉ có ở gói Pro, Business, Enterprise.') },
    ] },

  { id: 'zone-network', group: G, title: 'Network',
    lead: 'Các công tắc giao thức giữa người dùng, Cloudflare và server.',
    sections: [
      ...four(ul(['Server có thể chỉ hỗ trợ IPv4, app cần WebSocket hay gRPC, app muốn biết khách ở nước nào…']),
        ul(['<b>IPv6 Compatibility</b>: người dùng vào bằng IPv6 dù server chỉ có IPv4. <b>WebSockets</b>, <b>gRPC</b>: cho các kết nối này đi qua proxy. <b>Pseudo IPv4</b>: thêm header IPv4 giả cho server không hiểu IPv6.', '<b>IP Geolocation</b>: thêm header <code>CF-IPCountry</code> (mã quốc gia của khách) vào request gửi về server.']),
        ul(['LAI đọc <code>CF-IPCountry</code> để đoán quốc gia của khách (helpers, Mixpanel, RUM). Tắt IP Geolocation là các chỗ đó rơi về giá trị mặc định.', '<code>XX</code> = không rõ quốc gia, <code>T1</code> = mạng Tor.'])),
      { h: 'Trên dashboard', html: shot('zone-network', 'Network: IPv6, gRPC, WebSockets, Pseudo IPv4, IP Geolocation.') },
    ] },

  { id: 'zone-traffic', group: G, title: 'Traffic',
    lead: 'Khi có nhiều server, hoặc lượng truy cập tăng đột biến.',
    sections: [
      ...four(ul(['Một server duy nhất = một điểm chết: server lỗi là cả site lỗi.', 'Lúc mở bán/khuyến mãi, lượng người vào cùng lúc có thể làm sập server.']),
        ul(['<b>Load Balancing</b>: nhiều origin, chia tải, server chết thì tự chuyển sang server khác (dùng Health Checks). Trả phí.', '<b>Health Checks</b>: Cloudflare gọi định kỳ vào server và báo khi lỗi.', '<b>Waiting Room</b>: quá đông thì cho khách xếp hàng ở trang chờ thay vì để server sập.', '<b>Argo Smart Routing</b>: đi đường mạng nhanh hơn giữa Cloudflare và server ($5/tháng cho GB đầu, $0,10/GB sau đó, nay thuộc Smart Shield).']),
        ul(['Chưa dùng. Nhớ để dành khi một server không còn đủ, hoặc khi cần failover thật.'])),
      { h: 'Trên dashboard', html: shot('zone-traffic', 'Traffic → Argo Smart Routing: giá theo GB.') + shot('zone-load-balancing', 'Traffic → Load Balancing.') },
    ] },
];

// Chèn trước nhóm "Công cụ"
(() => { const i = PAGES.findIndex((p) => p.group === 'Công cụ'); PAGES.splice(i < 0 ? PAGES.length : i, 0, ...ZONE_PAGES); })();
