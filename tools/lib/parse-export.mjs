// Reads an Instagram "Download your information" export: the .zip, or followers_N.json file(s).
// Returns { followers: [{ u, t }] sorted by follow time then name (t null when unknown), skipped, files }.
import { readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { normalize } from '../../site/js/shared/username.js';

const HTML_HINT = 'זה ייצוא בפורמט HTML. צריך לבקש מאינסטגרם ייצוא מחדש בפורמט JSON (Format: JSON).';
const FOLLOWERS_FILE = /(^|\/)followers(_\d+)?\.(json|html)$/i;
const isJson = name => name.toLowerCase().endsWith('.json');
const isHtml = name => name.toLowerCase().endsWith('.html');

export function parseExport(input) {
  const paths = [input].flat();
  const docs = [], files = [];
  for (const path of expandSplitFiles(paths)) {
    const ext = extname(path).toLowerCase();
    if (ext === '.html') throw new Error(HTML_HINT);
    if (ext === '.zip') {
      for (const [name, doc] of fromZip(readFileSync(path))) { docs.push(doc); files.push(`${basename(path)}:${name}`); }
    } else {
      docs.push(JSON.parse(readFileSync(path, 'utf8')));
      files.push(basename(path));
    }
  }
  return { ...collect(docs), files };
}

// Instagram splits big lists into followers_1.json, followers_2.json… Given one of them, take all of them,
// so a half export can never silently empty half the village.
function expandSplitFiles(paths) {
  if (paths.length !== 1 || !/^followers_\d+\.json$/i.test(basename(paths[0]))) return paths;
  const dir = dirname(paths[0]);
  return readdirSync(dir).filter(f => /^followers_\d+\.json$/i.test(f)).sort().map(f => join(dir, f));
}

function fromZip(buf) {
  const files = unzipSync(new Uint8Array(buf), { filter: f => FOLLOWERS_FILE.test(f.name) });
  const names = Object.keys(files).sort();
  if (!names.length) throw new Error('לא מצאתי קובץ followers בתוך ה-zip. בייצוא צריך לסמן "Followers and following".');
  if (names.every(isHtml)) throw new Error(HTML_HINT);
  const json = names.filter(isJson);
  if (!json.length) throw new Error('לא מצאתי קובץ JSON של עוקבים בתוך ה-zip.');
  return json.map(n => [n, JSON.parse(strFromU8(files[n]))]);
}

function itemsOf(doc) {
  if (Array.isArray(doc)) return doc;
  if (doc && typeof doc === 'object') {
    const key = Object.keys(doc).find(k => /followers/i.test(k) && Array.isArray(doc[k]));
    if (key) return doc[key];
  }
  throw new Error('הקובץ לא נראה כמו רשימת עוקבים של אינסטגרם.');
}

// Every place a username has been seen in the export formats so far, most reliable first.
function usernameOf(item) {
  const sld = Array.isArray(item.string_list_data) ? item.string_list_data : [];
  const labels = Array.isArray(item.label_values) ? item.label_values : [];
  const candidates = [
    ...sld.map(d => d?.value),
    ...sld.map(d => d?.href),
    item.title,
    item.href,
    item.value,
    ...labels.filter(l => /user\s*name|username/i.test(l?.label ?? '')).map(l => l.value),
    ...labels.map(l => l?.href),
  ];
  for (const c of candidates) {
    const u = typeof c === 'string' && c ? normalize(c) : null;
    if (u) return u;
  }
  return null;
}

function timestampOf(item) {
  for (const t of [...(item.string_list_data ?? []).map(d => d?.timestamp), item.timestamp])
    if (Number.isFinite(t)) return t;
  return null;
}

function collect(docs) {
  const best = new Map();
  let skipped = 0;
  for (const doc of docs) {
    for (const item of itemsOf(doc)) {
      const u = item && typeof item === 'object' ? usernameOf(item) : null;
      if (!u) { skipped++; continue; }
      const t = timestampOf(item);
      const prev = best.get(u);
      if (!prev || (t !== null && (prev.t === null || t < prev.t))) best.set(u, { u, t });
    }
  }
  return { followers: [...best.values()].sort(byFollowTime), skipped };
}

export const byFollowTime = (a, b) =>
  (a.t ?? Infinity) - (b.t ?? Infinity) || (a.u < b.u ? -1 : a.u > b.u ? 1 : 0);
