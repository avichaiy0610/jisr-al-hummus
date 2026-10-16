import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLayout, address, seaX, LANDMARKS, MAX_PLOTS } from '../site/js/shared/layout.js';
import { streetName, KINDS, NAMES } from '../site/js/shared/streets-names.js';
import { sha256Hex } from '../site/js/shared/sha256.js';

const full = buildLayout();

const fingerprint = (l, n) => {
  const parts = [];
  for (let k = 0; k < n; k++) parts.push(`${l.x[k]},${l.z[k]},${l.facing[k]},${l.street[k]}`);
  return sha256Hex(parts.join(';') + l.streetNames.slice(0, 50).join('|'));
};

test('layout is frozen: houses never move between releases', () => {
  // If this fails you changed the village plan. Do not update the hash unless no real resident exists yet.
  assert.equal(fingerprint(full, 5000), '054f30edef3fd3b4d9fc90d7f25e409a381aba2713f287e2004e1db6599c0d63');
});

test('a smaller layout is an exact prefix of the full one', () => {
  const small = buildLayout(1234);
  assert.equal(fingerprint(small, 1234), fingerprint(full, 1234));
});

test('plots never overlap, never sit in the sea or on a landmark', () => {
  const seen = new Set();
  for (let k = 0; k < MAX_PLOTS; k++) {
    const x = full.x[k], z = full.z[k];
    const key = `${Math.round(x * 10)},${Math.round(z * 10)}`;
    assert.ok(!seen.has(key), `duplicate plot ${k}`);
    seen.add(key);
    assert.ok(x > seaX(z), `plot ${k} is in the sea`);
    for (const l of LANDMARKS)
      assert.ok(!(Math.abs(x - l.x) < l.w / 2 + 0.5 && Math.abs(z - l.z) < l.d / 2 + 0.5), `plot ${k} on ${l.id}`);
  }
});

test('olive gardens never take a plot and appear in growth order', () => {
  const cells = new Set();
  for (let k = 0; k < MAX_PLOTS; k++) cells.add(`${Math.round(full.x[k] / 7.4)},${Math.round(full.z[k] / 3.2)}`);
  assert.ok(full.parks.length > 100);
  for (const p of full.parks) assert.ok(!cells.has(`${Math.round(p.x / 7.4)},${Math.round(p.z / 3.2)}`));
  for (let i = 1; i < full.parks.length; i++) assert.ok(full.parks[i].after >= full.parks[i - 1].after);
});

test('village grows outward from the centre', () => {
  const r = k => Math.hypot(full.x[k], full.z[k]);
  const avg = (a, b) => { let s = 0; for (let k = a; k < b; k++) s += r(k); return s / (b - a); };
  assert.ok(avg(0, 1000) < avg(10000, 11000));
  assert.ok(avg(10000, 11000) < avg(100000, 101000));
});

test('every house has a street; the first streets have plain names', () => {
  assert.deepEqual(address(full, 1), { street: full.streetNames[full.street[0]], number: 1 });
  for (let k = 0; k < MAX_PLOTS; k += 997) assert.ok(full.streetNames[full.street[k]]);
  assert.ok(!/[׳\d]$/.test(full.streetNames[full.street[0]]));
});

test('street names are unique', () => {
  const n = KINDS.length * NAMES.length * 12;
  assert.equal(new Set(Array.from({ length: n }, (_, i) => streetName(i))).size, n);
});

test('full layout builds fast enough for a phone', () => {
  const t = performance.now();
  buildLayout();
  assert.ok(performance.now() - t < 1500);
});
