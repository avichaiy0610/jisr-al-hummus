// Reads the static data written by tools/update.mjs. ?demo reads the invented residents from data-demo/.
import { sha256Hex } from './shared/sha256.js';

export const isDemo = new URLSearchParams(location.search).has('demo');
const base = isDemo ? 'data-demo/' : 'data/';
let meta = null;
const cache = new Map();

async function getJSON(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(base + path + (meta?.updated ? `?v=${meta.updated}` : ''))
      .then(r => { if (!r.ok) throw new Error(`${path}: ${r.status}`); return r.json(); })
      .catch(e => { cache.delete(path); throw e; }));
  }
  return cache.get(path);
}

export async function loadMeta() {
  const r = await fetch(base + 'meta.json', { cache: 'no-cache' });
  meta = r.ok ? await r.json() : { count: 0, houses: 0, day: 0, page: 1000, vacant: [] };
  return meta;
}

/** House number for a normalized username, or null. */
export async function findHouse(username) {
  if (!meta?.count) return null;
  const shard = await getJSON(`r/${sha256Hex(username).slice(0, 2)}.json`);
  return shard[username] ?? null;
}

/** The usernames of one page of houses (null = vacant). */
export function listPage(p) {
  return getJSON(`list/${String(p).padStart(4, '0')}.json`);
}

/** Username living in house n, null if vacant, undefined if not built yet. */
export async function ownerOf(n) {
  if (!meta || n < 1 || n > meta.houses) return undefined;
  const page = await listPage(Math.floor((n - 1) / meta.page));
  return page[(n - 1) % meta.page];
}
