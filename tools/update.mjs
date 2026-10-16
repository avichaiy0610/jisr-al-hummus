#!/usr/bin/env node
// npm run update -- <export.zip|followers_1.json> [--force] [--push]
// Reads the Instagram export, updates data/registry.json (append-only) and rewrites site/data.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parseExport } from './lib/parse-export.mjs';
import { updateRegistry } from './lib/registry.mjs';
import { emitSite } from './lib/emit.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function runUpdate({ file, force = false, registryPath, outDir, date = today() }) {
  const followers = parseExport(file);
  const prev = existsSync(registryPath) ? JSON.parse(readFileSync(registryPath, 'utf8')) : null;
  const { reg, stats } = updateRegistry(prev, followers, { date, force });
  mkdirSync(dirname(registryPath), { recursive: true });
  writeFileSync(registryPath, JSON.stringify(reg));
  emitSite(reg, outDir);
  return stats;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function main(argv) {
  const flags = new Set(argv.filter(a => a.startsWith('--')));
  const file = argv.find(a => !a.startsWith('--'));
  if (!file) {
    console.error('שימוש: npm run update -- <קובץ הייצוא מאינסטגרם (.zip או followers_1.json)> [--force] [--push]');
    process.exit(1);
  }
  try {
    const s = runUpdate({
      file: resolve(file),
      force: flags.has('--force'),
      registryPath: join(root, 'data', 'registry.json'),
      outDir: join(root, 'site', 'data'),
    });
    console.log(`✔ העירייה עדכנה את הכפר:
  תושבים פעילים: ${s.active.toLocaleString('he-IL')}
  בתים חדשים:    ${s.added.toLocaleString('he-IL')}
  חזרו הביתה:    ${s.returned.toLocaleString('he-IL')}
  עזבו (הבית נשמר): ${s.left.toLocaleString('he-IL')}
  סה"כ בתים:     ${s.houses.toLocaleString('he-IL')}`);
    if (flags.has('--push')) {
      const git = (...a) => execFileSync('git', a, { cwd: root, stdio: 'inherit' });
      git('add', 'data/registry.json', 'site/data');
      git('commit', '-m', `data: ${s.active} residents`);
      git('push');
      console.log('✔ נדחף ל-GitHub. האתר יתעדכן תוך דקה-שתיים.');
    } else {
      console.log('השלב הבא: git add -A && git commit -m "עדכון תושבים" && git push   (או להריץ שוב עם --push)');
    }
  } catch (e) {
    console.error(`✖ ${e.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
