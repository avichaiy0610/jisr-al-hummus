// Reads an Instagram "Download your information" export (the .zip or a followers_N.json file)
// and returns the followers as [{ u, t }] sorted by follow time, then name. t is null when unknown.
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { normalize } from '../../site/js/shared/username.js';

const HTML_HINT = 'זה ייצוא בפורמט HTML. צריך לבקש מאינסטגרם ייצוא מחדש בפורמט JSON (Format: JSON).';
const FOLLOWERS_FILE = /(^|\/)followers(_\d+)?\.(json|html)$/i;

export function parseExport(path) {
  const ext = extname(path).toLowerCase();
  if (ext === '.html') throw new Error(HTML_HINT);
  if (ext === '.zip') return collect(fromZip(readFileSync(path)));
  return collect([JSON.parse(readFileSync(path, 'utf8'))]);
}

function fromZip(buf) {
  const files = unzipSync(new Uint8Array(buf), { filter: f => FOLLOWERS_FILE.test(f.name) });
  const names = Object.keys(files).sort();
  if (!names.length) throw new Error('לא מצאתי קובץ followers בתוך ה-zip. בייצוא צריך לסמן "Followers and following".');
  if (names.every(n => n.endsWith('.html'))) throw new Error(HTML_HINT);
  return names.filter(n => n.endsWith('.json')).map(n => JSON.parse(strFromU8(files[n])));
}

function collect(docs) {
  const best = new Map();
  for (const doc of docs) {
    const items = Array.isArray(doc) ? doc : doc.relationships_followers;
    if (!Array.isArray(items)) throw new Error('הקובץ לא נראה כמו רשימת עוקבים של אינסטגרם.');
    for (const item of items) {
      const d = item.string_list_data?.[0] ?? {};
      const u = normalize(d.value || item.title || d.href || '');
      if (!u) continue;
      const t = Number.isFinite(d.timestamp) ? d.timestamp : null;
      const prev = best.get(u);
      if (!prev || (t !== null && (prev.t === null || t < prev.t))) best.set(u, { u, t });
    }
  }
  return [...best.values()].sort(byFollowTime);
}

export const byFollowTime = (a, b) =>
  (a.t ?? Infinity) - (b.t ?? Infinity) || (a.u < b.u ? -1 : a.u > b.u ? 1 : 0);
