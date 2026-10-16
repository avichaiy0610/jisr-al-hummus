// The village's landmarks, sea, beach and palms — all built from primitives, no external models.
import * as THREE from 'three';
import { LANDMARKS, seaX } from './shared/layout.js';

const mat = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
const M = {
  wall: mat('#f1e4c8'), wallBlue: mat('#d5dde0'), awning: mat('#5f8a3a'), door: mat('#7a4a2c'),
  bowl: mat('#2f6f9f'), hummus: mat('#e8cf9a'), oil: mat('#c7b230'), chickpea: mat('#d9b56f'),
  paprika: mat('#c8452c'), parsley: mat('#4f8a3a'), clay: mat('#b5653a'), smoke: mat('#f2f2f2', { transparent: true, opacity: 0.75 }),
  trunk: mat('#6b4f3a'), olive: mat('#7d8b5a'), palmLeaf: mat('#4f8a3a'), palmTrunk: mat('#9a7a52'),
  grass: mat('#5fa04e'), line: mat('#f7f7f2'), white: mat('#f7f4ec'), stone: mat('#d8c7a3'), water: mat('#4d9cc4'),
  sea: mat('#3f8fb5'), beach: mat('#eadbb0'), grove: mat('#b3a874'), hull: mat('#e9e2d0'), stripe: mat('#2f6f9f'),
  pita: mat('#e2c08a'), pole: mat('#8a8a8a'), flag: mat('#5f8a3a'),
};

const box = (w, h, d, m, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y + h / 2, z);
  return o;
};
const cyl = (rt, rb, h, m, x = 0, y = 0, z = 0, seg = 16) => {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  o.position.set(x, y + h / 2, z);
  return o;
};

function signTexture(text, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 96);
  g.fillStyle = fg; g.font = '700 54px Rubik, Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
  g.fillText(text, 128, 52);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function labelSprite(text) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const font = '700 44px Rubik, Arial, sans-serif';
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + 56;
  c.width = w; c.height = 84;
  g.font = font;
  g.fillStyle = 'rgba(255,250,238,0.94)';
  g.beginPath(); g.roundRect(2, 2, w - 4, 80, 40); g.fill();
  g.strokeStyle = '#c8452c'; g.lineWidth = 4; g.stroke();
  g.fillStyle = '#3b2f22'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
  g.fillText(text, w / 2, 44);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, depthTest: false, sizeAttenuation: false }));
  s.scale.set((w / 84) * 0.036, 0.036, 1);   // constant size on screen
  s.renderOrder = 10;
  return s;
}

function hummusiya() {
  const g = new THREE.Group();
  g.add(box(12, 2.6, 5, M.wall));
  g.add(box(12.4, 0.25, 1.1, M.awning, 0, 1.9, 2.9));
  for (const x of [-3.5, 0, 3.5]) g.add(box(1.1, 1.6, 0.1, M.door, x, 0, 2.52));
  g.add(cyl(3.3, 2.3, 1.2, M.bowl, 0, 2.6, 0, 28));
  g.add(cyl(3.05, 3.05, 0.25, M.hummus, 0, 3.6, 0, 28));
  g.add(cyl(1.1, 1.1, 0.06, M.oil, 0, 3.85, 0, 20));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, r = i % 2 ? 0.45 : 1.7;
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), M.chickpea);
    p.position.set(Math.cos(a) * r, 3.98, Math.sin(a) * r);
    g.add(p);
  }
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, r = 1.3 + (i % 3) * 0.4;
    g.add(box(0.14, 0.04, 0.14, i % 4 ? M.paprika : M.parsley, Math.cos(a) * r, 3.86, Math.sin(a) * r));
  }
  return g;
}

function municipality() {
  const g = new THREE.Group();
  g.add(box(7, 4, 5, M.wallBlue));
  g.add(box(7.4, 0.3, 5.4, M.stone, 0, 4));
  g.add(box(1.4, 2, 0.1, M.door, 0, 0, 2.52));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.68), new THREE.MeshBasicMaterial({ map: signTexture('סגור', '#c8452c', '#fff') }));
  sign.position.set(0, 2.45, 2.58);
  g.add(sign);
  g.add(cyl(0.06, 0.06, 3, M.pole, 3, 4.3, 1.8, 6));
  g.add(box(1.2, 0.7, 0.04, M.flag, 3.6, 6.4, 1.8));
  return g;
}

function taboun() {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.8, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.clay);
  g.add(dome);
  g.add(cyl(0.25, 0.3, 1.2, M.clay, 0.6, 1.3, 0, 8));
  g.add(box(2, 0.8, 1, M.stone, 0, 0, 2.2));
  for (let i = 0; i < 3; i++) g.add(cyl(0.38, 0.38, 0.05, M.pita, -0.5 + i * 0.5, 0.8 + i * 0.05, 2.2, 14));
  const puffs = [];
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), M.smoke);
    g.add(p);
    puffs.push(p);
  }
  const tick = t => puffs.forEach((p, i) => {
    const f = ((t * 0.35 + i / puffs.length) % 1);
    p.position.set(0.6 + f * 0.8, 2.6 + f * 3.5, f * 0.4);
    p.scale.setScalar(0.6 + f * 1.4);
  });
  return { group: g, tick };
}

function oliveTree(rand) {
  const g = new THREE.Group();
  g.add(cyl(0.12, 0.18, 0.9, M.trunk, 0, 0, 0, 6));
  const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), M.olive);
  crown.position.y = 1.4;
  crown.scale.set(1.2, 0.8 + rand() * 0.3, 1.1);
  crown.rotation.y = rand() * 3;
  g.add(crown);
  return g;
}

function olives(l, rand) {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(l.w, l.d), M.grove);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.02;
  g.add(ground);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
    const t = oliveTree(rand);
    t.position.set(-l.w / 2 + 1.5 + i * (l.w - 3) / 4 + (rand() - 0.5) * 0.8, 0, -l.d / 2 + 1.5 + j * (l.d - 3) / 3 + (rand() - 0.5) * 0.8);
    g.add(t);
  }
  return g;
}

function football(l) {
  const g = new THREE.Group();
  const field = new THREE.Mesh(new THREE.PlaneGeometry(l.w - 1.5, l.d - 1.5), M.grass);
  field.rotation.x = -Math.PI / 2;
  field.position.y = 0.03;
  g.add(field);
  const w = l.w - 2.5, d = l.d - 2.5;
  for (const [x, z, sx, sz] of [[0, -d / 2, w, 0.1], [0, d / 2, w, 0.1], [-w / 2, 0, 0.1, d], [w / 2, 0, 0.1, d], [0, 0, 0.1, d]])
    g.add(box(sx, 0.02, sz, M.line, x, 0.04, z));
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.22, 24), M.line);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.07;
  g.add(ring);
  for (const s of [-1, 1]) {
    const x = s * w / 2;
    g.add(box(0.08, 0.9, 0.08, M.white, x, 0, -1), box(0.08, 0.9, 0.08, M.white, x, 0, 1), box(0.08, 0.08, 2.1, M.white, x, 0.9, 0));
  }
  return g;
}

function bridge(l) {
  const g = new THREE.Group();
  const streamLen = l.x + l.w / 2 - (seaX(l.z) - 6);
  const stream = new THREE.Mesh(new THREE.PlaneGeometry(streamLen, 2.6), M.water);
  stream.rotation.x = -Math.PI / 2;
  stream.position.set(l.w / 2 - streamLen / 2, 0.04, 0);
  g.add(stream);
  g.add(box(1.8, 0.3, 6, M.stone, 0, 1.15, 0));
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.22, 6, 14, Math.PI), M.stone);
  arch.rotation.y = Math.PI / 2;
  g.add(arch);
  for (const s of [-1, 1]) g.add(box(0.12, 0.4, 6, M.white, s * 0.85, 1.45, 0));
  return g;
}

function palm(rand) {
  const g = new THREE.Group();
  const h = 2.6 + rand() * 1.2;
  const trunk = cyl(0.1, 0.16, h, M.palmTrunk, 0, 0, 0, 6);
  trunk.rotation.z = (rand() - 0.5) * 0.25;
  g.add(trunk);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.32), M.palmLeaf);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.65, h - 0.1, Math.sin(a) * 0.65);
    leaf.rotation.set(0, -a, -0.45);
    g.add(leaf);
  }
  return g;
}

function boat(rand) {
  const g = new THREE.Group();
  g.add(box(2.2, 0.5, 0.9, M.hull, 0, -0.15, 0));
  g.add(box(2.22, 0.1, 0.92, M.stripe, 0, 0.12, 0));
  g.add(cyl(0.04, 0.04, 1.6, M.pole, 0.2, 0.3, 0, 5));
  g.rotation.y = rand() * Math.PI;
  return g;
}

function coast(span) {
  const g = new THREE.Group();
  const shape = (offset, west) => {
    const s = new THREE.Shape();
    s.moveTo(west, span);   // shape y is -z (the shape is laid flat with rotation.x = -90°)
    for (let z = -span; z <= span; z += 3) s.lineTo(seaX(z) + offset, -z);
    s.lineTo(west, -span);
    return new THREE.ShapeGeometry(s);
  };
  const beach = new THREE.Mesh(shape(5, -span), M.beach);
  const sea = new THREE.Mesh(shape(0, -span), M.sea);
  beach.rotation.x = sea.rotation.x = -Math.PI / 2;
  beach.position.y = 0.01;
  sea.position.y = 0.05;
  g.add(beach, sea);
  return g;
}

/** Everything that is not a house. Returns the group and a per-frame tick(t). */
export function buildLandmarks(labels, span) {
  let seed = 99;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const root = new THREE.Group();
  const ticks = [];
  root.add(coast(span));

  for (const l of LANDMARKS) {
    let obj;
    if (l.id === 'hummusiya') obj = hummusiya();
    else if (l.id === 'municipality') obj = municipality();
    else if (l.id === 'taboun') { const t = taboun(); obj = t.group; ticks.push(t.tick); }
    else if (l.id === 'olives') obj = olives(l, rand);
    else if (l.id === 'football') obj = football(l);
    else if (l.id === 'bridge') obj = bridge(l);
    obj.position.set(l.x, 0, l.z);
    root.add(obj);
    if (labels[l.id]) {
      const s = labelSprite(labels[l.id]);
      s.position.set(l.x, l.id === 'hummusiya' ? 7.5 : l.id === 'municipality' ? 8.5 : 5, l.z);
      root.add(s);
    }
  }

  for (let z = -60; z <= 60; z += 9 + rand() * 6) {
    const p = palm(rand);
    p.position.set(seaX(z) + 3 + rand() * 1.5, 0, z);
    root.add(p);
  }
  const boats = [];
  for (let i = 0; i < 6; i++) {
    const b = boat(rand), z = -50 + i * 20 + rand() * 8;
    b.position.set(seaX(z) - 8 - rand() * 18, 0.1, z);
    root.add(b);
    boats.push(b);
  }
  ticks.push(t => boats.forEach((b, i) => {
    b.position.y = 0.12 + Math.sin(t * 1.3 + i) * 0.08;
    b.rotation.z = Math.sin(t * 0.9 + i * 2) * 0.05;
  }));

  return { group: root, tick: t => ticks.forEach(f => f(t)) };
}
