// Chụp lần lượt các mục của một zone + lấy chữ mô tả trên trang (để viết docs bám đúng giao diện).
// node chup-zone.js <zone> <thư mục ảnh> <file json> ; danh sách mục ở biến ITEMS.
const { chromium } = require(process.env.PW);
const fs = require('fs');
const ITEMS = [
  ['overview', ''], ['ai', 'ai/overview'], ['agent', 'agent-readiness/diagnostics'], ['analytics', 'analytics'], ['observability', 'observability/logs'],
  ['dns-settings', 'dns/settings'], ['email-dmarc', 'email/dmarc-management'],
  ['ssl-edge', 'ssl-tls/edge-certificates'], ['ssl-origin', 'ssl-tls/origin'],
  ['security-overview', 'security/overview'], ['security-rules', 'security/security-rules'], ['security-settings', 'security/settings'],
  ['access', 'access'], ['speed', 'speed'], ['speed-settings', 'speed/optimization'],
  ['caching-overview', 'caching'], ['cache-rules', 'caching/cache-rules'], ['tiered-cache', 'caching/tiered-cache'],
  ['workers-routes', 'workers'], ['rules', 'rules/overview'], ['page-rules', 'rules/page-rules'],
  ['error-pages', 'error-pages'], ['network', 'network'], ['traffic', 'traffic'], ['load-balancing', 'traffic/load-balancing'], ['waiting-room', 'traffic/waiting-rooms'], ['web3', 'web3'],
];
(async () => {
  const [zone, imgDir, out] = process.argv.slice(2);
  const b = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const pg = b.contexts()[0].pages().find((p) => p.url().includes('dash.cloudflare.com'));
  const acc = pg.url().match(/[0-9a-f]{32}/)[0];
  await pg.setViewportSize({ width: 1360, height: 860 });
  const res = {};
  for (const [name, path] of ITEMS) {
    try {
      await pg.goto(`https://dash.cloudflare.com/${acc}/${zone}/${path}`, { waitUntil: 'domcontentloaded' });
      await pg.waitForTimeout(6000);
      for (const t of ['Got it', 'Dismiss', 'Close']) { const l = pg.getByRole('button', { name: t, exact: true }); if (await l.count()) await l.first().click().catch(() => {}); }
      const text = await pg.evaluate(() => {
        const main = document.querySelector('main') || document.body;
        const pick = [...main.querySelectorAll('h1,h2,h3,h4,p,label,dt,dd,li')].map((e) => e.innerText.trim().replace(/\s+/g, ' ')).filter((t) => t && t.length < 300);
        return [...new Set(pick)].slice(0, 80).join('\n');
      });
      await pg.evaluate(() => {
        const re = [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, /\b[0-9a-f]{32}\b/gi, /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, /\b[A-Za-z0-9_-]{40,}\b/g, /reviews-importer/gi];
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
        while ((n = w.nextNode())) { let t = n.nodeValue; re.forEach((r) => { t = t.replace(r, '•••'); }); if (t !== n.nodeValue) n.nodeValue = t; }
      });
      await pg.screenshot({ path: `${imgDir}/zone-${name}.png`, clip: { x: 260, y: 0, width: 1100, height: 860 } });
      res[name] = { url: pg.url().replace(/[0-9a-f]{32}/, '<acc>'), text: text.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '•••') };
      console.log('OK', name);
    } catch (e) { console.log('LOI', name, e.message.split('\n')[0]); }
  }
  fs.writeFileSync(out, JSON.stringify(res, null, 1));
  await b.close().catch(() => {});
})();
