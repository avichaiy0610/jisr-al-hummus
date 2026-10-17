// The append-only list of houses. residents[k] is house k+1, forever.
// Active: { u, t }. Left: { h } — the name is dropped, only its hash stays so a returning follower gets the house back.
import { sha256Hex } from '../../site/js/shared/sha256.js';

const MAX_LEFT_SHARE = 0.1, MIN_ALLOWED_LEFT = 25;   // more departures than this in one update needs --force

export function emptyRegistry() {
  return { residents: [], history: [] };
}

export function updateRegistry(prev, followers, { date, force = false }) {
  const reg = structuredClone(prev ?? emptyRegistry());
  const incoming = new Map(followers.map(f => [f.u, f]));

  // A partial export (one of several files, an old download) looks exactly like a mass unfollow. Refuse it.
  const active = reg.residents.filter(r => r.u);
  const leaving = active.filter(r => !incoming.has(r.u)).length;
  const allowed = Math.max(MIN_ALLOWED_LEFT, Math.floor(active.length * MAX_LEFT_SHARE));
  if (!force && leaving > allowed)
    throw new Error(`לפי הקובץ הזה ${leaving} מתוך ${active.length} תושבים עזבו בבת אחת. זה נראה כמו ייצוא חלקי או ישן. אם זה באמת נכון, להריץ שוב עם --force`);
  const stats = { active: 0, added: 0, left: 0, returned: 0, houses: 0 };

  const leftByHash = new Map();
  reg.residents.forEach((r, k) => {
    if (r.u && !incoming.has(r.u)) { reg.residents[k] = { h: sha256Hex(r.u) }; stats.left++; }
    if (reg.residents[k].h) leftByHash.set(reg.residents[k].h, k);
    if (reg.residents[k].u) incoming.delete(r.u);
  });

  for (const f of incoming.values()) {   // already in follow order
    const k = leftByHash.get(sha256Hex(f.u));
    if (k !== undefined) { reg.residents[k] = { u: f.u, t: f.t }; stats.returned++; }
    else { reg.residents.push({ u: f.u, t: f.t }); stats.added++; }
  }

  stats.active = reg.residents.filter(r => r.u).length;
  stats.houses = reg.residents.length;
  const last = reg.history.at(-1);
  if (last?.date === date) last.count = stats.active;
  else reg.history.push({ date, count: stats.active });
  return { reg, stats };
}
