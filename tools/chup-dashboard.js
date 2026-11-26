// Chụp màn hình dashboard Cloudflare để làm ảnh cho docs. Cách dùng: xem README, mục "Chụp ảnh dashboard".
// Gắn vào Chrome đang mở (cổng 9333), mở trang dashboard, che thông tin riêng, chụp.
// node chup.js <path sau account id | - (giữ trang)> <file.png>
// env: WAIT (ms), WAITFOR (chữ phải hiện), CLICK (các chữ cần bấm, ngăn bởi |), SCROLL (chữ cần cuộn tới), FULL=1 (chụp cả sidebar), HIDE (chữ cần che thêm, ngăn bởi |)
const { chromium } = require(process.env.PW);
(async () => {
  const [path, out] = process.argv.slice(2);
  const E = process.env;
  const b = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const pg = b.contexts()[0].pages().find((p) => p.url().startsWith('https://dash.cloudflare.com'));
  const acc = (pg.url().match(/dash\.cloudflare\.com\/([0-9a-f]{32})/) || [])[1];
  await pg.setViewportSize({ width: 1360, height: 860 });
  if (path !== '-') await pg.goto(path.startsWith('http') ? path : `https://dash.cloudflare.com/${acc}/${path}`, { waitUntil: 'domcontentloaded' });
  if (E.WAITFOR) await pg.getByText(E.WAITFOR, { exact: false }).first().waitFor({ timeout: 20000 }).catch(() => console.log('khong thay', E.WAITFOR));
  await pg.waitForTimeout(+(E.WAIT || 3000));
  for (const t of ['Got it', 'Dismiss']) { const l = pg.getByRole('button', { name: t }); if (await l.count()) await l.first().click().catch(() => {}); }
  for (const t of (E.CLICK || '').split('|').filter(Boolean)) { await pg.getByText(t, { exact: true }).first().click({ timeout: 10000 }).catch((e) => console.log('khong bam duoc', t)); await pg.waitForTimeout(2500); }
  if (E.SCROLL) await pg.getByText(E.SCROLL, { exact: true }).first().scrollIntoViewIfNeeded().then(() => pg.evaluate(() => window.scrollBy(0, 0))).catch(() => console.log('khong cuon', E.SCROLL));
  await pg.evaluate((extra) => {
    const re = [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, /\b[0-9a-f]{32}\b/gi, /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, /\b[A-Za-z0-9_-]{40,}\b/g, ...extra.map((x) => new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'))];
    const fix = (t) => { re.forEach((r) => { t = t.replace(r, '•••'); }); return t; };
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) { const t = fix(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; }
    document.querySelectorAll('input,textarea').forEach((i) => { const v = fix(i.value || ''); if (v !== i.value) i.value = v; });
  }, (E.HIDE || '').split('|').filter(Boolean));
  const opt = { path: out };
  if (!E.FULL) opt.clip = { x: 260, y: 0, width: 1100, height: 860 };
  await pg.screenshot(opt);
  console.log('OK', out.split('/').pop(), '|', pg.url().replace(/[0-9a-f]{32}/, '<acc>'));
  await b.close().catch(() => {});
})().catch((e) => { console.log('LOI', e.message.split('\n')[0]); process.exit(1); });
