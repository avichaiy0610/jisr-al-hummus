// Turns whatever people paste ("@Name", a profile link, stray spaces) into an Instagram username, or null.

const LINK = /^(?:https?:\/\/)?(?:(?:www|m)\.)?(?:instagram\.com|instagr\.am)\/(?:_u\/)?@?([^/?#\s]+)/i;
const VALID = /^[a-z0-9._]{1,30}$/;

export function normalize(input) {
  if (typeof input !== 'string') return null;
  let s = input.replace(/[‎‏‪-‮⁦-⁩]/g, '').trim();
  const link = s.match(LINK);
  if (link) s = link[1];
  else if (/[/:]/.test(s)) return null;
  s = s.replace(/^@/, '').toLowerCase();
  return VALID.test(s) ? s : null;
}
