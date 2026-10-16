import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from '../site/js/shared/username.js';

test('accepts names, @names and profile links', () => {
  const ok = {
    '@Hummus_King': 'hummus_king',
    '  pita.lover  ': 'pita.lover',
    'https://www.instagram.com/abu.jamil/': 'abu.jamil',
    'instagram.com/abu.jamil?igsh=MTl5Z3pz': 'abu.jamil',
    'https://instagram.com/_u/zaatar_1': 'zaatar_1',
    'http://m.instagram.com/olive.tree/#x': 'olive.tree',
    'instagr.am/falafel': 'falafel',
    'www.instagram.com/@tahini': 'tahini',
    '‏@ezra‏': 'ezra',
  };
  for (const [input, want] of Object.entries(ok)) assert.equal(normalize(input), want, input);
});

test('rejects junk', () => {
  for (const bad of ['', '   ', '@', 'a b', 'שלום', 'http://x.com/a', 'a'.repeat(31), null, undefined, 42])
    assert.equal(normalize(bad), null, String(bad));
});
