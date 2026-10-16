// Street name parts. Names are handed out in the order the village grows, so the first streets get the plain names.
export const KINDS = ['רחוב', 'שדרות', 'סמטת', 'דרך', 'מעלה', 'כיכר'];

export const NAMES = [
  'הטחינה', 'הפיתה', 'הזית העתיק', 'הגרגיר', 'החומוס החם', 'הזעתר', 'הלבנה', 'הפלאפל', 'המסבחה', 'הפול',
  'הטאבון', 'אבו־ג׳מיל', 'הדייגים', 'הגשר', 'הים', 'שמן הזית', 'הכעכה', 'הלימון', 'השום', 'הפטרוזיליה',
  'הכמון', 'הפפריקה', 'הצנובר', 'החותמת', 'הטופס', 'הפקיד', 'ההפסקה', 'התור', 'המוכתר', 'הקפה השחור',
  'ההל', 'הנענע', 'הלימונענע', 'הבצל', 'הקערה', 'הניגוב', 'הסירה', 'הרשת', 'החוף', 'הדקל',
  'התאנה', 'הרימון', 'הבמיה', 'הקובה', 'המג׳דרה', 'הסחלב', 'הכנאפה', 'הבקלאווה', 'העראייס', 'השקשוקה',
];

export const SUFFIXES = ['ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ז׳', 'ח׳', 'ט׳', 'י׳'];

/** The i-th street name, unique for i < KINDS×NAMES×(SUFFIXES+1). */
export function streetName(i) {
  const per = KINDS.length * NAMES.length;
  const round = Math.floor(i / per), j = i % per;
  const n = j % NAMES.length, b = Math.floor(j / NAMES.length);   // all names first, then the next street kind
  const base = `${KINDS[(n + b) % KINDS.length]} ${NAMES[n]}`;
  if (round === 0) return base;
  return round <= SUFFIXES.length ? `${base} ${SUFFIXES[round - 1]}` : `${base} ${round + 1}`;
}
