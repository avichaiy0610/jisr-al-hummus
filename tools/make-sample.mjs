#!/usr/bin/env node
// npm run demo [-- <count>]: invents followers and builds site/data-demo, viewable at http://localhost:8080/?demo
// Simulates a few days of growth (with some unfollows and returns) so every state of a house shows up.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runUpdate } from './update.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const total = Number(process.argv[2]) || 30000;

let seed = 7;   // mulberry32
const rand = () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = a => a[Math.floor(rand() * a.length)];
const first = ['ahmad', 'noa', 'yossi', 'rami', 'lior', 'samir', 'dana', 'maya', 'omar', 'tal', 'yara', 'eli', 'nour', 'amit', 'rana', 'itay', 'layla', 'avi'];
const words = ['hummus', 'pita', 'zaatar', 'falafel', 'tahini', 'olive', 'jisr', 'labane', 'kaak', 'sea', 'fisher', 'abu'];
const seps = ['_', '.', '', '__'];

const names = new Set();
while (names.size < total) {
  const n = rand() < 0.5 ? pick(first) + pick(seps) + pick(words) : pick(words) + pick(seps) + pick(first);
  names.add((n + (rand() < 0.7 ? Math.floor(rand() * 9999) : '')).slice(0, 30));
}
const all = [...names];

const dir = join(root, 'site', 'data-demo');
rmSync(dir, { recursive: true, force: true });
mkdirSync(join(root, 'exports'), { recursive: true });
const days = [0.05, 0.2, 0.45, 0.7, 0.9, 1];
days.forEach((share, d) => {
  const n = Math.floor(total * share);
  const followers = all.slice(0, n).filter((_, i) => d === 3 || d === 5 || i % 97 !== 5);   // some leave on day 5 and come back on day 6
  const file = join(root, 'exports', 'sample-followers.json');
  writeFileSync(file, JSON.stringify(followers.map((u, i) => ({
    title: '', media_list_data: [], string_list_data: [{ href: `https://www.instagram.com/${u}`, value: u, timestamp: 1760000000 + i * 60 }],
  }))));
  const s = runUpdate({ file, registryPath: join(dir, 'registry.json'), outDir: dir, date: `2026-10-${String(10 + d).padStart(2, '0')}` });
  console.log(`יום ${d + 1}: ${s.active} תושבים, ${s.left} עזבו, ${s.returned} חזרו`);
});
console.log('✔ נתוני דמו מוכנים. npm start ואז http://localhost:8080/?demo');
