// Boot: loading screen → data → village plan → 3D scene → UI.
import { loadMeta } from './data.js';
import { buildLayout } from './shared/layout.js';
import { startLoading, initUI } from './ui.js';
import { LANDMARK_LABELS } from './copy.js';

const NO_3D = 'המחשב הזה לא מצליח לצייר את הכפר בתלת־ממד. החיפוש עדיין עובד.';
const FAILED = 'משהו נתקע בעירייה. נסו לרענן את הדף. אם זה לא עוזר, אבו־ג׳מיל כנראה בהפסקה.';

const stopLoading = startLoading();
try {
  const meta = await loadMeta();
  await document.fonts?.load('700 44px Rubik').catch(() => {});
  const layout = buildLayout(Math.max(meta.houses, 1));
  let village;
  try {
    const { createVillage } = await import('./village.js');
    village = createVillage(document.getElementById('village'), {
      layout, houses: meta.houses, vacant: meta.vacant ?? [], labels: LANDMARK_LABELS,
    });
  } catch (e) {
    console.error(e);
    village = { flyToHouse() {}, setMine() {}, overview() {}, onPick() {}, setInset() {} };
    document.getElementById('village').hidden = true;
    queueMicrotask(() => alert(NO_3D));
  }
  initUI({ meta, layout, village });
  await stopLoading();
} catch (e) {
  console.error(e);
  stopLoading(FAILED);
}
