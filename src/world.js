// Builds one floor of the hospital from its map (see floors.js): geometry, props, lights, doors, lockers,
// pickups, special objects, plus grid helpers the player and monster use (collision, paths, line of sight).
import * as THREE from 'three';
import { psx } from './engine.js';
import * as T from './textures.js';

export const CELL = 2;
export const WALL_H = 3;
export const PHONE_LAYER = 1; // things only the phone camera can see

let M = null; // shared materials, made once
function materials(A) {
  if (M) return M;
  const lam = (o, desat) => psx(new THREE.MeshLambertMaterial(o), desat);
  M = {
    wall: lam({ map: A.tex.wall }),
    floor: lam({ map: A.tex.floor }),
    ceiling: lam({ map: T.ceilingTex() }),
    roof: lam({ color: 0x3a3a3c }),
    parapet: lam({ color: 0x4a4844 }),
    metal: lam({ color: 0x55534c }),
    steel: lam({ map: A.tex.metal, color: 0x8a8a84 }),
    steelPanel: lam({ map: A.tex.metal, color: 0x8a8a84, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), // flat on a wall
    rust: lam({ color: 0x4a3324 }),
    locker: lam({ map: A.tex.metal, color: 0x5d6b62 }),
    table: lam({ map: A.tex.metal, color: 0x8a7a66 }),
    sheet: lam({ color: 0xb8b4a6 }),
    dark: new THREE.MeshBasicMaterial({ color: 0x000000 }),
    wood: lam({ color: 0x5a3e28 }),
    stall: lam({ color: 0x6a7068 }),
  };
  return M;
}

const grime = new Map();
function grimy(m) {
  if (!grime.has(m)) {
    if (m.map) m.map.magFilter = m.map.minFilter = THREE.NearestFilter;
    grime.set(m, psx(new THREE.MeshLambertMaterial({ map: m.map, color: 0x9a8a70 }), 0.8));
  }
  return grime.get(m);
}

const jitter = (amount) => (Math.random() - 0.5) * amount;
const place = (mesh, x, y, z) => { mesh.position.set(x, y, z); return mesh; };

export function buildFloor(key, def, A, opts = {}) {
  const mat = materials(A);
  const map = def.map;
  const ROWS = map.length, COLS = map[0].length;
  const group = new THREE.Group();
  group.name = key;
  const taken = opts.taken || new Set();
  const lessGore = !!opts.lessGore;

  const at = (x, z) => (map[z] && map[z][x]) || ' ';
  const walkable = (x, z) => !'# '.includes(at(x, z));
  const cellCenter = (x, z) => new THREE.Vector3(x * CELL + CELL / 2, 0, z * CELL + CELL / 2);
  const cellOf = (v) => [Math.floor(v.x / CELL), Math.floor(v.z / CELL)];
  const id = (x, z) => `${key}:${x},${z}`;

  const floor = {
    key, def, group, COLS, ROWS, at, walkable, cellCenter, cellOf,
    solids: [], doors: [], lockers: [], lights: [], interactables: [], waypoints: [], noisy: [], objects: {},
    tickers: [],                 // per-frame animations (doors swinging, music box, etc.)
    outdoor: !!def.outdoor,
  };
  const addSolid = (cx, cz, hw, hd, tag) => {
    const s = { minX: cx - hw, maxX: cx + hw, minZ: cz - hd, maxZ: cz + hd, tag };
    floor.solids.push(s);
    return s;
  };
  const add = (o) => { group.add(o); return o; };
  const interact = (o) => { floor.interactables.push({ enabled: true, radius: 0.5, ...o }); return o; };
  const doorAt = new Map();

  // ---------------------------------------------------------------- walls, floor, ceiling
  const wallCells = [];
  for (let z = 0; z < ROWS; z++) for (let x = 0; x < COLS; x++) {
    if (at(x, z) !== '#') continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => walkable(x + dx, z + dz))) wallCells.push([x, z]);
  }
  const wallH = floor.outdoor ? 1.1 : WALL_H; // the roof has a low parapet instead of walls
  const wallMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL, wallH, CELL), floor.outdoor ? mat.parapet : mat.wall, wallCells.length);
  wallCells.forEach(([x, z], i) => {
    const c = cellCenter(x, z);
    wallMesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(c.x, wallH / 2, c.z));
    addSolid(c.x, c.z, CELL / 2, CELL / 2, 'wall');
  });
  wallMesh.castShadow = wallMesh.receiveShadow = true;
  add(wallMesh);

  function plane(material, y, flip) {
    const m = material.clone();
    if (material.map) {
      m.map = material.map.clone();
      m.map.repeat.set(COLS, ROWS);
      m.map.needsUpdate = true;
    }
    m.onBeforeCompile = material.onBeforeCompile;
    m.customProgramCacheKey = material.customProgramCacheKey;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(COLS * CELL, ROWS * CELL, COLS, ROWS), m);
    p.rotation.x = flip ? Math.PI / 2 : -Math.PI / 2;
    p.position.set((COLS * CELL) / 2, y, (ROWS * CELL) / 2);
    p.receiveShadow = true;
    return add(p);
  }
  plane(floor.outdoor ? mat.roof : mat.floor, 0, false);
  if (!floor.outdoor) plane(mat.ceiling, WALL_H, true);

  // ---------------------------------------------------------------- helpers
  function decal(texture, w, h, pos, rotX, rotY, layer = 0) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      psx(new THREE.MeshLambertMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }))
    );
    m.position.copy(pos);
    m.renderOrder = 1 + pos.y; // overlapping decals always stack the same way (the higher one on top)
    m.rotation.set(rotX, rotY, 0, 'YXZ');
    if (layer) m.layers.set(layer);
    return add(m);
  }
  floor.decal = decal;

  // a point on the face of wall cell (x, z), and the rotation that faces out of it
  function wallFace(x, z, face, y) {
    const c = cellCenter(x, z).setY(y);
    if (face === 'south') return { pos: c.setZ((z + 1) * CELL + 0.04), rotY: 0 };
    if (face === 'north') return { pos: c.setZ(z * CELL - 0.04), rotY: Math.PI };
    if (face === 'east') return { pos: c.setX((x + 1) * CELL + 0.04), rotY: Math.PI / 2 };
    return { pos: c.setX(x * CELL - 0.04), rotY: -Math.PI / 2 };
  }

  // put something against whichever wall borders cell (x, z), facing into the room
  function againstWall(x, z, depth) {
    const c = cellCenter(x, z);
    if (!walkable(x, z - 1)) return { pos: c.setZ(z * CELL + depth), rotY: 0 };
    if (!walkable(x, z + 1)) return { pos: c.setZ((z + 1) * CELL - depth), rotY: Math.PI };
    if (!walkable(x - 1, z)) return { pos: c.setX(x * CELL + depth), rotY: Math.PI / 2 };
    if (!walkable(x + 1, z)) return { pos: c.setX((x + 1) * CELL - depth), rotY: -Math.PI / 2 };
    return { pos: c, rotY: 0 };
  }
  const facing = (rotY) => new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY)); // direction an object faces

  function prop(name, pos, rotY, { y = 0, solid = true, scale = 1.4 } = {}) {
    const m = A.models[name].scene.clone(true);
    m.scale.setScalar(scale);
    m.position.set(pos.x, y, pos.z);
    m.rotation.y = rotY;
    m.traverse((o) => {
      if (!o.isMesh) return;
      o.material = grimy(o.material);
      o.castShadow = o.receiveShadow = true;
    });
    add(m);
    if (solid) {
      const b = new THREE.Box3().setFromObject(m);
      addSolid((b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2, (b.max.x - b.min.x) / 2, (b.max.z - b.min.z) / 2, 'prop');
    }
    return m;
  }

  function box(w, h, d, material, x, y, z, rotY = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    m.castShadow = m.receiveShadow = true;
    return add(m);
  }

  // ---------------------------------------------------------------- lights
  function ceilingLight(c, kind) {
    const red = kind === 'R';
    const panelMat = new THREE.MeshBasicMaterial({ color: red ? 0x902020 : 0xcfe8c0 });
    const panel = add(new THREE.Mesh(new THREE.BoxGeometry(red ? 0.3 : 1.3, 0.05, 0.3), panelMat));
    panel.position.set(c.x, (floor.outdoor ? 2.6 : WALL_H) - 0.03, c.z);
    const base = red ? 2.2 : 7;
    const light = add(new THREE.PointLight(red ? 0xa01818 : 0xc8e6b4, base, red ? 7 : 11, 1.6));
    light.position.set(c.x, WALL_H - 0.25, c.z);
    floor.lights.push({
      light, panelMat, base, flicker: kind === 'F', red, off: false, dark: false, timer: 0,
      needsPower: !red && !!def.needsPower, color: light.color.clone(), panelColor: panelMat.color.clone(),
    });
  }

  // ---------------------------------------------------------------- doors
  // A door fills its cell. It swings open when used (or when the monster comes through).
  function door(x, z) {
    const c = cellCenter(x, z);
    const alongX = !walkable(x - 1, z) && !walkable(x + 1, z); // in a wall running east-west
    const meta = (def.doors || {})[`${x},${z}`] || {};
    const pivot = new THREE.Group();
    pivot.position.set(alongX ? c.x - CELL / 2 + 0.05 : c.x, 0, alongX ? c.z : c.z - CELL / 2 + 0.05);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(alongX ? CELL - 0.1 : 0.08, 2.3, alongX ? 0.08 : CELL - 0.1), mat.wood);
    slab.position.set(alongX ? (CELL - 0.1) / 2 : 0, 1.15, alongX ? 0 : (CELL - 0.1) / 2);
    slab.castShadow = slab.receiveShadow = true;
    pivot.add(slab);
    add(pivot);
    // the wall above the door
    box(alongX ? CELL : 0.3, WALL_H - 2.35, alongX ? 0.3 : CELL, mat.wall, c.x, 2.35 + (WALL_H - 2.35) / 2, c.z);
    const solid = addSolid(c.x, c.z, alongX ? CELL / 2 : 0.12, alongX ? 0.12 : CELL / 2, 'door');
    const d = {
      x, z, pivot, solid, alongX, open: false, swing: 0, code: meta.code, label: meta.label, locked: !!meta.code,
      openNow(sound = true) {
        if (d.open) return;
        d.open = true;
        floor.solids.splice(floor.solids.indexOf(d.solid), 1);
        if (sound && floor.onSound) floor.onSound('door_creak_open', c, 0.7);
      },
    };
    floor.tickers.push((dt) => {
      const goal = d.open ? -Math.PI / 2 : 0;
      d.swing += (goal - d.swing) * Math.min(1, dt * 4);
      pivot.rotation.y = d.swing * (alongX ? 1 : -1);
    });
    floor.doors.push(d);
    doorAt.set(`${x},${z}`, d);
    interact({
      id: d.code ? `keypad:${x},${z}` : `door:${x},${z}`, pos: c.clone().setY(1.2), radius: 0.9,
      label: () => (d.open ? null : d.locked ? `[E] ${d.label || 'Locked door'} (keypad)` : '[E] Open door'),
      use: () => floor.onUse && floor.onUse(d.locked ? 'keypad' : 'door', d),
    });
  }

  // ---------------------------------------------------------------- lockers
  function locker(x, z) {
    const w = againstWall(x, z, 0.32);
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.05, 0.62), mat.locker);
    body.position.y = 1.025;
    body.castShadow = body.receiveShadow = true;
    g.add(body);
    for (let i = 0; i < 5; i++) { // vent slats
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.01), mat.dark);
      slat.position.set(0, 1.55 + i * 0.06, 0.315);
      g.add(slat);
    }
    g.position.copy(w.pos);
    g.rotation.y = w.rotY;
    add(g);
    const f = facing(w.rotY);
    addSolid(w.pos.x, w.pos.z, Math.abs(f.x) > 0.5 ? 0.31 : 0.45, Math.abs(f.x) > 0.5 ? 0.45 : 0.31, 'locker');
    const l = {
      x, z, group: g, yaw: Math.atan2(-f.x, -f.z), // camera yaw that looks out of the locker
      inside: w.pos.clone().setY(1.55).addScaledVector(f, 0.02),
      outside: w.pos.clone().addScaledVector(f, 0.85).setY(0),
    };
    floor.lockers.push(l);
    interact({ id: `locker:${x},${z}`, pos: w.pos.clone().setY(1.3), radius: 0.6, label: () => '[E] Hide in locker', use: () => floor.onUse && floor.onUse('locker', l) });
  }

  // ---------------------------------------------------------------- pickups
  let noteN = 0, tapeN = 0;
  function pickup(x, z, kind) {
    const iid = id(x, z);
    const c = cellCenter(x, z);
    const n = kind === 'note' ? noteN++ : kind === 'tape' ? tapeN++ : 0;
    if (taken.has(iid) && kind !== 'note') return; // (older saves counted notes as taken)
    let mesh;
    if (kind === 'battery') {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 6), new THREE.MeshBasicMaterial({ color: 0xb8a24a }));
      mesh.rotation.z = Math.PI / 2;
      mesh.position.set(c.x + jitter(0.6), 0.05, c.z + jitter(0.6));
    } else if (kind === 'note') {
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3), new THREE.MeshBasicMaterial({ color: 0xd8d2bc }));
      mesh.rotation.set(-Math.PI / 2, 0, jitter(1));
      mesh.position.set(c.x + jitter(0.5), 0.02, c.z + jitter(0.5));
    } else if (kind === 'tape') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.016, 0.065), new THREE.MeshBasicMaterial({ color: 0x2a2a30 }));
      mesh.position.set(c.x + jitter(0.5), 0.015, c.z + jitter(0.5));
      mesh.rotation.y = jitter(3);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.03), new THREE.MeshBasicMaterial({ color: 0xc8b878 }));
      label.rotation.x = -Math.PI / 2;
      label.position.y = 0.009;
      mesh.add(label);
    } else if (kind === 'keycard') {
      const color = { red: 0xa01010, blue: 0x1040b0, black: 0x151515 }[def.keycard] || 0xa01010;
      const table = box(0.6, 0.75, 0.45, mat.table, c.x, 0.375, c.z);
      addSolid(c.x, c.z, 0.3, 0.23, 'prop');
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.006, 0.055), new THREE.MeshBasicMaterial({ color }));
      mesh.position.set(c.x, 0.755, c.z);
      mesh.rotation.y = 0.4;
      // a faint glint so it can be found
      const glint = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.055), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
      glint.rotation.x = -Math.PI / 2;
      glint.position.y = 0.004;
      mesh.add(glint);
      mesh.userData.table = table;
    }
    add(mesh);
    const data = { kind, n, key: def.keycard };
    const label = { battery: '[E] Take battery', note: '[E] Read note', tape: '[E] Take cassette tape', keycard: `[E] Take ${(def.keycard || '').toUpperCase()} keycard` }[kind];
    const it = interact({
      id: iid, pos: mesh.position, radius: 0.35, label: () => label,
      use: () => {
        if (kind !== 'note') { // notes are read where they lie and stay there
          group.remove(mesh);
          it.enabled = false;
          taken.add(iid);
        }
        if (floor.onPickup) floor.onPickup(kind, data, iid);
      },
    });
  }

  // ---------------------------------------------------------------- stairs and payphones
  function stairs(x, z, dir) {
    const c = cellCenter(x, z);
    const w = againstWall(x, z, 0.1);
    // a stairwell door with a green sign over it
    const f = facing(w.rotY);
    const doorMesh = box(1.2, 2.2, 0.08, mat.steel, w.pos.x, 1.1, w.pos.z, w.rotY);
    doorMesh.position.addScaledVector(f, 0.02);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), new THREE.MeshBasicMaterial({ map: T.signTex(dir === 'up' ? 'STAIRS ▲' : 'STAIRS ▼') }));
    sign.position.copy(w.pos).setY(2.45).addScaledVector(f, 0.05);
    sign.rotation.y = w.rotY;
    add(sign);
    interact({ id: `stairs:${dir}`, pos: c.clone().setY(1.2), radius: 0.9, label: () => (dir === 'up' ? '[E] Go upstairs' : '[E] Go downstairs'), use: () => floor.onUse && floor.onUse('stairs', dir) });
  }

  function payphone(x, z) {
    const w = againstWall(x, z, 0.12);
    const g = new THREE.Group();
    g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.2), mat.steel), 0, 1.4, 0));
    g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), mat.dark), -0.15, 1.45, 0.12));
    g.position.copy(w.pos);
    g.rotation.y = w.rotY;
    add(g);
    interact({ id: `payphone:${x},${z}`, pos: w.pos.clone().setY(1.4), radius: 0.5, label: () => '[E] Use payphone (save progress)', use: () => floor.onUse && floor.onUse('payphone', { x, z }) });
  }

  // ---------------------------------------------------------------- a body under a sheet, on a gurney
  // The sheet is draped over a rough body shape (head, chest, hips, legs, feet tenting it up) and hangs over
  // the gurney's sides. One grey arm has slipped out and hangs down, a keycard still in its fingers.
  // Returns the keycard mesh (null if it's already been taken).
  function corpse(c, rotY, cardTaken) {
    const TOP = 0.69, LEN = 2.0, WID = 0.95, HALF = 0.37; // gurney top height and half width
    const parts = [ // [along (m from the head end), across, half-length, half-width, height]
      [0.14, 0, 0.12, 0.1, 0.19], [0.5, 0, 0.3, 0.22, 0.2], [0.86, 0, 0.16, 0.2, 0.16],
      [1.3, -0.1, 0.42, 0.08, 0.12], [1.3, 0.1, 0.42, 0.08, 0.12], [1.78, -0.11, 0.06, 0.06, 0.2], [1.78, 0.11, 0.06, 0.06, 0.2],
    ];
    const NX = 14, NZ = 32;
    const body = (s, x) => {
      let h = 0;
      for (const [ps, px, rs, rx, ph] of parts) {
        const k = 1 - ((s - ps) / rs) ** 2 - ((x - px) / rx) ** 2;
        if (k > 0) h = Math.max(h, ph * Math.sqrt(k));
      }
      return h;
    };
    const geo = new THREE.PlaneGeometry(WID, LEN, NX, NZ);
    geo.rotateX(-Math.PI / 2);
    const P = geo.attributes.position;
    const base = [], H = [];
    for (let i = 0; i < P.count; i++) { base[i] = body(P.getZ(i) + LEN / 2, P.getX(i)); H[i] = base[i]; }
    // the cloth rests on the high points and sags between them (feet tent it, it dips between the legs)
    const at = (ix, iz) => H[iz * (NX + 1) + ix];
    for (let pass = 0; pass < 5; pass++) {
      const next = H.slice();
      for (let iz = 0; iz <= NZ; iz++) for (let ix = 0; ix <= NX; ix++) {
        const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => at(Math.min(NX, Math.max(0, ix + dx)), Math.min(NZ, Math.max(0, iz + dz))));
        const i = iz * (NX + 1) + ix;
        next[i] = Math.max(base[i], (n.reduce((a, v) => a + v, 0) / 4) * 0.93);
      }
      H.splice(0, H.length, ...next);
    }
    const colors = [];
    const cloth = new THREE.Color(0xb8b4a6), blood = new THREE.Color(0x4a0606), tmpC = new THREE.Color();
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), s = P.getZ(i) + LEN / 2;
      const over = Math.max(0, Math.abs(x) - HALF); // past the gurney edge it falls away
      P.setY(i, TOP + H[i] - over * 3.2 + Math.random() * 0.006);
      // old blood soaked through at the chest and the head
      const stain = lessGore ? 0 : Math.max(0, 1 - Math.hypot((s - 0.52) / 0.2, (x - 0.06) / 0.16)) + 0.6 * Math.max(0, 1 - Math.hypot((s - 0.12) / 0.1, x / 0.1));
      tmpC.copy(cloth).lerp(blood, Math.min(1, stain * 1.6 + (Math.random() < stain ? 0.3 : 0)));
      colors.push(tmpC.r, tmpC.g, tmpC.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const g = new THREE.Group();
    const sheet = new THREE.Mesh(geo, psx(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, flatShading: true })));
    sheet.castShadow = sheet.receiveShadow = true;
    g.add(sheet);
    // the arm that slipped out, hanging over the side
    const skin = psx(new THREE.MeshLambertMaterial({ color: 0x8a8f86 }));
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.5, 6), skin);
    arm.position.set(HALF + 0.07, TOP - 0.2, 0.36 - LEN / 2);
    arm.rotation.z = -0.12;
    g.add(arm);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.09), skin);
    hand.position.set(HALF + 0.1, TOP - 0.5, 0.36 - LEN / 2);
    hand.rotation.z = -0.12;
    g.add(hand);
    for (let i = 0; i < 4; i++) { // curled fingers
      const finger = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.06, 0.018), skin);
      finger.position.set(HALF + 0.095, TOP - 0.59, 0.36 - LEN / 2 - 0.032 + i * 0.021);
      finger.rotation.z = 0.4;
      g.add(finger);
    }
    let card = null;
    if (!cardTaken) {
      card = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.054, 0.085), new THREE.MeshBasicMaterial({ color: 0xb01818 }));
      card.position.set(HALF + 0.13, TOP - 0.6, 0.36 - LEN / 2 + 0.02);
      card.rotation.z = 0.3;
      g.add(card);
    }
    g.position.copy(c);
    g.rotation.y = rotY;
    add(g);
    g.updateMatrixWorld(true);
    if (!lessGore) { // it has been dripping off the fingers for a while
      const drip = g.localToWorld(new THREE.Vector3(HALF + 0.12, 0, 0.36 - LEN / 2));
      decal(A.tex.blood[1], 0.7, 0.7, drip.setY(0.014), -Math.PI / 2, 1.3);
    }
    return card;
  }

  // ---------------------------------------------------------------- noisy things: trays and broken glass
  function tray(x, z) {
    const c = cellCenter(x, z);
    const pos = c.clone().add(new THREE.Vector3(jitter(0.8), 0, jitter(0.8)));
    const stand = box(0.5, 0.8, 0.35, mat.metal, pos.x, 0.4, pos.z, jitter(3));
    const tools = box(0.4, 0.04, 0.25, mat.steel, pos.x, 0.82, pos.z, stand.rotation.y);
    addSolid(pos.x, pos.z, 0.25, 0.25, 'prop');
    const n = { pos, radius: 0.7, kind: 'tray', done: false };
    n.trigger = () => {
      n.done = true;
      let t = 0;
      floor.tickers.push((dt) => { // it topples over
        if (t > 1) return;
        t += dt * 3;
        stand.rotation.z = Math.min(1, t) * 1.45;
        stand.position.y = 0.4 - Math.min(1, t) * 0.2;
        tools.position.y = Math.max(0.03, 0.82 - t * 1.2);
        tools.rotation.x = t * 2;
      });
    };
    floor.noisy.push(n);
  }

  function glass(x, z) {
    const c = cellCenter(x, z);
    decal(T.glassTex(), 1.6, 1.6, c.clone().setY(0.012), -Math.PI / 2, Math.random() * 6);
    floor.noisy.push({ pos: c, radius: 0.9, kind: 'glass', repeat: true, cooldown: 0 });
  }

  // ---------------------------------------------------------------- the map
  for (let z = 0; z < ROWS; z++) {
    for (let x = 0; x < COLS; x++) {
      const ch = at(x, z), c = cellCenter(x, z);
      if ('LFR'.includes(ch)) ceilingLight(c, ch);
      else if (ch === 'D') door(x, z);
      else if (ch === 'H') locker(x, z);
      else if (ch === 'Q') payphone(x, z);
      else if (ch === '^') stairs(x, z, 'up');
      else if (ch === 'v') stairs(x, z, 'down');
      else if (ch === 'B') prop('bed', c, Math.PI * Math.round(Math.random()) + jitter(0.4));
      else if (ch === 'y') prop('bed', c, Math.PI * Math.round(Math.random()) + jitter(0.3), { scale: 1.05 });
      else if (ch === 'G') prop('gurney', c, jitter(0.8));
      else if (ch === 'O') prop('opchair', c, Math.PI / 2 + jitter(0.3));
      else if (ch === 'W') prop('gurney', c, jitter(3), { scale: 1.0 });
      else if (ch === 'c') { const w = againstWall(x, z, 0.02); prop('cupboard', w.pos, w.rotY); prop('cupboardTop', w.pos, w.rotY, { y: 1.75, solid: false }); }
      else if (ch === 'm' || ch === 'n') { const w = againstWall(x, z, 0.4); prop(ch === 'm' ? 'monitor' : 'machine', w.pos, w.rotY + jitter(0.3)); }
      else if (ch === 't') tray(x, z);
      else if (ch === 'g') glass(x, z);
      else if (ch === 'b') pickup(x, z, 'battery');
      else if (ch === 'N') pickup(x, z, 'note');
      else if (ch === 'T') pickup(x, z, 'tape');
      else if (ch === 'k') pickup(x, z, 'keycard');
      else if (ch >= '1' && ch <= '9') floor.waypoints[+ch - 1] = c;
      if (ch === 'g') continue; // broken glass has its own decal
      if (ch === 'X' && !lessGore) decal(A.tex.blood[(x + z) % 3], 1.8, 1.8, c.clone().setY(0.01), -Math.PI / 2, Math.random() * 6);
      else if (walkable(x, z) && !floor.outdoor && Math.random() < 0.16) {
        decal(A.tex.grime[(x * 7 + z) % 2], 1.4, 1.4, c.clone().add(new THREE.Vector3(jitter(0.3), 0.008, jitter(0.3))), -Math.PI / 2, Math.random() * 6);
      }
    }
  }
  floor.waypoints = floor.waypoints.filter(Boolean);

  // ---------------------------------------------------------------- special objects
  for (const o of def.objects || []) {
    const c = cellCenter(o.x, o.z);
    const oid = o.id || o.type;
    if (o.type === 'writing') {
      const f = wallFace(o.x, o.z, o.face, o.phoneOnly ? 1.4 : 1.6);
      const d = decal(T.writingTex(o.text), 1.9, 0.475, f.pos, 0, f.rotY, o.phoneOnly ? PHONE_LAYER : 0);
      if (lessGore && !o.phoneOnly) d.material.color.set(0x404040);
    } else if (o.type === 'drawing') {
      const f = wallFace(o.x, o.z, o.face, 1.3);
      decal(T.crayonTex(o.x + o.z), 0.6, 0.6, f.pos, 0, f.rotY);
    } else if (o.type === 'console') {
      const w = againstWall(o.x, o.z, 0.45);
      const desk = box(1.6, 0.8, 0.7, mat.table, w.pos.x, 0.4, w.pos.z, w.rotY);
      const screen = box(0.6, 0.45, 0.06, new THREE.MeshBasicMaterial({ color: 0x0a1a0e }), w.pos.x, 1.05, w.pos.z, w.rotY);
      screen.position.addScaledVector(facing(w.rotY), -0.15);
      const slots = [];
      for (let i = 0; i < 3; i++) {
        const slot = box(0.12, 0.04, 0.08, new THREE.MeshBasicMaterial({ color: 0x220000 }), w.pos.x, 0.82, w.pos.z, w.rotY);
        const side = new THREE.Vector3(Math.cos(w.rotY), 0, -Math.sin(w.rotY));
        slot.position.addScaledVector(side, (i - 1) * 0.35).addScaledVector(facing(w.rotY), 0.15);
        slots.push(slot);
      }
      addSolid(w.pos.x, w.pos.z, 0.8, 0.4, 'prop');
      floor.objects.console = { desk, screen, slots };
      interact({ id: 'console', pos: w.pos.clone().setY(1), radius: 0.8, label: () => '[E] Lockdown console', use: () => floor.onUse('console') });
    } else if (o.type === 'vending') {
      const w = againstWall(o.x, o.z, 0.45);
      const g = new THREE.Group();
      g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.9, 0.8), mat.stall), 0, 0.95, 0));
      const glassFront = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.1), new THREE.MeshBasicMaterial({ color: 0x223028, transparent: true, opacity: 0.85 }));
      glassFront.position.set(-0.1, 1.2, 0.41);
      g.add(glassFront);
      const flap = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.18), mat.dark);
      flap.position.set(-0.1, 0.35, 0.41);
      g.add(flap);
      g.position.copy(w.pos);
      g.rotation.y = w.rotY;
      add(g);
      addSolid(w.pos.x, w.pos.z, 0.45, 0.45, 'prop');
      floor.objects.vending = { group: g, glassFront, front: w.pos.clone().addScaledVector(facing(w.rotY), 0.45), rotY: w.rotY };
      interact({ id: 'vending', pos: w.pos.clone().addScaledVector(facing(w.rotY), 0.5).setY(0.2), radius: 0.5, label: () => (floor.objects.vending.done ? null : '[E] Something is under the machine...'), use: () => floor.onUse('vending') });
    } else if (o.type === 'exit') {
      const f = wallFace(o.x, o.z, 'north', 1.2);
      const shutter = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.4), mat.steelPanel);
      shutter.position.copy(f.pos);
      shutter.rotation.y = f.rotY;
      add(shutter);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshBasicMaterial({ map: T.signTex('EXIT', '#3a0a0a', '#ff6040') }));
      sign.position.copy(f.pos).setY(2.6);
      sign.rotation.y = f.rotY;
      add(sign);
      floor.objects.exit = { shutter };
      interact({ id: 'exit', pos: f.pos.clone(), radius: 1.6, label: () => '[E] Main entrance', use: () => floor.onUse('exit') });
    } else if (o.type === 'elevator') {
      const f = wallFace(o.x, o.z, 'south', 1.15);
      const doors = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.3), mat.steelPanel);
      doors.position.copy(f.pos);
      doors.rotation.y = f.rotY;
      add(doors);
      const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 2.3), mat.dark);
      seam.position.copy(f.pos).add(new THREE.Vector3(0, 0, 0.02).applyAxisAngle(new THREE.Vector3(0, 1, 0), f.rotY));
      seam.rotation.y = f.rotY;
      add(seam);
      const button = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.12), new THREE.MeshBasicMaterial({ color: 0x401010 }));
      button.position.copy(f.pos).setY(1.3).add(new THREE.Vector3(1.0, 0, 0.03).applyAxisAngle(new THREE.Vector3(0, 1, 0), f.rotY));
      button.rotation.y = f.rotY;
      add(button);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.2), new THREE.MeshBasicMaterial({ map: T.signTex('ELEVATOR', '#202020', '#c0c0b0') }));
      sign.position.copy(f.pos).setY(2.5);
      sign.rotation.y = f.rotY;
      add(sign);
      floor.objects.elevator = { doors, button };
      interact({ id: 'elevator', pos: f.pos.clone(), radius: 1.0, label: () => '[E] Call the elevator', use: () => floor.onUse('elevator') });
    } else if (o.type === 'table') {
      box(1.4, 0.75, 0.9, mat.table, c.x, 0.375, c.z, jitter(0.4));
      addSolid(c.x, c.z, 0.75, 0.5, 'prop');
    } else if (o.type === 'stall') {
      // a toilet stall against the east wall: partitions, a door, and (in one of them) something waiting
      const g = new THREE.Group();
      for (const s of [-1, 1]) g.add(place(new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 0.05), mat.stall), 0.2, 1.0, s * 0.95));
      const stallDoor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.8, 1.7), mat.stall);
      stallDoor.position.set(-0.5, 1.0, 0);
      g.add(stallDoor);
      g.position.copy(c);
      add(g);
      addSolid(c.x + 0.2, c.z, 0.7, 0.95, 'prop');
      if (o.id === 'fakeMaya') {
        floor.objects.fakeMaya = { group: g, door: stallDoor, pos: c.clone() };
        interact({ id: 'fakeMaya', pos: c.clone().setY(1.2), radius: 0.9, label: () => (floor.objects.fakeMaya.opened ? null : '[E] Open the stall'), use: () => floor.onUse('fakeMaya') });
      }
    } else if (o.type === 'drawers') {
      // a wall of morgue drawers on the west wall, one of them numbered 13
      const len = o.rows * CELL;
      const f = wallFace(o.x - 1, o.z, 'east', 1.0);
      const front = decal(T.drawersTex(), len, 1.8, f.pos.clone().setZ(o.z * CELL + len / 2), 0, f.rotY);
      front.material.map.repeat.set(o.rows, 1);
      front.material.map.wrapS = THREE.RepeatWrapping;
      front.material.depthWrite = true;
      front.material.transparent = false;
      const dz = (o.z + 3) * CELL + 1; // drawer 13 sits in the middle, low down
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshBasicMaterial({ map: T.signTex('13', '#d8d4c4', '#300') }));
      plate.position.set(f.pos.x + 0.03, 0.92, dz);
      plate.rotation.y = f.rotY;
      add(plate);
      const drawer = box(0.05, 0.42, 0.6, mat.steel, f.pos.x + 0.03, 0.55, dz);
      floor.objects.drawer13 = { drawer, pos: new THREE.Vector3(f.pos.x, 0.55, dz) };
      interact({ id: 'drawer13', pos: new THREE.Vector3(f.pos.x + 0.3, 0.6, dz), radius: 0.5, label: () => (floor.objects.drawer13.opened ? null : '[E] Open drawer 13 (it is breathing)'), use: () => floor.onUse('drawer13') });
    } else if (o.type === 'body') {
      prop('gurney', c, Math.PI / 2);
      const card = corpse(c, Math.PI / 2, taken.has(id(o.x, o.z)));
      floor.objects.body = { card };
      if (!taken.has(id(o.x, o.z))) {
        interact({ id: 'body', pos: c.clone().setY(0.8), radius: 0.9, label: () => (taken.has(id(o.x, o.z)) ? null : '[E] Search the body (Dr. Harlan)'), use: () => { taken.add(id(o.x, o.z)); if (card) card.visible = false; floor.onPickup('keycard', { kind: 'keycard', key: 'red' }, id(o.x, o.z)); } });
      }
    } else if (o.type === 'boiler') {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3.2, 10), mat.rust);
      tank.position.set(c.x + 1, 1.6, c.z + 1);
      tank.rotation.z = Math.PI / 2;
      tank.castShadow = true;
      add(tank);
      for (let i = 0; i < 3; i++) box(0.2, WALL_H, 0.2, mat.metal, c.x - 0.5 + i * 1.2, WALL_H / 2, c.z - 0.6);
      const glow = add(new THREE.PointLight(0xff6020, 0, 5, 1.5));
      glow.position.set(c.x + 1, 0.6, c.z + 2.4);
      addSolid(c.x + 1, c.z + 1, 1.7, 1.6, 'prop');
      floor.objects.boiler = { tank, glow };
    } else if (o.type === 'lever') {
      const w = againstWall(o.x, o.z, 0.08);
      const g = new THREE.Group();
      g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.12), mat.steel), 0, 1.3, 0));
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), new THREE.MeshLambertMaterial({ color: 0xa02020 }));
      handle.position.set(0, 1.3, 0.12);
      handle.rotation.x = 0.6;
      g.add(handle);
      g.position.copy(w.pos);
      g.rotation.y = w.rotY;
      add(g);
      floor.objects.lever = { handle };
      interact({ id: 'lever', pos: w.pos.clone().setY(1.3), radius: 0.5, hold: 2.2, label: () => (floor.objects.lever.pulled ? null : '[Hold E] Pull the breaker lever (loud)'), use: () => floor.onUse('lever') });
    } else if (o.type === 'musicbox') {
      const g = new THREE.Group();
      g.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.16), mat.wood), 0, 0.46, 0));
      const dancer = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 5), new THREE.MeshLambertMaterial({ color: 0xd8c8c0 }));
      dancer.position.y = 0.58;
      g.add(dancer);
      g.add(box(0.5, 0.4, 0.5, mat.wood, 0, 0.2, 0));
      g.position.copy(c);
      add(g);
      addSolid(c.x, c.z, 0.25, 0.25, 'prop');
      floor.objects.musicbox = { group: g, dancer, pos: c.clone().setY(0.5) };
      floor.tickers.push((dt) => { if (floor.objects.musicbox.playing) dancer.rotation.y += dt * 1.5; });
      interact({ id: 'musicbox', pos: c.clone().setY(0.5), radius: 0.4, label: () => (floor.objects.musicbox.done ? null : '[E] Close the music box'), use: () => floor.onUse('musicbox') });
    } else if (o.type === 'rubble') {
      for (let i = 0; i < 7; i++) box(0.3 + Math.random() * 0.6, 0.2 + Math.random() * 0.5, 0.3 + Math.random() * 0.6, mat.wall, c.x + jitter(1.4), 0.25, c.z + jitter(1.2), Math.random() * 3);
    } else if (o.type === 'mayaTable') {
      box(0.9, 0.85, 2.0, mat.table, c.x, 0.425, c.z);
      addSolid(c.x, c.z, 0.5, 1.05, 'prop');
      const lamp = add(new THREE.SpotLight(0xf0f0e0, 18, 7, 0.5, 0.5, 1.5));
      lamp.position.set(c.x, WALL_H - 0.1, c.z);
      lamp.target.position.set(c.x, 0, c.z);
      add(lamp.target);
      box(0.9, 0.1, 0.9, mat.steel, c.x, WALL_H - 0.05, c.z);
      if (!lessGore) { decal(A.tex.blood[2], 1.4, 1.4, c.clone().setY(0.012), -Math.PI / 2, 1); decal(A.tex.blood[0], 0.8, 0.8, c.clone().setY(0.87).setZ(c.z + 0.5), -Math.PI / 2, 2); }
      floor.objects.mayaTable = { pos: c.clone(), lamp };
      interact({ id: 'mayaTable', pos: c.clone().setY(1.0), radius: 1.0, hold: 3, label: () => (floor.objects.mayaTable.freed ? null : '[Hold E] Cut the straps'), use: () => floor.onUse('mayaTable') });
    } else if (o.type === 'fireEscape') {
      const f = wallFace(o.x + 1, o.z, 'west', 0);
      for (let i = 0; i < 6; i++) box(0.05, 0.05, 0.8, mat.metal, f.pos.x - 0.1, 0.2 + i * 0.2, c.z);
      box(0.05, 1.4, 0.05, mat.metal, f.pos.x - 0.1, 0.7, c.z - 0.4);
      box(0.05, 1.4, 0.05, mat.metal, f.pos.x - 0.1, 0.7, c.z + 0.4);
      interact({ id: 'fireEscape', pos: new THREE.Vector3(f.pos.x - 0.3, 1.0, c.z), radius: 1.0, label: () => '[E] Climb down the fire escape', use: () => floor.onUse('fireEscape') });
    } else if (o.type === 'acUnit') {
      box(1.8, 1.2, 1.2, mat.metal, c.x, 0.6, c.z);
      addSolid(c.x, c.z, 0.9, 0.6, 'prop');
    } else if (o.type === 'tank') {
      const tnk = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.5, 10), mat.rust);
      tnk.position.set(c.x, 2.6, c.z);
      add(tnk);
      for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) box(0.12, 1.4, 0.12, mat.metal, c.x + dx, 0.7, c.z + dz);
      addSolid(c.x, c.z, 1.0, 1.0, 'prop');
    }
  }

  // ---------------------------------------------------------------- dressing: trim, rails, frames, signs, posters, mess
  if (!floor.outdoor) dress();
  function dress() {
    const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]]; // north, south, west, east
    const busyWall = new Set(), busyCell = new Set();
    for (const o of def.objects || []) {
      if (['writing', 'drawing', 'exit', 'elevator'].includes(o.type)) busyWall.add(`${o.x},${o.z}`);
      else for (let dz = 0; dz < (o.rows || 1); dz++) busyCell.add(`${o.x},${o.z + dz}`);
    }
    const plain = (x, z) => '.LFRX12345678'.includes(at(x, z)) && !busyCell.has(`${x},${z}`);
    const nearDoor = (x, z) => DIRS.some(([dx, dz]) => at(x + dx, z + dz) === 'D') || at(x, z) === 'D';
    // how far the room reaches away from a wall: 2 cells or less is a corridor
    const reach = (x, z, dx, dz) => { let n = 0; while (walkable(x - dx * n, z - dz * n) && n < 4) n++; return n; };

    const strips = [], rails = [];
    for (let z = 0; z < ROWS; z++) for (let x = 0; x < COLS; x++) {
      if (!walkable(x, z) || at(x, z) === 'D') continue;
      const c = cellCenter(x, z);
      for (const [dx, dz] of DIRS) {
        if (walkable(x + dx, z + dz)) continue;
        // the wall face between this cell and the wall cell next to it
        const face = c.clone().add(new THREE.Vector3(dx * CELL / 2, 0, dz * CELL / 2));
        const rotY = dx ? Math.PI / 2 : 0;
        const inward = new THREE.Vector3(-dx, 0, -dz);
        strips.push({ pos: face.clone().addScaledVector(inward, 0.015).setY(0.07), rotY });
        if (reach(x, z, dx, dz) <= 2 && plain(x, z) && !busyWall.has(`${x + dx},${z + dz}`)) rails.push({ pos: face.clone().addScaledVector(inward, 0.07).setY(0.92), rotY, face, inward });
      }
    }
    const instanced = (geo, material, list) => {
      const im = new THREE.InstancedMesh(geo, material, list.length);
      const q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
      list.forEach((s, i) => im.setMatrixAt(i, new THREE.Matrix4().compose(s.pos, q.setFromAxisAngle(up, s.rotY), one)));
      im.receiveShadow = true;
      return add(im);
    };
    // skirting boards along the bottom of every wall (a little short of each corner so they never overlap)
    if (strips.length) instanced(new THREE.BoxGeometry(CELL - 0.06, 0.14, 0.03), mat.dark2 || (mat.dark2 = psx(new THREE.MeshLambertMaterial({ color: 0x3a3a34 }))), strips);
    // handrails down the corridors, on little brackets
    if (rails.length) {
      instanced(new THREE.BoxGeometry(CELL - 0.16, 0.05, 0.05), mat.metal, rails);
      const brackets = rails.flatMap((r) => [-0.6, 0.6].map((o) => ({
        pos: r.face.clone().addScaledVector(r.inward, 0.035).add(new THREE.Vector3(r.rotY ? 0 : o, 0.89, r.rotY ? o : 0)), rotY: r.rotY,
      })));
      instanced(new THREE.BoxGeometry(0.03, 0.06, 0.07), mat.metal, brackets);
    }

    // door frames: steel jambs on both faces of the wall, a proper wall piece above the door, and a room sign
    for (const d of floor.doors) {
      const c = cellCenter(d.x, d.z);
      for (const side of [-1, 1]) {
        const at = (along, y, out) => d.alongX
          ? new THREE.Vector3(c.x + along, y, c.z + side * (CELL / 2 + out))
          : new THREE.Vector3(c.x + side * (CELL / 2 + out), y, c.z + along);
        const rot = d.alongX ? 0 : Math.PI / 2;
        for (const s of [-1, 1]) { const p = at(s * (CELL / 2 + 0.06), 1.2, 0.03); box(0.12, 2.4, 0.08, mat.metal, p.x, p.y, p.z, rot); }
        const top = at(0, (2.35 + WALL_H) / 2, 0.03);
        box(CELL + 0.24, WALL_H - 2.35, 0.08, mat.wall, top.x, top.y, top.z, rot);
        const trim = at(0, 2.38, 0.035);
        box(CELL + 0.24, 0.06, 0.09, mat.metal, trim.x, trim.y, trim.z, rot);
        const text = d.code ? null : (def.signs || {})[`${d.x},${d.z}`];
        if (text) {
          const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.22), new THREE.MeshBasicMaterial({ map: T.signTex(text, '#1e1e1c', '#b8b4a0'), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
          sign.position.copy(at(0, 2.68, 0.075));
          sign.rotation.y = d.alongX ? (side > 0 ? 0 : Math.PI) : (side > 0 ? Math.PI / 2 : -Math.PI / 2);
          add(sign);
        }
      }
    }

    // faded posters on plain stretches of corridor wall
    let posterN = 0;
    for (const r of rails) {
      if (Math.random() > 0.13) continue;
      const [cx, cz] = cellOf(r.face.clone().addScaledVector(r.inward, 0.5));
      const wall = cellOf(r.face.clone().addScaledVector(r.inward, -0.5));
      if (busyWall.has(`${wall[0]},${wall[1]}`) || nearDoor(cx, cz)) continue;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.64), psx(new THREE.MeshLambertMaterial({ map: T.posterTex(posterN++ + Math.floor(Math.random() * 6)), transparent: true, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
      p.position.copy(r.face).addScaledVector(r.inward, 0.03).setY(1.55);
      p.rotation.y = Math.atan2(r.inward.x, r.inward.z);
      p.rotation.z = (Math.random() - 0.5) * 0.08;
      add(p);
    }

    // mess on the floors: papers, puddles, knocked-over chairs
    const chairMat = psx(new THREE.MeshLambertMaterial({ color: 0x4a5a6a }));
    for (let z = 0; z < ROWS; z++) for (let x = 0; x < COLS; x++) {
      if (!plain(x, z) || at(x, z) === 'X') continue;
      const c = cellCenter(x, z);
      if (Math.random() < 0.14) {
        for (let i = 0, n = 1 + Math.floor(Math.random() * 3); i < n; i++) {
          decal(T.paperTex(x + z + i), 0.24, 0.32, c.clone().add(new THREE.Vector3(jitter(1.3), 0.016 + i * 0.002, jitter(1.3))), -Math.PI / 2, Math.random() * 6);
        }
      }
      if (Math.random() < 0.035) decal(T.puddleTex(x * 3 + z), 1.3, 1.3, c.clone().setY(0.018), -Math.PI / 2, Math.random() * 6);
      if (Math.random() < 0.03 && DIRS.every(([dx, dz]) => walkable(x + dx, z + dz)) && !nearDoor(x, z)) chair(c, Math.random() < 0.6);
    }
    function chair(c, tipped) {
      const g = new THREE.Group();
      const part = (w, h, d, px, py, pz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), chairMat); m.position.set(px, py, pz); m.castShadow = m.receiveShadow = true; g.add(m); };
      part(0.42, 0.04, 0.42, 0, 0.45, 0);
      part(0.42, 0.42, 0.04, 0, 0.68, -0.2);
      for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) part(0.03, 0.45, 0.03, lx, 0.225, lz);
      const pivot = new THREE.Group();
      pivot.add(g);
      if (tipped) { g.rotation.z = Math.PI / 2; g.position.set(0.44, 0.21, 0); } // on its side
      pivot.position.set(c.x + jitter(0.8), 0, c.z + jitter(0.8));
      pivot.rotation.y = Math.random() * 6;
      add(pivot);
      addSolid(pivot.position.x, pivot.position.z, 0.3, 0.3, 'prop');
    }
  }

  // ---------------------------------------------------------------- grid queries
  floor.doorAt = (x, z) => doorAt.get(`${x},${z}`);
  // cells something can stand in; closed doors count as open for the monster (it opens them)
  floor.passable = (x, z) => walkable(x, z);

  // shortest walkable route between two cells (4-way BFS), start and goal included
  floor.route = (from, to) => {
    const key2 = (x, z) => z * COLS + x;
    const prev = new Map([[key2(...from), null]]);
    const queue = [from];
    while (queue.length) {
      const [x, z] = queue.shift();
      if (x === to[0] && z === to[1]) break;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = [x + dx, z + dz];
        if (!walkable(...n) || prev.has(key2(...n))) continue;
        prev.set(key2(...n), [x, z]);
        queue.push(n);
      }
    }
    const path = [];
    for (let c = to; c; c = prev.get(key2(...c))) path.unshift(c);
    return path[0] && path[0][0] === from[0] && path[0][1] === from[1] ? path : [];
  };

  // can you see from a to b? walls and closed doors block the view
  floor.los = (a, b) => {
    const steps = Math.ceil(a.distanceTo(b) / 0.4);
    for (let i = 1; i < steps; i++) {
      const p = a.clone().lerp(b, i / steps);
      const [x, z] = cellOf(p);
      if (!walkable(x, z)) return false;
      const d = doorAt.get(`${x},${z}`);
      if (d && !d.open) return false;
    }
    return true;
  };

  // lights: power and per-frame flicker
  floor.setPower = (on) => { floor.powered = on; };
  floor.powered = !def.needsPower || !!opts.powered;
  floor.blackout = 0;
  floor.emergency = false;
  floor.updateLights = (dt, onFlicker) => {
    floor.blackout -= dt;
    for (const l of floor.lights) {
      let on = !l.off && floor.blackout <= 0 && (!l.needsPower || floor.powered);
      if (on && l.flicker) {
        l.timer -= dt;
        if (l.timer <= 0) {
          l.timer = Math.random() < 0.15 ? 0.05 + Math.random() * 0.15 : 0.5 + Math.random() * 2.5;
          l.dark = !l.dark && Math.random() < 0.6;
          if (l.dark && onFlicker) onFlicker(l.light.position);
        }
        if (l.dark) on = false;
      }
      const red = floor.emergency && !l.red;
      l.light.intensity = on ? (red ? 3 : l.base) : 0;
      l.light.color.set(red ? 0xa01818 : l.color);
      l.panelMat.color.set(on ? (red ? 0x902020 : l.panelColor) : 0x111111);
    }
  };

  floor.update = (dt) => { for (const t of floor.tickers) t(dt); };

  floor.dispose = () => {
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
  };
  return floor;
}
