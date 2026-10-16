// Writes the static data the site reads (site/data): meta.json, r/<2 hex>.json search shards, list/<NNNN>.json pages.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sha256Hex } from '../../site/js/shared/sha256.js';

export const PAGE = 1000;
const pad = n => String(n).padStart(4, '0');

export function emitSite(reg, outDir) {
  const { residents, history } = reg;
  for (const sub of ['r', 'list']) {
    rmSync(join(outDir, sub), { recursive: true, force: true });
    mkdirSync(join(outDir, sub), { recursive: true });
  }

  const shards = Array.from({ length: 256 }, () => ({}));
  residents.forEach((r, k) => { if (r.u) shards[parseInt(sha256Hex(r.u).slice(0, 2), 16)][r.u] = k + 1; });
  shards.forEach((s, i) => writeFileSync(join(outDir, 'r', `${i.toString(16).padStart(2, '0')}.json`), JSON.stringify(s)));

  for (let p = 0; p * PAGE < residents.length; p++)
    writeFileSync(join(outDir, 'list', `${pad(p)}.json`),
      JSON.stringify(residents.slice(p * PAGE, (p + 1) * PAGE).map(r => r.u ?? null)));

  const meta = {
    count: residents.filter(r => r.u).length,
    houses: residents.length,
    updated: history.at(-1)?.date ?? null,
    day: history.length,
    history,
    page: PAGE,
    vacant: residents.flatMap((r, k) => (r.u ? [] : [k + 1])),   // houses whose resident left; drawn grey
  };
  writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta, null, 1));
  return meta;
}
