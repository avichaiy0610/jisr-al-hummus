import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sha256Hex } from '../site/js/shared/sha256.js';

const ref = s => createHash('sha256').update(s, 'utf8').digest('hex');

test('matches node:crypto on edge cases', () => {
  const inputs = ['', 'abc', 'ג׳יסר א-חומוס 🧆', 'x'.repeat(1000),
    'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(63), 'a'.repeat(64), 'a'.repeat(65)];
  for (const s of inputs) assert.equal(sha256Hex(s), ref(s), JSON.stringify(s.slice(0, 20)));
});

test('matches node:crypto on usernames', () => {
  for (let i = 0; i < 200; i++) {
    const u = `user_${i}.${(i * 7919).toString(36)}`;
    assert.equal(sha256Hex(u), ref(u));
  }
});
