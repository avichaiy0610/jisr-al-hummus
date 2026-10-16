// Everything on top of the 3D village: loading screen, header, tabs, search, house card, residents book, "more".
import { HEADER, TABS, SEARCH, HOUSE, MINE, PEOPLE, MORE, LOADING, INSTAGRAM_HANDLE } from './copy.js';
import { normalize } from './shared/username.js';
import { address } from './shared/layout.js';
import { isDemo, findHouse, listPage, ownerOf } from './data.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = n => n.toLocaleString('he-IL');
const STORE = 'jisr.mine';

const store = {
  get() { try { return JSON.parse(localStorage.getItem(STORE)); } catch { return null; } },
  set(v) { try { v ? localStorage.setItem(STORE, JSON.stringify(v)) : localStorage.removeItem(STORE); } catch { /* private mode */ } },
};

export function startLoading() {
  const el = $('joke'), started = performance.now();
  const order = [...LOADING].sort(() => Math.random() - 0.5);
  let i = 0;
  const show = () => {
    el.style.opacity = 0;
    setTimeout(() => { el.textContent = order[i++ % order.length]; el.style.opacity = 1; }, 220);
  };
  el.textContent = order[i++];
  const timer = setInterval(show, 1900);
  return async (finalText) => {
    if (finalText) { clearInterval(timer); el.textContent = finalText; return; }
    const wait = 1600 - (performance.now() - started);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    clearInterval(timer);
    $('loading').classList.add('done');
    setTimeout(() => $('loading').remove(), 600);
  };
}

export function initUI({ meta, layout, village }) {
  const sheet = $('sheet'), body = $('sheet-body');
  let tab = null, peoplePage = 0;

  $('title').textContent = HEADER.title;
  $('subtitle').textContent = HEADER.subtitle;
  $('counter').innerHTML = esc(HEADER.count(meta.count, meta.day)) + (isDemo ? `<span class="demo">${esc(HEADER.demo)}</span>` : '');
  for (const b of $('tabs').querySelectorAll('button')) {
    b.querySelector('span').textContent = TABS[b.dataset.tab];
    b.addEventListener('click', () => (tab === b.dataset.tab ? close() : open(b.dataset.tab)));
  }
  $('close').addEventListener('click', close);
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  function setTab(name) {
    tab = name;
    for (const b of $('tabs').querySelectorAll('button')) {
      if (b.dataset.tab === name) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    }
  }
  const wide = matchMedia('(min-width: 860px)');
  function syncInset() {
    if (sheet.hidden) village.setInset(0, 0);
    else if (wide.matches) village.setInset(sheet.offsetWidth + 16, 0);
    else village.setInset(0, sheet.offsetHeight);
  }
  new ResizeObserver(syncInset).observe(sheet);
  wide.addEventListener('change', syncInset);
  function close() { sheet.hidden = true; setTab(null); syncInset(); }
  function show(html, name = tab) {
    setTab(name);
    body.innerHTML = html;
    sheet.hidden = false;
    sheet.scrollTop = 0;
    syncInset();
  }
  function toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  const followLink = () => INSTAGRAM_HANDLE
    ? `<p><a class="btn ghost" href="https://www.instagram.com/${esc(INSTAGRAM_HANDLE)}/" target="_blank" rel="noopener">${esc(SEARCH.follow)}</a></p>` : '';

  // ---------- house card ----------
  function houseCard(n, owner) {
    const { street } = address(layout, n);
    const mine = store.get();
    let inner;
    if (owner === undefined) inner = `<p class="msg">${esc(HOUSE.unbuilt)}</p>`;
    else if (owner === null) inner = `<h3>${esc(HOUSE.vacantTitle)}</h3><p>${esc(HOUSE.vacant)}</p>`;
    else {
      const notes = [n % HOUSE.notes.length, (n * 7 + 3) % HOUSE.notes.length];
      if (notes[1] === notes[0]) notes[1] = (notes[0] + 1) % HOUSE.notes.length;
      inner = `
        <p class="who">${esc(HOUSE.owner)}: <b>@${esc(owner)}</b></p>
        <ul>${notes.map(i => `<li>${esc(HOUSE.notes[i])}</li>`).join('')}</ul>
        <div class="row">
          ${mine?.n === n ? '' : `<button class="btn" data-act="save">${esc(HOUSE.save)}</button>`}
          <button class="btn ghost" data-act="share">${esc(HOUSE.share)}</button>
          <button class="btn ghost" data-act="go">${esc(HOUSE.go)}</button>
        </div>`;
    }
    return `<div class="card" data-n="${n}" data-u="${esc(owner ?? '')}">
      <div class="plate"><span class="street">${esc(street)}</span><span class="num">${fmt(n)}</span></div>
      ${inner}
    </div>`;
  }

  body.addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const card = btn.closest('.card');
    const n = Number(card?.dataset.n), u = card?.dataset.u;
    const act = btn.dataset.act;
    if (act === 'save') {
      store.set({ n, u });
      village.setMine(n);
      btn.remove();
      toast(HOUSE.saved);
    } else if (act === 'share') {
      const url = new URL(location.pathname, location.origin);
      url.searchParams.set('u', u);
      if (isDemo) url.searchParams.set('demo', '');
      const text = HOUSE.shareText(address(layout, n).street, n);
      try {
        if (navigator.share) await navigator.share({ title: HEADER.title, text, url: url.href });
        else { await navigator.clipboard.writeText(`${text} ${url.href}`); toast(HOUSE.copied); }
      } catch { /* share sheet dismissed */ }
    } else if (act === 'go') {
      village.flyToHouse(n);
    } else if (act === 'forget') {
      store.set(null);
      village.setMine(0);
      open('mine');
    } else if (act === 'find') {
      open('search');
    } else if (act === 'page') {
      peoplePage = Number(btn.dataset.p);
      renderPeople();
    } else if (act === 'resident') {
      const k = Number(btn.dataset.n);
      village.flyToHouse(k);
      showHouse(k);
    }
  });

  async function showHouse(n, known) {
    const owner = known !== undefined ? known : await ownerOf(n).catch(() => undefined);
    show(houseCard(n, owner));
  }

  // ---------- search ----------
  function renderSearch(prefill = '') {
    if (!meta.count) { show(`<h2>${esc(SEARCH.title)}</h2><p class="msg">${esc(SEARCH.empty)}</p>${followLink()}`, 'search'); return; }
    show(`
      <h2>${esc(SEARCH.title)}</h2>
      <p class="lead">${esc(SEARCH.lead)}</p>
      <form class="search" id="search-form" autocomplete="off">
        <input id="q" name="q" inputmode="text" autocapitalize="none" spellcheck="false" aria-label="${esc(SEARCH.placeholder)}" placeholder="${esc(SEARCH.placeholder)}" value="${esc(prefill)}">
        <button class="btn" type="submit">${esc(SEARCH.button)}</button>
      </form>
      <div id="result"></div>`, 'search');
    $('search-form').addEventListener('submit', e => { e.preventDefault(); search($('q').value); });
  }

  async function search(raw) {
    const out = $('result');
    const u = normalize(raw);
    if (!u) { out.innerHTML = `<p class="msg err">${esc(SEARCH.invalid)}</p>`; return; }
    out.innerHTML = `<p class="msg">${esc(SEARCH.busy)}</p>`;
    let n;
    try { n = await findHouse(u); } catch { n = null; }
    if (!n) { out.innerHTML = `<p class="msg err">${esc(SEARCH.notFound(u))}</p>${followLink()}`; return; }
    out.innerHTML = houseCard(n, u);
    out.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    village.flyToHouse(n);
  }

  // ---------- my house ----------
  async function renderMine() {
    const mine = store.get();
    if (!mine?.n) {
      show(`<h2>${esc(MINE.title)}</h2><p class="lead">${esc(MINE.none)}</p><button class="btn" data-act="find">${esc(MINE.find)}</button>`, 'mine');
      return;
    }
    const owner = await ownerOf(mine.n).catch(() => undefined);
    show(`<h2>${esc(MINE.title)}</h2>${houseCard(mine.n, owner)}
      <p><button class="btn ghost" data-act="forget">${esc(MINE.forget)}</button></p>`, 'mine');
    village.flyToHouse(mine.n);
  }

  // ---------- residents book ----------
  async function renderPeople() {
    const per = meta.page, pages = Math.max(1, Math.ceil(meta.houses / per));
    peoplePage = Math.min(Math.max(0, peoplePage), pages - 1);
    const from = peoplePage * per + 1, to = Math.min(meta.houses, from + per - 1);
    let rows = '';
    if (meta.houses) {
      const list = await listPage(peoplePage).catch(() => []);
      rows = list.map((u, i) => `<li><button data-act="resident" data-n="${from + i}">
        <span class="n">${fmt(from + i)}</span>
        ${u ? `<span class="u">@${esc(u)}</span>` : `<span class="vac">${esc(PEOPLE.vacant)}</span>`}
      </button></li>`).join('');
    }
    show(`
      <h2>${esc(PEOPLE.title)}</h2>
      <p class="lead">${esc(PEOPLE.lead)}</p>
      ${meta.houses ? `
      <div class="pager">
        <button class="btn ghost" data-act="page" data-p="${peoplePage - 1}" ${peoplePage ? '' : 'disabled'}>${esc(PEOPLE.prev)}</button>
        <span>${esc(PEOPLE.range(from, to))}</span>
        <button class="btn ghost" data-act="page" data-p="${peoplePage + 1}" ${peoplePage < pages - 1 ? '' : 'disabled'}>${esc(PEOPLE.next)}</button>
      </div>
      <form class="jump" id="jump"><input type="number" min="1" max="${meta.houses}" inputmode="numeric" placeholder="${esc(PEOPLE.jump)}" aria-label="${esc(PEOPLE.jump)}"><button class="btn ghost">↵</button></form>
      <ul class="people">${rows}</ul>` : `<p class="msg">${esc(SEARCH.empty)}</p>`}`, 'people');
    $('jump')?.addEventListener('submit', e => {
      e.preventDefault();
      const n = Math.round(Number(e.target.querySelector('input').value));
      if (n >= 1 && n <= meta.houses) { village.flyToHouse(n); showHouse(n); }
    });
  }

  // ---------- more ----------
  function renderMore() {
    const sections = MORE.sections.map(s => `<h3>${esc(s.title)}</h3>${
      s.body ? s.body.map(p => `<p>${esc(p)}</p>`).join('') : `<ol>${s.list.map(i => `<li>${esc(i)}</li>`).join('')}</ol>`}`).join('');
    const credits = MORE.credits.map(([name, url, note]) =>
      `<li>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)}</a>` : esc(name)} · <small>${esc(note)}</small></li>`).join('');
    show(`<h2>${esc(TABS.more)}</h2>${sections}${followLink()}<h3>${esc(MORE.creditsTitle)}</h3><ul class="credits">${credits}</ul>
      <p><small>עודכן: ${esc(meta.updated ?? '—')}</small></p>`, 'more');
  }

  function open(name) {
    if (name === 'search') renderSearch();
    else if (name === 'mine') renderMine();
    else if (name === 'people') renderPeople();
    else if (name === 'more') renderMore();
  }

  village.onPick(n => showHouse(n));

  // Start: remember my house; ?u=name opens straight on that house, otherwise the search sheet.
  const mine = store.get();
  if (mine?.n) village.setMine(mine.n);
  const deep = new URLSearchParams(location.search).get('u');
  renderSearch(deep ?? '');
  if (deep && meta.count) search(deep);
}
