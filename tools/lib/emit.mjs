// Writes the static data the site reads (site/data): meta.json, r/<2 hex>.json search shards, list/<NNNN>.json pages.
// Everything is built in a sibling temp folder first, so a crash mid-way never leaves half-written site data.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sha256Hex } from '../../site/js/shared/sha256.js';

export const PAGE = 1000;
const pad = n => String(n).padStart(4, '0');

export function emitSite(reg, outDir) {
  const { residents, history } = reg;
  const tmp = `${outDir}.tmp`;
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(join(tmp, 'r'), { recursive: true });
  mkdirSync(join(tmp, 'list'), { recursive: true });

  // Null-prototype objects: usernames like "__proto__" or "constructor" must be plain keys.
  const shards = Array.from({ length: 256 }, () => Object.create(null));
  residents.forEach((r, k) => { if (r.u) shards[parseInt(sha256Hex(r.u).slice(0, 2), 16)][r.u] = k + 1; });
  shards.forEach((s, i) => writeFileSync(join(tmp, 'r', `${i.toString(16).padStart(2, '0')}.json`), JSON.stringify(s)));

  for (let p = 0; p * PAGE < residents.length; p++)
    writeFileSync(join(tmp, 'list', `${pad(p)}.json`),
      JSON.stringify(residents.slice(p * PAGE, (p + 1) * PAGE).map(r => r.u ?? null)));

  const meta = {
    count: residents.filter(r => r.u).length,
    houses: residents.length,
    updated: history.at(-1)?.date ?? null,
    day: history.length,
    history,
    page: PAGE,
    vacant: residents.flatMap((r, k) => (r.u ? [] : [k + 1])),   // houses whose resident left; drawn grey
    rev: createHash('sha256').update(JSON.stringify(residents)).digest('hex').slice(0, 12),   // cache key for data files
  };
  writeFileSync(join(tmp, 'meta.json'), JSON.stringify(meta, null, 1));

  mkdirSync(outDir, { recursive: true });
  for (const name of ['r', 'list', 'meta.json']) {
    const target = join(outDir, name);
    if (existsSync(target)) rmSync(target, { recursive: true, force: true });
    renameSync(join(tmp, name), target);
  }
  rmSync(tmp, { recursive: true, force: true });
  return meta;
}
