// The 3D village. Houses are three InstancedMeshes (walls, roof slab, water tank); instance k is house k+1.
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { BLOCK_W, BLOCK_D, PITCH_X, PITCH_Z, seaX } from './shared/layout.js';
import { buildLandmarks } from './landmarks.js';

const WALLS = ['#f7efe0', '#f1e2c2', '#e9cfa3', '#f3d9c4', '#d9e6e8', '#efc9b4', '#ece6da', '#f4e2a8', '#dcc9ad', '#f6ece4',
  '#cfe0d0', '#f0d2a0', '#e4d4ea', '#fbf6ee', '#e8b996'];
const ROOFS = ['#d6c8ad', '#cbbd9f', '#ddd3c0', '#bfae90'];
const VACANT = new THREE.Color('#a39d93');
const MINE = new THREE.Color('#e0663a');

const hash = n => { let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); return (h ^ (h >>> 16)) >>> 0; };
const floorsOf = n => { const r = hash(n) % 100; return r < 45 ? 1 : r < 87 ? 2 : 3; };
const FLOOR_H = 0.62;
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function createVillage(canvas, { layout, houses, vacant, labels }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = new THREE.Scene();
  const sky = new THREE.Color('#cfe6ef');
  scene.background = sky;

  // How big is the village right now? R = radius of the built area, V = radius of the opening view.
  let R = 30;
  for (let k = 0; k < houses; k++) R = Math.max(R, Math.hypot(layout.x[k], layout.z[k]));
  const V = Math.min(R, 55);
  const span = Math.max(400, R * 4);
  scene.fog = new THREE.Fog(sky, R * 1.6 + 120, R * 4.5 + 400);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.5, span * 3);
  scene.add(new THREE.HemisphereLight('#fff6e2', '#b7a77a', 1.9));
  const sun = new THREE.DirectionalLight('#fff0d0', 1.7);
  sun.position.set(-60, 90, 40);
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(span * 2, span * 2), new THREE.MeshLambertMaterial({ color: '#cbbd8c' }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const landmarks = buildLandmarks(labels, span);
  scene.add(landmarks.group);

  // Streets (darker tile per block) and pavements.
  const blocks = Math.ceil(houses / (BLOCK_W * BLOCK_D));
  const flat = (w, d, color, y) => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(w, 0.04, d).translate(0, y, 0), new THREE.MeshLambertMaterial({ color }), Math.max(blocks, 1));
    m.count = blocks;
    return m;
  };
  const roads = flat(PITCH_X + 0.02, PITCH_Z + 0.02, '#9b917f', 0.02);
  const pads = flat(BLOCK_W + 0.3, BLOCK_D + 0.3, '#e7dcc4', 0.05);
  const tmp = new THREE.Object3D();
  for (let b = 0; b < blocks; b++) {
    tmp.position.set(layout.blockX[b], 0, layout.blockZ[b]);
    tmp.updateMatrix();
    roads.setMatrixAt(b, tmp.matrix);
    pads.setMatrixAt(b, tmp.matrix);
  }
  scene.add(roads, pads);

  // Houses. Each gets a stable look from its number: colour, floors, a little nudge and twist so streets feel lived-in.
  const cap = Math.max(houses, 1);
  const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(0.74, 1, 0.74).translate(0, 0.5, 0), new THREE.MeshLambertMaterial(), cap);
  const roofs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.82, 0.08, 0.82), new THREE.MeshLambertMaterial(), cap);
  const tanks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.34, 6).rotateZ(Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#2b2b2b' }), cap);
  const vacantSet = new Set(vacant);
  const color = new THREE.Color();
  const wallColor = n => (vacantSet.has(n) ? VACANT : color.set(WALLS[hash(n) % WALLS.length]));
  const top = new Float32Array(cap);
  let tankCount = 0;
  for (let k = 0; k < houses; k++) {
    const n = k + 1, r = hash(n), x = layout.x[k] + ((r & 15) - 7.5) * 0.008, z = layout.z[k] + (((r >> 4) & 15) - 7.5) * 0.008;
    const s = 0.86 + ((r >> 8) & 15) * 0.012, h = floorsOf(n) * FLOOR_H, ry = (((r >> 12) & 15) - 7.5) * 0.012;
    top[k] = h + 0.07;
    tmp.position.set(x, 0.07, z); tmp.scale.set(s, h, s); tmp.rotation.set(0, ry, 0); tmp.updateMatrix();
    walls.setMatrixAt(k, tmp.matrix);
    walls.setColorAt(k, wallColor(n));
    tmp.position.set(x, h + 0.11, z); tmp.scale.set(s, 1, s); tmp.updateMatrix();
    roofs.setMatrixAt(k, tmp.matrix);
    roofs.setColorAt(k, color.set(ROOFS[(r >> 16) % ROOFS.length]));
    if (hash(n * 7) % 3 === 0) {
      tmp.position.set(x + 0.15, h + 0.24, z - 0.15 * layout.facing[k]); tmp.scale.set(1, 1, 1); tmp.updateMatrix();
      tanks.setMatrixAt(tankCount++, tmp.matrix);
    }
  }
  walls.count = roofs.count = houses;
  tanks.count = tankCount;

  // Olive trees: gardens inside the village and a scatter in the fields around it.
  const parks = layout.parks.filter(p => p.after < houses);
  const used = new Set();
  const cellKey = (x, z) => `${Math.round(x / PITCH_X)},${Math.round(z / PITCH_Z)}`;
  for (let b = 0; b < blocks; b++) used.add(cellKey(layout.blockX[b], layout.blockZ[b]));
  const treeSpots = [];
  for (const p of parks) for (let i = 0; i < 6; i++)
    treeSpots.push([p.x - 2.4 + (i % 3) * 2.4 + ((hash(i + p.x * 31) & 7) - 3.5) * 0.12, p.z - 0.7 + Math.floor(i / 3) * 1.4]);
  let seed = 4242;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < Math.min(2500, 300 + R * 6); i++) {
    const a = rnd() * Math.PI * 2, d = R + 6 + rnd() * 70;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (x < seaX(z) + 8 || used.has(cellKey(x, z))) continue;
    treeSpots.push([x, z]);
  }
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.15, 0.7, 5).translate(0, 0.35, 0), new THREE.MeshLambertMaterial({ color: '#6b4f3a' }), Math.max(treeSpots.length, 1));
  const crowns = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.7, 0).translate(0, 1.15, 0), new THREE.MeshLambertMaterial({ color: '#7d8b5a', flatShading: true }), Math.max(treeSpots.length, 1));
  treeSpots.forEach(([x, z], i) => {
    const s = 0.8 + (hash(i) % 40) / 100;
    tmp.position.set(x, 0, z); tmp.scale.set(s, s, s); tmp.rotation.set(0, i, 0); tmp.updateMatrix();
    trunks.setMatrixAt(i, tmp.matrix);
    crowns.setMatrixAt(i, tmp.matrix);
  });
  trunks.count = crowns.count = treeSpots.length;
  const gardens = flat(BLOCK_W + 0.3, BLOCK_D + 0.3, '#b9b27a', 0.05);
  gardens.count = parks.length;
  parks.forEach((p, i) => { tmp.position.set(p.x, 0, p.z); tmp.scale.set(1, 1, 1); tmp.rotation.set(0, 0, 0); tmp.updateMatrix(); gardens.setMatrixAt(i, tmp.matrix); });
  const parkRoads = flat(PITCH_X + 0.02, PITCH_Z + 0.02, '#9b917f', 0.02);
  parkRoads.count = parks.length;
  parks.forEach((p, i) => { tmp.position.set(p.x, 0, p.z); tmp.updateMatrix(); parkRoads.setMatrixAt(i, tmp.matrix); });

  for (const m of [walls, roofs, tanks, roads, pads, trunks, crowns, gardens, parkRoads]) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }
  for (const m of [walls, roofs]) if (m.instanceColor) m.instanceColor.needsUpdate = true;
  scene.add(walls, roofs, tanks, trunks, crowns, gardens, parkRoads);

  // "You live here" pin.
  const pin = new THREE.Group();
  const pinMat = new THREE.MeshLambertMaterial({ color: MINE, emissive: '#5a1a08' });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 10).rotateX(Math.PI), pinMat);
  cone.position.y = 0.45;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), pinMat);
  head.position.y = 1.1;
  pin.add(cone, head);
  pin.visible = false;
  scene.add(pin);
  let mine = 0;

  // Ring around the house we just flew to.
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.86, 28).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: MINE, transparent: true, opacity: 0.9, depthWrite: false }));
  ring.position.y = 0.09;
  ring.visible = false;
  scene.add(ring);

  // Camera + controls.
  const controls = new MapControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = 1.32;
  controls.minDistance = 4;
  controls.maxDistance = Math.max(160, R * 3.2);
  controls.screenSpacePanning = false;
  const home = { target: new THREE.Vector3(4, 0, 2), pos: new THREE.Vector3(4 + V * 0.2, V * 0.85 + 16, 2 + V * 1.05 + 22) };
  camera.position.copy(home.pos);
  controls.target.copy(home.target);

  let flight = null;
  function flyTo(target, pos, ms = 1400) {
    flight = { t0: performance.now(), ms, fromT: controls.target.clone(), fromP: camera.position.clone(), toT: target, toP: pos };
  }
  function flyToHouse(n) {
    if (n < 1 || n > houses) return;
    const x = layout.x[n - 1], z = layout.z[n - 1];
    ring.position.x = x; ring.position.z = z; ring.visible = true;
    flyTo(new THREE.Vector3(x, 0.6, z), new THREE.Vector3(x + 5, 10, z + 12));
  }

  function setMine(n) {
    if (mine) walls.setColorAt(mine - 1, wallColor(mine));
    mine = n >= 1 && n <= houses ? n : 0;
    if (mine) walls.setColorAt(mine - 1, MINE);
    if (walls.instanceColor) walls.instanceColor.needsUpdate = true;
    pin.visible = !!mine;
    if (mine) pin.position.set(layout.x[mine - 1], top[mine - 1] + 0.35, layout.z[mine - 1]);
  }

  // Tap a house → onPick(n). A drag is not a tap.
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null, pickCb = () => {};
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; flight = null; });
  canvas.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(walls, false)[0];
    if (hit?.instanceId !== undefined) pickCb(hit.instanceId + 1);
  });

  // Panels cover part of the screen; shift the picture so what we fly to sits in the middle of the free area.
  let inset = { right: 0, bottom: 0 }, sized = '';
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight, key = `${w}x${h}:${inset.right}:${inset.bottom}`;
    if (key === sized) return;
    sized = key;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.setViewOffset(w, h, inset.right / 2, inset.bottom / 2, w, h);
    camera.updateProjectionMatrix();
  }

  const timer = new THREE.Timer();
  renderer.setAnimationLoop(() => {
    if (document.hidden) return;
    resize();
    timer.update();
    const t = timer.getElapsed();
    if (flight) {
      const f = Math.min(1, (performance.now() - flight.t0) / flight.ms), e = ease(f);
      controls.target.lerpVectors(flight.fromT, flight.toT, e);
      camera.position.lerpVectors(flight.fromP, flight.toP, e);
      if (f === 1) flight = null;
    }
    controls.update();
    landmarks.tick(t);
    if (ring.visible) ring.scale.setScalar(1 + 0.18 * Math.sin(t * 4));
    if (pin.visible) {
      pin.children[1].position.y = 1.1 + Math.sin(t * 3) * 0.15;
      pin.rotation.y = t;
    }
    renderer.render(scene, camera);
  });

  return {
    flyToHouse,
    setMine,
    overview: () => flyTo(home.target.clone(), home.pos.clone()),
    setInset: (right, bottom) => { inset = { right, bottom }; },
    onPick: cb => { pickCb = cb; },
  };
}
