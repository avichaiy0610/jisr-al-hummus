// The village plan: where house k stands, which street it is on, and where the landmarks are.
// Fully deterministic (fixed seed) — tests pin a checksum so houses can never move between releases.
//
// Blocks are 6×2 plots. The top row faces the street north of the block, the bottom row the street south of it.
// Blocks are filled nearest-first (with a little noise), so the village grows outwards from the hummusiya.
import { streetName } from './streets-names.js';

export const MAX_PLOTS = 200_000;
export const BLOCK_W = 6, BLOCK_D = 2;           // plots per block
export const PITCH_X = BLOCK_W + 1.4, PITCH_Z = BLOCK_D + 1.2;   // block + street
const SEGMENT_BLOCKS = 4;                         // a street changes its name every 4 blocks
const SEED = 0x6a157;

/** Coastline: everything west of this x (at a given z) is sea. */
export const seaX = z => -44 + 5 * Math.sin(z / 23) + 2.5 * Math.sin(z / 7 + 1);

/** Reserved spots near the centre. x/z is the centre, w/d the size. */
export const LANDMARKS = [
  { id: 'hummusiya', x: 0, z: 0, w: 15, d: 7 },
  { id: 'municipality', x: 16, z: -7.5, w: 8, d: 6 },
  { id: 'taboun', x: -15, z: 7, w: 7, d: 5 },
  { id: 'olives', x: -24, z: -10, w: 14, d: 11 },
  { id: 'football', x: 24, z: 11, w: 15, d: 9 },
  { id: 'bridge', x: -36, z: 18, w: 12, d: 5 },
];

function mulberry32(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const overlaps = (ax, az, aw, ad, b) =>
  Math.abs(ax - b.x) * 2 < aw + b.w && Math.abs(az - b.z) * 2 < ad + b.d;

export function buildLayout(maxPlots = MAX_PLOTS) {
  const rand = mulberry32(SEED);
  // Fixed by MAX_PLOTS (not maxPlots), so a smaller layout is always an exact prefix of the full one.
  const range = Math.ceil(Math.sqrt(MAX_PLOTS / (BLOCK_W * BLOCK_D)) * 1.25) + 4;
  const cells = [];
  for (let bz = -range; bz <= range; bz++) {
    for (let bx = -range; bx <= range; bx++) {
      const x = bx * PITCH_X, z = bz * PITCH_Z;
      const r = rand();   // drawn for every cell so the sequence never depends on what got excluded
      if (x - PITCH_X / 2 < seaX(z) + 2) continue;
      if (LANDMARKS.some(l => overlaps(x, z, PITCH_X, PITCH_Z, l))) continue;
      const a = Math.atan2(z, x);
      const lobes = 1 + 0.14 * Math.sin(3 * a + 0.6) + 0.08 * Math.sin(7 * a);
      cells.push({ bx, bz, x, z, key: Math.hypot(x, z * 1.15) * lobes + r * 9 });
    }
  }
  cells.sort((p, q) => p.key - q.key || p.bz - q.bz || p.bx - q.bx);

  const blocks = Math.ceil(maxPlots / (BLOCK_W * BLOCK_D));
  if (cells.length < blocks) throw new Error('layout range too small');
  const px = new Float32Array(maxPlots), pz = new Float32Array(maxPlots);
  const facing = new Int8Array(maxPlots), street = new Uint32Array(maxPlots);
  const blockX = new Float32Array(blocks), blockZ = new Float32Array(blocks);
  const streetIds = new Map(), streetNames = [];
  const streetOf = (line, bx) => {
    const k = `${line}:${Math.floor(bx / SEGMENT_BLOCKS)}`;
    let id = streetIds.get(k);
    if (id === undefined) { id = streetNames.length; streetIds.set(k, id); streetNames.push(streetName(id)); }
    return id;
  };

  let k = 0;
  for (let b = 0; b < blocks; b++) {
    const c = cells[b];
    blockX[b] = c.x; blockZ[b] = c.z;
    for (let row = 0; row < BLOCK_D && k < maxPlots; row++) {
      const s = streetOf(row === 0 ? c.bz : c.bz + 1, c.bx);
      for (let col = 0; col < BLOCK_W && k < maxPlots; col++, k++) {
        px[k] = c.x - (BLOCK_W - 1) / 2 + col;
        pz[k] = c.z - (BLOCK_D - 1) / 2 + row;
        facing[k] = row === 0 ? -1 : 1;
        street[k] = s;
      }
    }
  }
  return { count: maxPlots, x: px, z: pz, facing, street, streetNames, blockX, blockZ, landmarks: LANDMARKS };
}

/** The address of house number n (1-based). */
export function address(layout, n) {
  return { street: layout.streetNames[layout.street[n - 1]], number: n };
}
