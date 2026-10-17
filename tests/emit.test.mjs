import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emitSite, PAGE } from '../tools/lib/emit.mjs';
import { sha256Hex } from '../site/js/shared/sha256.js';

const read = (...p) => JSON.parse(readFileSync(join(...p), 'utf8'));

test('writes meta, 256 search shards and list pages', () => {
  const out = mkdtempSync(join(tmpdir(), 'jisr-emit-'));
  mkdirSync(join(out, 'list'));
  writeFileSync(join(out, 'list', '9999.json'), '[]');   // stale page from an old run
  const residents = Array.from({ length: PAGE + 5 }, (_, k) => (k === 1 ? { h: 'x' } : { u: `u${k}`, t: k }));
  const reg = { residents, history: [{ date: '2026-10-15', count: 3 }, { date: '2026-10-16', count: PAGE + 4 }] };

  emitSite(reg, out);

  const { rev, ...meta } = read(out, 'meta.json');
  assert.deepEqual(meta, { count: PAGE + 4, houses: PAGE + 5, updated: '2026-10-16', day: 2, history: reg.history, page: PAGE, vacant: [2] });
  assert.match(rev, /^[0-9a-f]{12}$/);
  assert.equal(readdirSync(join(out, 'r')).length, 256);
  const shard = read(out, 'r', `${sha256Hex('u7').slice(0, 2)}.json`);
  assert.equal(shard.u7, 8);
  assert.equal(Object.values(read(out, 'r', `${sha256Hex('u0').slice(0, 2)}.json`)).includes(2), false);
  const p0 = read(out, 'list', '0000.json');
  assert.equal(p0.length, PAGE);
  assert.deepEqual(p0.slice(0, 3), ['u0', null, 'u2']);
  assert.deepEqual(read(out, 'list', '0001.json'), ['u1000', 'u1001', 'u1002', 'u1003', 'u1004']);
  assert.equal(existsSync(join(out, 'list', '9999.json')), false);
});

test('empty village still gets valid files', () => {
  const out = mkdtempSync(join(tmpdir(), 'jisr-emit-'));
  emitSite({ residents: [], history: [] }, out);
  assert.equal(read(out, 'meta.json').count, 0);
  assert.equal(read(out, 'meta.json').day, 0);
  assert.equal(readdirSync(join(out, 'list')).length, 0);
});

test('rev changes whenever residents change, even on the same day', () => {
  const out = mkdtempSync(join(tmpdir(), 'jisr-emit-'));
  const history = [{ date: 'd1', count: 1 }];
  const a = emitSite({ residents: [{ u: 'a' }], history }, out).rev;
  const b = emitSite({ residents: [{ u: 'a' }, { u: 'b' }], history }, out).rev;
  assert.notEqual(a, b);
});

test('usernames that are Object.prototype names are stored as plain keys', () => {
  const out = mkdtempSync(join(tmpdir(), 'jisr-emit-'));
  emitSite({ residents: [{ u: '__proto__' }, { u: 'constructor' }], history: [] }, out);
  const proto = read(out, 'r', `${sha256Hex('__proto__').slice(0, 2)}.json`);
  assert.equal(Object.hasOwn(proto, '__proto__') && proto['__proto__'], 1);
  assert.equal(read(out, 'r', `${sha256Hex('constructor').slice(0, 2)}.json`).constructor, 2);
  assert.equal(existsSync(out + '.tmp'), false);
});
