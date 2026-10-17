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
  assert.deepEqual(parseExport(p).followers, [{ u: 'pita_lover', t: 10 }, { u: 'abu.jamil', t: 20 }]);
});

test('new shape: name in title, href with /_u/', () => {
  const p = file('new.json', JSON.stringify([{ title: 'zaatar_1', string_list_data: [{ href: 'https://www.instagram.com/_u/zaatar_1', timestamp: 5 }] }]));
  assert.deepEqual(parseExport(p).followers, [{ u: 'zaatar_1', t: 5 }]);
});

test('wrapped in relationships_followers, duplicates keep earliest', () => {
  const p = file('wrap.json', JSON.stringify({ relationships_followers: [entry('a', 9), entry('A', 3), entry('b', 4)] }));
  assert.deepEqual(parseExport(p).followers, [{ u: 'a', t: 3 }, { u: 'b', t: 4 }]);
});

test('zip with several followers_N.json files, ignores the rest', () => {
  const zip = zipSync({
    'connections/followers_and_following/followers_1.json': strToU8(JSON.stringify([entry('one', 1)])),
    'connections/followers_and_following/followers_2.json': strToU8(JSON.stringify([entry('two', 2)])),
    'connections/followers_and_following/following.json': strToU8(JSON.stringify({ relationships_following: [entry('nope', 0)] })),
  });
  const p = file('export.zip', zip);
  assert.deepEqual(parseExport(p).followers.map(f => f.u), ['one', 'two']);
  assert.equal(parseExport(p).files.length, 2);
});

test('HTML export is rejected with a Hebrew hint', () => {
  const zip = zipSync({ 'connections/followers_and_following/followers_1.html': strToU8('<html></html>') });
  assert.throws(() => parseExport(file('html.zip', zip)), /JSON/);
  assert.throws(() => parseExport(file('f.html', '<html></html>')), /JSON/);
});

test('missing timestamps sort last, then by name', () => {
  const p = file('nots.json', JSON.stringify([entry('b', undefined), entry('a', undefined), entry('c', 1)]));
  assert.deepEqual(parseExport(p).followers.map(f => f.u), ['c', 'a', 'b']);
});

test('one followers_N.json pulls in its siblings, so a split export is never half-read', () => {
  const sub = mkdtempSync(join(tmpdir(), 'jisr-split-'));
  writeFileSync(join(sub, 'followers_1.json'), JSON.stringify([entry('one', 1)]));
  writeFileSync(join(sub, 'followers_2.json'), JSON.stringify([entry('two', 2)]));
  writeFileSync(join(sub, 'following.json'), JSON.stringify([entry('nope', 0)]));
  const res = parseExport(join(sub, 'followers_1.json'));
  assert.deepEqual(res.followers.map(f => f.u), ['one', 'two']);
  assert.deepEqual(res.files, ['followers_1.json', 'followers_2.json']);
});

test('an invalid value falls back to the profile link; label_values and junk are handled', () => {
  const p = file('mixed.json', JSON.stringify({ relationships_followers: [
    { title: 'Dana Cohen', string_list_data: [{ value: 'Dana Cohen', href: 'https://www.instagram.com/dana.c', timestamp: 3 }] },
    { label_values: [{ label: 'Name', value: 'Omar' }, { label: 'Username', value: 'omar_88' }], timestamp: 2 },
    { string_list_data: [{ value: '' }] },
    null,
  ] }));
  const res = parseExport(p);
  assert.deepEqual(res.followers, [{ u: 'omar_88', t: 2 }, { u: 'dana.c', t: 3 }]);
  assert.equal(res.skipped, 2);
});

test('zip entry names are case-insensitive', () => {
  const zip = zipSync({ 'connections/followers_and_following/Followers_1.JSON': strToU8(JSON.stringify([entry('upper', 1)])) });
  assert.deepEqual(parseExport(file('upper.zip', zip)).followers.map(f => f.u), ['upper']);
});
