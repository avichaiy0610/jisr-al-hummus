import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateRegistry } from '../tools/lib/registry.mjs';
import { sha256Hex } from '../site/js/shared/sha256.js';

const f = (u, t = 1) => ({ u, t });
const names = reg => reg.residents.map(r => r.u ?? null);

test('first import keeps the given follow order and starts history', () => {
  const { reg, stats } = updateRegistry(null, [f('a', 1), f('b', 2), f('c', 3)], { date: '2026-10-16' });
  assert.deepEqual(names(reg), ['a', 'b', 'c']);
  assert.deepEqual(reg.history, [{ date: '2026-10-16', count: 3 }]);
  assert.deepEqual(stats, { active: 3, added: 3, left: 0, returned: 0, houses: 3 });
});

test('unfollow blanks the house to a hash; numbers never shift', () => {
  const first = updateRegistry(null, [f('a'), f('b'), f('c')], { date: 'd1' }).reg;
  const { reg, stats } = updateRegistry(first, [f('a'), f('c'), f('d', 9)], { date: 'd2' });
  assert.deepEqual(names(reg), ['a', null, 'c', 'd']);
  assert.deepEqual(reg.residents[1], { h: sha256Hex('b') });
  assert.equal(stats.left, 1);
  assert.equal(stats.added, 1);
});

test('a returning follower gets the old house back', () => {
  let reg = updateRegistry(null, [f('a'), f('b'), f('c')], { date: 'd1' }).reg;
  reg = updateRegistry(reg, [f('a'), f('c')], { date: 'd2' }).reg;
  const res = updateRegistry(reg, [f('a'), f('c'), f('b', 50), f('z', 40)], { date: 'd3' });
  assert.deepEqual(names(res.reg), ['a', 'b', 'c', 'z']);
  assert.equal(res.stats.returned, 1);
  assert.equal(res.stats.added, 1);
});

test('refuses an update where too many residents leave at once, unless forced', () => {
  const names = Array.from({ length: 1000 }, (_, i) => f(`u${i}`, i));
  const reg = updateRegistry(null, names, { date: 'd1' }).reg;
  // 100 leaving (10%) is fine; 101 is suspicious even when as many newcomers hide the drop.
  assert.equal(updateRegistry(reg, names.slice(100), { date: 'd2' }).stats.left, 100);
  const partial = [...names.slice(101), ...Array.from({ length: 500 }, (_, i) => f(`new${i}`, 5000 + i))];
  assert.throws(() => updateRegistry(reg, partial, { date: 'd2' }), /--force/);
  assert.equal(updateRegistry(reg, partial, { date: 'd2', force: true }).stats.left, 101);
});

test('small villages may lose a handful of residents without --force', () => {
  const reg = updateRegistry(null, ['a', 'b', 'c', 'd', 'e'].map(u => f(u)), { date: 'd1' }).reg;
  assert.equal(updateRegistry(reg, [f('a')], { date: 'd2' }).stats.left, 4);
});

test('does not mutate the input registry', () => {
  const reg = updateRegistry(null, [f('a'), f('b')], { date: 'd1' }).reg;
  const copy = structuredClone(reg);
  updateRegistry(reg, [f('a')], { date: 'd2', force: true });
  assert.deepEqual(reg, copy);
});

test('several updates on the same date count as one day', () => {
  let reg = updateRegistry(null, [f('a')], { date: 'd1' }).reg;
  reg = updateRegistry(reg, [f('a'), f('b')], { date: 'd1' }).reg;
  reg = updateRegistry(reg, [f('a'), f('b'), f('c')], { date: 'd2' }).reg;
  assert.deepEqual(reg.history, [{ date: 'd1', count: 2 }, { date: 'd2', count: 3 }]);
});
