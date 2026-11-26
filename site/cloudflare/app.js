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
  document.title = p.title + ' · Học Cloudflare';
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

