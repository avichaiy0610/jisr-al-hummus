import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { parseExport } from '../tools/lib/parse-export.mjs';

const dir = mkdtempSync(join(tmpdir(), 'jisr-'));
const file = (name, content) => { const p = join(dir, name); writeFileSync(p, content); return p; };
const entry = (value, timestamp, extra = {}) => ({ title: '', media_list_data: [], string_list_data: [{ href: `https://www.instagram.com/${value}`, value, timestamp }], ...extra });

test('old shape: array with string_list_data.value', () => {
  const p = file('old.json', JSON.stringify([entry('Abu.Jamil', 20), entry('pita_lover', 10)]));
  assert.deepEqual(parseExport(p), [{ u: 'pita_lover', t: 10 }, { u: 'abu.jamil', t: 20 }]);
});

test('new shape: name in title, href with /_u/', () => {
  const p = file('new.json', JSON.stringify([{ title: 'zaatar_1', string_list_data: [{ href: 'https://www.instagram.com/_u/zaatar_1', timestamp: 5 }] }]));
  assert.deepEqual(parseExport(p), [{ u: 'zaatar_1', t: 5 }]);
});

test('wrapped in relationships_followers, duplicates keep earliest', () => {
  const p = file('wrap.json', JSON.stringify({ relationships_followers: [entry('a', 9), entry('A', 3), entry('b', 4)] }));
  assert.deepEqual(parseExport(p), [{ u: 'a', t: 3 }, { u: 'b', t: 4 }]);
});

test('zip with several followers_N.json files, ignores the rest', () => {
  const zip = zipSync({
    'connections/followers_and_following/followers_1.json': strToU8(JSON.stringify([entry('one', 1)])),
    'connections/followers_and_following/followers_2.json': strToU8(JSON.stringify([entry('two', 2)])),
    'connections/followers_and_following/following.json': strToU8(JSON.stringify({ relationships_following: [entry('nope', 0)] })),
  });
  const p = file('export.zip', zip);
  assert.deepEqual(parseExport(p).map(f => f.u), ['one', 'two']);
});

test('HTML export is rejected with a Hebrew hint', () => {
  const zip = zipSync({ 'connections/followers_and_following/followers_1.html': strToU8('<html></html>') });
  assert.throws(() => parseExport(file('html.zip', zip)), /JSON/);
  assert.throws(() => parseExport(file('f.html', '<html></html>')), /JSON/);
});

test('missing timestamps sort last, then by name', () => {
  const p = file('nots.json', JSON.stringify([entry('b', undefined), entry('a', undefined), entry('c', 1)]));
  assert.deepEqual(parseExport(p).map(f => f.u), ['c', 'a', 'b']);
});
