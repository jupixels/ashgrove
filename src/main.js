import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import * as T from './textures.js';
import { GameAudio } from './audio.js';
import { loadAssets } from './assets.js';

// ---------------------------------------------------------------- map
// # wall · . floor · P player · L light · F flickering light · B bed · G gurney · W wheelchair
// b battery · K keycard · S scare trigger · M monster spot · X blood
// c cupboard · m heart monitor · n machine · t tray · O operating chair
const MAP = [
  '##############################',
  '#....#..c.m..#..n.c..#...c...#',
  '#.P..#..B.B..#..B.B..#..b..B.#',
  '#....#...X...#.......#.......#',
  '#....###.######.#######.######',
  '#.L.....F.....L.....S.F..M...#',
  '#....X.................X.....#',
  '#....###.######.#######.###.##',
  '#....#.......#.....b.#...#...#',
  '######..B..G.#..X....#.K.#...#',
  '     #O.t....#..c....#...#.W.#',
  '     #########################',
];
const CELL = 2;
const WALL_H = 3;
const EYE = 1.6;
const ROWS = MAP.length;
const COLS = Math.max(...MAP.map((r) => r.length));
const at = (x, z) => (MAP[z] && MAP[z][x]) || ' ';
const walkable = (x, z) => !'# '.includes(at(x, z));
const cellCenter = (x, z) => new THREE.Vector3(x * CELL + CELL / 2, 0, z * CELL + CELL / 2);

// ---------------------------------------------------------------- renderer + PSX pipeline
const LOW_H = 240;
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
document.body.appendChild(renderer.domElement);

const lowRes = new THREE.Vector2();
const target = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });

const post = new THREE.ShaderMaterial({
  uniforms: {
    tDiffuse: { value: target.texture },
    res: { value: lowRes },
    time: { value: 0 },
    aberration: { value: 0 },
    grain: { value: 0.09 },
    red: { value: 0 },
    fade: { value: 0 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float time, aberration, grain, red, fade;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float bayer(vec2 p){ p = mod(floor(p), 4.0);
      int i = int(p.x + p.y * 4.0);
      float m[16]; m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
      for (int k = 0; k < 16; k++) if (k == i) return m[k] / 16.0;
      return 0.0; }
    void main(){
      vec2 c = vUv - 0.5;
      vec2 uv = 0.5 + c * (1.0 + 0.06 * dot(c, c));
      float jitter = aberration * (hash(vec2(floor(time * 30.0), floor(uv.y * 60.0))) - 0.5) * 0.04;
      uv.x += jitter;
      float ab = 0.0015 + aberration * 0.015;
      vec3 col = vec3(texture2D(tDiffuse, uv + vec2(ab, 0.)).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - vec2(ab, 0.)).b);
      col = pow(max(col, 0.0), vec3(1.0 / 2.2));
      vec2 px = floor(uv * res);
      col = floor(col * 24.0 + bayer(px)) / 24.0;
      col += (hash(px + fract(time) * 100.0) - 0.5) * grain;
      col *= 0.93 + 0.07 * sin(uv.y * res.y * 3.14159);
      col *= smoothstep(0.82, 0.18, length(c));
      col = mix(col, vec3(0.55, 0.0, 0.0), red);
      col *= 1.0 - fade;
      gl_FragColor = vec4(col, 1.0);
    }`,
  depthTest: false,
});
const postScene = new THREE.Scene();
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));

// Vertex snapping for the wobbly PS1 look.
const snap = { value: new THREE.Vector2(160, 120) };
// desat: 0..1, how much colour to drain out (used to make the cheerful asset-pack props look decayed).
function psx(mat, desat = 0) {
  mat.customProgramCacheKey = () => 'psx' + desat;
  mat.onBeforeCompile = (s) => {
    s.uniforms.uSnap = snap;
    if (desat) {
      s.fragmentShader = s.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))), ${desat.toFixed(2)});`
      );
    }
    s.vertexShader = 'uniform vec2 uSnap;\n' + s.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
       vec4 sp = gl_Position; sp.xyz /= sp.w; sp.xy = floor(sp.xy * uSnap) / uSnap; sp.xyz *= sp.w; gl_Position = sp;`
    );
  };
  return mat;
}

// ---------------------------------------------------------------- scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x020202, 0.11);
scene.add(new THREE.AmbientLight(0x1a1f1a, 0.35));

const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 60);
scene.add(camera);

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  lowRes.set(Math.round(LOW_H * camera.aspect), LOW_H);
  target.setSize(lowRes.x, lowRes.y);
}
addEventListener('resize', resize);
resize();

const startLabel = document.querySelector('#title .start');
const A = await loadAssets((p) => (startLabel.textContent = `loading ${Math.round(p * 100)}%`));
startLabel.textContent = 'click to enter';

const tex = {
  floor: A.tex.floor, wall: A.tex.wall, ceiling: T.ceilingTex(),
};
const mat = {
  wall: psx(new THREE.MeshLambertMaterial({ map: tex.wall })),
  floor: psx(new THREE.MeshLambertMaterial({ map: tex.floor })),
  ceiling: psx(new THREE.MeshLambertMaterial({ map: tex.ceiling })),
  metal: psx(new THREE.MeshLambertMaterial({ color: 0x55534c })),
  rust: psx(new THREE.MeshLambertMaterial({ color: 0x4a3324 })),
  table: psx(new THREE.MeshLambertMaterial({ map: A.tex.metal, color: 0x8a7a66 })),
};

const solids = []; // AABBs: {minX, maxX, minZ, maxZ}
function addSolid(cx, cz, hw, hd) { solids.push({ minX: cx - hw, maxX: cx + hw, minZ: cz - hd, maxZ: cz + hd }); }

// Walls (only cells that border a floor cell).
const wallCells = [];
for (let z = 0; z < ROWS; z++) {
  for (let x = 0; x < COLS; x++) {
    if (at(x, z) !== '#') continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => walkable(x + dx, z + dz))) wallCells.push([x, z]);
  }
}
const wallMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL, WALL_H, CELL), mat.wall, wallCells.length);
wallCells.forEach(([x, z], i) => {
  const c = cellCenter(x, z);
  wallMesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(c.x, WALL_H / 2, c.z));
  addSolid(c.x, c.z, CELL / 2, CELL / 2);
});
wallMesh.receiveShadow = true;
wallMesh.castShadow = true;
scene.add(wallMesh);

function plane(material, y, flip, repeat) {
  const t = material.map.clone();
  t.repeat.set(COLS * repeat, ROWS * repeat);
  t.needsUpdate = true;
  const m = material.clone();
  m.map = t;
  m.onBeforeCompile = material.onBeforeCompile;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(COLS * CELL, ROWS * CELL, COLS, ROWS), m);
  p.rotation.x = flip ? Math.PI / 2 : -Math.PI / 2;
  p.position.set((COLS * CELL) / 2, y, (ROWS * CELL) / 2);
  p.receiveShadow = true;
  scene.add(p);
}
plane(mat.floor, 0, false, 1);
plane(mat.ceiling, WALL_H, true, 1);

// Decals
function decal(texture, w, h, pos, rotX, rotY) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    psx(new THREE.MeshLambertMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }))
  );
  m.position.copy(pos);
  m.rotation.set(rotX, rotY, 0, 'YXZ');
  scene.add(m);
  return m;
}
decal(T.writingTex("DON'T GO TO C"), 2.2, 0.55, new THREE.Vector3(11 * CELL + 1, 1.7, 5 * CELL - 0.02 + 0.04), 0, 0);
decal(T.writingTex('SHE STILL SINGS'), 2.2, 0.55, new THREE.Vector3(18 * CELL + 1, 1.5, 7 * CELL - 0.02), 0, Math.PI);

// Props, lights, pickups
const lights = [];
const interactables = [];
let playerStart = new THREE.Vector3();
let monsterSpot = new THREE.Vector3();

// Hospital props from the Atomic Realm pack, scaled up and dirtied to look abandoned.
const PROP_SCALE = 1.4;
const grimeCache = new Map();
function grimy(m) {
  if (!grimeCache.has(m)) {
    if (m.map) m.map.magFilter = m.map.minFilter = THREE.NearestFilter;
    grimeCache.set(m, psx(new THREE.MeshLambertMaterial({ map: m.map, color: 0x9a8a70 }), 0.8));
  }
  return grimeCache.get(m);
}

// Push a prop against whichever wall borders cell (x, z), facing into the room.
function againstWall(x, z, depth) {
  const c = cellCenter(x, z);
  if (!walkable(x, z - 1)) return { pos: c.setZ(z * CELL + depth), rotY: 0 };
  if (!walkable(x, z + 1)) return { pos: c.setZ((z + 1) * CELL - depth), rotY: Math.PI };
  if (!walkable(x - 1, z)) return { pos: c.setX(x * CELL + depth), rotY: Math.PI / 2 };
  if (!walkable(x + 1, z)) return { pos: c.setX((x + 1) * CELL - depth), rotY: -Math.PI / 2 };
  return { pos: c, rotY: 0 };
}

function prop(name, pos, rotY, { y = 0, solid = true } = {}) {
  const m = A.models[name].scene.clone(true);
  m.scale.setScalar(PROP_SCALE);
  m.position.set(pos.x, y, pos.z);
  m.rotation.y = rotY;
  m.traverse((o) => {
    if (!o.isMesh) return;
    o.material = grimy(o.material);
    o.castShadow = o.receiveShadow = true;
  });
  scene.add(m);
  if (solid) {
    const b = new THREE.Box3().setFromObject(m);
    addSolid((b.min.x + b.max.x) / 2, (b.min.z + b.max.z) / 2, (b.max.x - b.min.x) / 2, (b.max.z - b.min.z) / 2);
  }
  return m;
}

const jitter = (amount) => (Math.random() - 0.5) * amount;

function wheelchair(c) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), mat.rust);
  seat.position.y = 0.5;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.05), mat.rust);
  back.position.set(0, 0.8, -0.25);
  g.add(seat, back);
  for (const s of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 4, 10), mat.metal);
    wheel.position.set(s * 0.3, 0.3, 0);
    wheel.rotation.y = Math.PI / 2;
    g.add(wheel);
  }
  g.traverse((o) => { o.castShadow = true; });
  g.position.copy(c);
  g.rotation.y = Math.PI * 0.8;
  scene.add(g);
  addSolid(c.x, c.z, 0.35, 0.35);
}

function ceilingLight(c, flicker) {
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xcfe8c0 });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.3), panelMat);
  panel.position.set(c.x, WALL_H - 0.03, c.z);
  scene.add(panel);
  const light = new THREE.PointLight(0xc8e6b4, 7, 11, 1.6);
  light.position.set(c.x, WALL_H - 0.25, c.z);
  scene.add(light);
  lights.push({ light, panelMat, base: 7, flicker, off: false, timer: 0, color: light.color.clone() });
}

function battery(c) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 6), new THREE.MeshBasicMaterial({ color: 0xb8a24a }));
  m.rotation.z = Math.PI / 2;
  m.position.set(c.x + 0.3, 0.05, c.z - 0.2);
  scene.add(m);
  interactables.push({ mesh: m, label: 'Take battery', use: pickBattery });
}

function keycard(c) {
  const table = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.45), mat.table);
  table.position.set(c.x, 0.375, c.z + 0.4);
  table.castShadow = true;
  scene.add(table);
  addSolid(c.x, c.z + 0.4, 0.3, 0.23);
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.005, 0.055), new THREE.MeshBasicMaterial({ color: 0xa01010 }));
  card.position.set(c.x, 0.76, c.z + 0.35);
  card.rotation.y = 0.4;
  scene.add(card);
  decal(A.tex.blood[0], 0.7, 0.7, new THREE.Vector3(c.x + 0.1, 0.752, c.z + 0.45), -Math.PI / 2, 0);
  interactables.push({ mesh: card, label: 'Take RED keycard', use: pickKeycard });
}

for (let z = 0; z < ROWS; z++) {
  for (let x = 0; x < COLS; x++) {
    const ch = at(x, z), c = cellCenter(x, z);
    if (ch === 'P') playerStart.copy(c);
    if (ch === 'M') monsterSpot.copy(c);
    if (ch === 'L' || ch === 'F') ceilingLight(c, ch === 'F');
    if (ch === 'B') prop('bed', c, Math.PI * Math.round(Math.random()) + jitter(0.4));
    if (ch === 'G') prop('gurney', c, jitter(0.8));
    if (ch === 'O') prop('opchair', c, Math.PI / 2 + jitter(0.3));
    if (ch === 't') prop('tray', c, jitter(6), { solid: false });
    if (ch === 'm' || ch === 'n') {
      const w = againstWall(x, z, 0.4);
      prop(ch === 'm' ? 'monitor' : 'machine', w.pos, w.rotY + jitter(0.4));
    }
    if (ch === 'c') {
      const w = againstWall(x, z, 0.02);
      prop('cupboard', w.pos, w.rotY);
      prop('cupboardTop', w.pos, w.rotY, { y: 1.75, solid: false });
    }
    if (ch === 'W') wheelchair(c);
    if (ch === 'b') battery(c);
    if (ch === 'K') keycard(c);
    if (ch === 'X') decal(A.tex.blood[(x + z) % 3], 1.8, 1.8, new THREE.Vector3(c.x, 0.01, c.z), -Math.PI / 2, Math.random() * 6);
    else if (walkable(x, z) && Math.random() < 0.18) {
      decal(A.tex.grime[(x * 7 + z) % 2], 1.6, 1.6, new THREE.Vector3(c.x + jitter(1), 0.008, c.z + jitter(1)), -Math.PI / 2, Math.random() * 6);
    }
  }
}

// ---------------------------------------------------------------- flashlight
const flashlight = new THREE.SpotLight(0xfff1d6, 30, 18, 0.42, 0.55, 1.4);
flashlight.castShadow = true;
flashlight.shadow.mapSize.set(512, 512);
flashlight.shadow.camera.near = 0.1;
flashlight.shadow.bias = -0.002;
flashlight.position.set(0.25, -0.2, 0);
camera.add(flashlight);
const flashTarget = new THREE.Object3D();
scene.add(flashTarget);
flashlight.target = flashTarget;
const flashAim = new THREE.Vector3();

// ---------------------------------------------------------------- the monster
// Mixamo character Ch25 with the downloaded Mixamo animations (converted by tools/convert_monster.py).
const MONSTER_SCALE = 1.35; // ~2.4 m tall
const monster = new THREE.Group();
const monsterModel = A.models.monster.scene;
monsterModel.scale.setScalar(MONSTER_SCALE);
monsterModel.traverse((o) => {
  if (!o.isMesh) return;
  const map = o.material.map;
  if (map) map.magFilter = map.minFilter = THREE.NearestFilter;
  o.material = psx(new THREE.MeshLambertMaterial({ map }));
  o.castShadow = true;
  o.frustumCulled = false;
});
monster.add(monsterModel);
monster.visible = false;
scene.add(monster);

// A faint, sickly glow in front of it so its shape always reads in the dark, even with your light off.
// It lives in the scene (not under the monster) so hiding the monster doesn't change the light count,
// which would make every material recompile and stutter right as it appears.
const presence = new THREE.PointLight(0xb0a080, 0, 3.5, 1.5);
scene.add(presence);
const tmpPresence = new THREE.Vector3();
function updatePresence() {
  presence.intensity = monster.visible ? 2.6 : 0;
  if (monster.visible) presence.position.copy(monster.localToWorld(tmpPresence.set(0, 1.9, 1.0)));
}

const mixer = new THREE.AnimationMixer(monsterModel);
const monsterClips = {};
for (const clip of A.models.monster.animations) {
  // Keep animations in place: lock the hips to their first-frame spot except on the vertical axis.
  const hips = clip.tracks.find((t) => t.name.endsWith('Hips.position'));
  if (hips) {
    const v = hips.values;
    const size = [0, 1, 2].map((a) => Math.abs(v[a]));
    const up = size.indexOf(Math.max(...size));
    for (let i = 0; i < v.length; i += 3) for (let a = 0; a < 3; a++) if (a !== up) v[i + a] = v[a];
  }
  monsterClips[clip.name] = mixer.clipAction(clip);
}
let monsterAction = null;
function monsterAnim(name, { fade = 0.25, speed = 1, once = false } = {}) {
  const a = monsterClips[name];
  if (!a || a === monsterAction) return;
  a.reset();
  a.setEffectiveTimeScale(speed);
  a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat);
  a.clampWhenFinished = once;
  a.fadeIn(fade).play();
  if (monsterAction) monsterAction.fadeOut(fade);
  monsterAction = a;
}

// ---------------------------------------------------------------- UI + audio
const $ = (id) => document.getElementById(id);
const ui = { title: $('title'), pause: $('pause'), objective: $('objective'), prompt: $('prompt'), battery: $('battery'), batteryFill: $('batteryFill'), message: $('message'), cross: $('crosshair'), stamina: $('stamina'), staminaFill: $('staminaFill') };
const audio = new GameAudio();
let audioReady = false;

function setObjective(text) {
  ui.objective.textContent = text;
  ui.objective.classList.remove('show');
  void ui.objective.offsetWidth;
  ui.objective.classList.add('show');
}

function showMessage(text, ms) {
  ui.message.textContent = text;
  ui.message.style.opacity = 1;
  if (ms) setTimeout(() => (ui.message.style.opacity = 0), ms);
}

// ---------------------------------------------------------------- player
const controls = new PointerLockControls(camera, document.body);
controls.pointerSpeed = 0.8;
camera.position.set(playerStart.x, EYE, playerStart.z);
camera.rotation.set(0, Math.PI, 0);

const keys = {};
const DEBUG = location.search.includes('debug');
const NOFX = location.search.includes('nofx'); // debug: no distortion near the monster
if (DEBUG) window.game = { camera, state: null, keys, monster, monsterAnim, interact: () => interact() };
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (!controls.isLocked) return;
  if (e.code === 'KeyF') toggleFlashlight();
  if (e.code === 'KeyE') interact();
});
addEventListener('keyup', (e) => (keys[e.code] = false));

const state = {
  started: false,
  battery: 1,
  batteries: 0,
  flashOn: true,
  stamina: 1,
  winded: false,
  bob: 0,
  lastStepSign: 1,
  phase: 'explore', // explore -> keycard -> return -> done
  scare1: 'waiting', // waiting -> watching -> done
  scare1Timer: 0,
  scare2: 'waiting', // waiting -> armed -> firing -> done
  scare2Timer: 0,
  shake: 0,
  aberration: 0,
  red: 0,
  fade: 1,
  fadeTarget: 0,
  blackout: 0,
  emergency: false,
  heartTimer: 0,
};
if (DEBUG) window.game.state = state;

function toggleFlashlight() {
  if (state.battery <= 0) return;
  state.flashOn = !state.flashOn;
  audio.play('flashlight_click', { volume: 0.7 });
}

function pickBattery(item) {
  state.battery = Math.min(1, state.battery + 0.5);
  audio.play('battery_insert');
  showMessage('Flashlight batteries replaced.', 2000);
  removeItem(item);
}

function pickKeycard(item) {
  audio.play('keycard_beep', { volume: 0.6 });
  removeItem(item);
  showMessage('RED KEYCARD — "Dr. E. Voss, Director"', 3000);
  state.phase = 'keycard';
  armScare2();
}

function removeItem(item) {
  scene.remove(item.mesh);
  interactables.splice(interactables.indexOf(item), 1);
}

const ray = new THREE.Raycaster();
ray.far = 2.2;
function lookedAtItem() {
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  for (const item of interactables) {
    // generous hit sphere so small items are easy to grab
    const toItem = item.mesh.position.clone().sub(camera.position);
    const dist = toItem.length();
    if (dist > 2.2) continue;
    const dir = ray.ray.direction;
    if (toItem.normalize().dot(dir) > 0.93) return item;
  }
  return null;
}

function interact() {
  const item = lookedAtItem();
  if (item) item.use(item);
}

function collides(x, z, r = 0.3) {
  for (const s of solids) {
    if (x + r > s.minX && x - r < s.maxX && z + r > s.minZ && z - r < s.maxZ) return true;
  }
  return false;
}

const fwd = new THREE.Vector3(), right = new THREE.Vector3();
function updatePlayer(dt) {
  const crouch = keys.ControlLeft || keys.KeyC;
  let move = new THREE.Vector2((keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0));
  const moving = move.lengthSq() > 0;
  const wantSprint = keys.ShiftLeft && moving && !crouch && move.y > 0;
  if (state.stamina <= 0 && !state.winded) {
    state.winded = true;
    audio.play('breathing_scared', { volume: 0.7 });
  }
  if (state.winded && state.stamina > 0.35) state.winded = false;
  const sprint = wantSprint && !state.winded;
  state.stamina = THREE.MathUtils.clamp(state.stamina + (sprint ? -0.22 : state.winded ? 0.09 : 0.14) * dt, 0, 1);
  ui.stamina.style.opacity = state.stamina < 0.999 ? 1 : 0;
  ui.staminaFill.style.transform = `scaleX(${state.stamina})`;
  ui.stamina.classList.toggle('tired', state.winded);
  const speed = crouch ? 1.1 : sprint ? 4.6 : 2.2;

  if (moving) {
    move.normalize();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    right.crossVectors(fwd, camera.up).normalize();
    const dx = (fwd.x * move.y + right.x * move.x) * speed * dt;
    const dz = (fwd.z * move.y + right.z * move.x) * speed * dt;
    if (!collides(camera.position.x + dx, camera.position.z)) camera.position.x += dx;
    if (!collides(camera.position.x, camera.position.z + dz)) camera.position.z += dz;
    state.bob += dt * speed * 2.6;
    const s = Math.sign(Math.sin(state.bob));
    if (s !== state.lastStepSign) audio.footstep(sprint ? 'run' : crouch ? 'sneak' : 'walk');
    state.lastStepSign = s;
  }
  const targetY = (crouch ? 1.0 : EYE) + (moving ? Math.sin(state.bob * 2) * (sprint ? 0.06 : 0.035) : 0);
  camera.position.y += (targetY - camera.position.y) * Math.min(1, dt * 10);
}

function updateFlashlight(dt) {
  if (state.flashOn) state.battery = Math.max(0, state.battery - dt / 200);
  if (state.battery <= 0) state.flashOn = false;
  let intensity = state.flashOn ? 30 : 0;
  if (state.flashOn && state.battery < 0.2 && Math.random() < 0.06) intensity *= Math.random() * 0.3;
  flashlight.intensity = intensity * (0.6 + state.battery * 0.4);
  // lagging aim gives the flashlight a heavy, handheld sway
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const want = camera.position.clone().add(dir.multiplyScalar(5));
  flashAim.lerp(want, Math.min(1, dt * 9));
  flashTarget.position.copy(flashAim);
  ui.battery.style.opacity = state.battery < 0.35 || !state.flashOn ? 1 : 0;
  ui.batteryFill.style.width = state.battery * 100 + '%';
}

function updateLights(dt) {
  for (const l of lights) {
    let on = !l.off && state.blackout <= 0;
    if (on && l.flicker) {
      l.timer -= dt;
      if (l.timer <= 0) {
        l.timer = Math.random() < 0.15 ? 0.05 + Math.random() * 0.15 : 0.5 + Math.random() * 2.5;
        l.dark = !l.dark && Math.random() < 0.6;
        if (l.dark && camera.position.distanceTo(l.light.position) < 10) audio.play('flicker', { volume: 0.5 });
      }
      if (l.dark) on = false;
    }
    l.light.intensity = on ? l.base : 0;
    l.panelMat.color.set(on ? (state.emergency ? 0x902020 : 0xcfe8c0) : 0x111111);
    l.light.color.set(state.emergency ? 0xa01818 : l.color);
  }
  state.blackout -= dt;
}

// ---------------------------------------------------------------- scares
const tmp = new THREE.Vector3();
function playerCell() {
  return [Math.floor(camera.position.x / CELL), Math.floor(camera.position.z / CELL)];
}
function facing(pos) {
  camera.getWorldDirection(tmp);
  const to = pos.clone().setY(camera.position.y).sub(camera.position).normalize();
  return tmp.setY(0).normalize().dot(to.setY(0).normalize());
}

// Scare 1: a figure at the end of the hall that vanishes when you look at it.
function updateScare1(dt) {
  const [cx, cz] = playerCell();
  if (state.scare1 === 'waiting' && cx >= 19 && (cz === 5 || cz === 6)) {
    state.scare1 = 'watching';
    state.scare1Timer = 0;
    state.blackout = 0.35;
    audio.play('flicker', { volume: 0.8 });
    sighting.current = null;
    monster.position.copy(monsterSpot);
    monster.visible = true;
    monsterAnim('idle', { fade: 0 });
  }
  if (state.scare1 !== 'watching') return;
  state.scare1Timer += dt;
  monster.lookAt(camera.position.x, 0, camera.position.z);
  const lookedAt = facing(monster.position) > 0.96 && state.flashOn;
  if ((lookedAt && state.scare1Timer > 1.8) || state.scare1Timer > 8) {
    state.scare1 = 'done';
    state.blackout = 0.7;
    state.aberration = 1;
    audio.play('monster_growl_distant', { volume: 0.9 });
    setTimeout(() => (monster.visible = false), 150);
    setTimeout(() => setObjective('Find the red keycard.'), 2500);
  }
}

// Scare 2: grab the keycard, something is standing behind you.
function armScare2() {
  camera.getWorldDirection(tmp);
  tmp.y = 0;
  tmp.normalize();
  let dist = 1.4;
  const spot = new THREE.Vector3();
  for (; dist > 0.5; dist -= 0.1) {
    spot.copy(camera.position).addScaledVector(tmp, -dist);
    if (!collides(spot.x, spot.z, 0.25)) break;
  }
  spot.y = 0;
  monster.position.copy(spot);
  monster.lookAt(camera.position.x, 0, camera.position.z);
  monster.visible = true;
  sighting.current = null;
  monsterAnim('search', { fade: 0 });
  for (const l of lights) l.off = true;
  state.scare2 = 'armed';
  state.scare2Timer = 0;
  audio.play('monster_breathing', { volume: 0.8 });
}

function updateScare2(dt) {
  if (state.scare2 === 'armed') {
    state.scare2Timer += dt;
    monster.lookAt(camera.position.x, 0, camera.position.z);
    state.aberration = Math.max(state.aberration, 0.25 + Math.sin(state.scare2Timer * 3) * 0.1);
    if (facing(monster.position) > 0.55 || state.scare2Timer > 9) {
      if (state.scare2Timer > 9) {
        // they never turned around... it comes to them.
        camera.getWorldDirection(tmp);
        monster.position.copy(camera.position).addScaledVector(tmp.setY(0).normalize(), 0.9).setY(0);
      }
      state.scare2 = 'firing';
      state.scare2Timer = 0;
      monsterAnim('attack', { fade: 0.05, speed: 1.6, once: true });
      audio.play('jumpscare_sting_1', { volume: 1 });
      audio.play('monster_scream', { volume: 1 });
      state.shake = 1;
      state.aberration = 1.5;
      state.red = 0.55;
      state.flashOn = true;
    }
  } else if (state.scare2 === 'firing') {
    state.scare2Timer += dt;
    const t = state.scare2Timer;
    // lunge at the camera
    tmp.copy(camera.position).setY(0);
    monster.position.lerp(tmp, Math.min(1, dt * 6));
    monster.position.y = Math.sin(Math.min(t * 6, Math.PI)) * 0.2;
    if (t > 0.45 && state.fadeTarget === 0) {
      state.fade = 1;
      state.fadeTarget = 1;
      monster.visible = false;
    }
    if (t > 2.6) {
      state.scare2 = 'done';
      state.fadeTarget = 0;
      state.emergency = true;
      for (const l of lights) { l.off = false; l.flicker = false; l.base = 3; }
      audio.play('lights_slam_on', { volume: 0.8 });
      showMessage('It let you go. Why did it let you go?', 3500);
      setTimeout(() => setObjective("Get back to the lobby. Don't let it catch you."), 3500);
      state.phase = 'return';
      setTimeout(startStalker, 2500);
    }
  }
}

// ---------------------------------------------------------------- sightings
// While you explore, it just appears and stands there watching you: in a doorway, at the end of a hall.
// It is gone the moment you hold your light on it, get too close, or it has watched long enough;
// a flicker of the lights covers it leaving. Room sightings only spawn behind you, so you turn around into it.
const SIGHTINGS = [
  { area: [4, 7, 5, 6], at: [8, 4], behind: false },     // first step into the hall: in the doorway ahead
  { area: [6, 12, 1, 3], at: [8, 5], behind: true },     // patient room 1: watching from the hall
  { area: [14, 20, 1, 3], at: [15, 4], behind: true },   // patient room 2: in the doorway
  { area: [6, 12, 8, 10], at: [8, 7], behind: true },    // lower room A
  { area: [14, 20, 8, 10], at: [15, 7], behind: true },  // lower room B
].map((s) => ({ ...s, done: false }));
const sighting = { current: null, timer: 0, lit: 0, cooldown: 0 };
const cellPos = (x, z) => cellCenter(x, z).setY(0);

function inArea([x0, x1, z0, z1]) {
  const [cx, cz] = playerCell();
  return cx >= x0 && cx <= x1 && cz >= z0 && cz <= z1;
}

function vanish(growl) {
  state.blackout = 0.45;
  audio.play('flicker', { volume: 0.7 });
  if (growl) audio.play('monster_growl_distant', { volume: 0.6 });
  setTimeout(() => { if (!stalker.active && state.scare2 !== 'armed') monster.visible = false; }, 120);
}

function updateSightings(dt) {
  sighting.cooldown -= dt;
  if (sighting.current) {
    const s = sighting.current;
    sighting.timer += dt;
    monster.lookAt(camera.position.x, 0, camera.position.z);
    const dist = camera.position.distanceTo(monster.position);
    if (facing(monster.position) > 0.93 && state.flashOn && dist < 14) sighting.lit += dt;
    if (sighting.lit > 1.6 || dist < 3.2 || sighting.timer > 12) {
      sighting.current = null;
      sighting.cooldown = 6;
      vanish(Math.random() < 0.5);
    }
    return;
  }
  if (state.phase !== 'explore' || state.scare1 === 'watching' || monster.visible || sighting.cooldown > 0) return;
  for (const s of SIGHTINGS) {
    if (s.done || !inArea(s.area)) continue;
    const pos = cellPos(...s.at);
    if (s.behind && facing(pos) > -0.2) continue; // wait until the player's back is turned
    s.done = true;
    sighting.current = s;
    sighting.timer = sighting.lit = 0;
    monster.position.copy(pos);
    monster.visible = true;
    monsterAnim('idle', { fade: 0 });
    audio.play('monster_drag_tubes', { volume: 0.35 });
    break;
  }
}

// ---------------------------------------------------------------- the walk back
// After the keycard it follows you to the lobby without ever being seen moving: every time you look away,
// it is standing a little closer. Keep moving or keep your eyes on it. If it reaches you, you're dead.
const stalker = { active: false, timer: 0, wait: 0 };

// Shortest walkable route between two cells (4-way grid BFS), start and goal included.
function route(from, to) {
  const key = (x, z) => z * COLS + x;
  const prev = new Map([[key(...from), null]]);
  const queue = [from];
  while (queue.length) {
    const [x, z] = queue.shift();
    if (x === to[0] && z === to[1]) break;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = [x + dx, z + dz];
      if (!walkable(...n) || prev.has(key(...n))) continue;
      prev.set(key(...n), [x, z]);
      queue.push(n);
    }
  }
  const path = [];
  for (let c = to; c; c = prev.get(key(...c))) path.unshift(c);
  return path[0] && path[0][0] === from[0] && path[0][1] === from[1] ? path : [];
}

function startStalker() {
  stalker.active = true;
  stalker.timer = 0;
  stalker.wait = 2.5;
  monster.position.copy(cellPos(23, 7));
  monster.visible = true;
  monsterAnim('idle', { fade: 0 });
}

function updateStalker(dt) {
  if (!stalker.active) return;
  monster.lookAt(camera.position.x, 0, camera.position.z);
  const seen = facing(monster.position) > 0.6;
  if (seen) return; // it never moves while you watch it
  stalker.timer += dt;
  if (stalker.timer < stalker.wait) return;
  stalker.timer = 0;
  stalker.wait = 1.1 + Math.random() * 0.6;
  const from = [Math.floor(monster.position.x / CELL), Math.floor(monster.position.z / CELL)];
  const path = route(from, playerCell());
  if (path.length <= 2) return killPlayer();
  const next = path[Math.min(2, path.length - 2)]; // two cells closer, never onto the player
  monster.position.copy(cellPos(...next));
  audio.play('monster_drag_tubes', { volume: THREE.MathUtils.clamp(1 - path.length / 14, 0.15, 0.8) });
}

function killPlayer() {
  stalker.active = false;
  state.phase = 'dead';
  camera.getWorldDirection(tmp);
  monster.position.copy(camera.position).addScaledVector(tmp.setY(0).normalize(), 0.9).setY(0);
  monster.lookAt(camera.position.x, 0, camera.position.z);
  monsterAnim('attack', { fade: 0.05, speed: 1.6, once: true });
  audio.play('jumpscare_sting_1', { volume: 1 });
  audio.play('monster_scream', { volume: 1 });
  state.shake = 1;
  state.aberration = 1.5;
  state.red = 0.8;
  setTimeout(() => { state.fade = 1; state.fadeTarget = 1; monster.visible = false; }, 500);
  setTimeout(() => {
    controls.unlock();
    ui.pause.innerHTML = '<h2>YOU HAVE BEEN ADMITTED</h2><p>It was right behind you.</p><p class="small">Click to try again</p>';
    ui.pause.dataset.restart = '1';
    ui.pause.style.display = 'flex';
  }, 2200);
}

function updateEnding() {
  if (state.phase !== 'return') return;
  const [cx, cz] = playerCell();
  if (cx <= 4 && cz <= 3) {
    state.phase = 'done';
    stalker.active = false;
    vanish(false);
    state.fadeTarget = 1;
    setTimeout(() => {
      controls.unlock();
      ui.pause.innerHTML = '<h2>END OF PROTOTYPE</h2><p>The real game starts here.<br>Thanks for testing ASHGROVE.</p><p class="small">Click to play again</p>';
      ui.pause.dataset.restart = '1';
      ui.pause.style.display = 'flex';
    }, 1500);
  }
}

// Heartbeat when it is close.
function updateDread(dt) {
  const near = monster.visible ? camera.position.distanceTo(monster.position) : 99;
  state.heartTimer -= dt;
  if (near < 6 && state.heartTimer <= 0) {
    audio.play('heartbeat', { volume: 0.9 });
    state.heartTimer = 0.45 + near * 0.12;
  }
  if (monster.visible && !NOFX) state.aberration = Math.max(state.aberration, THREE.MathUtils.clamp(1 - near / 10, 0, 0.6));
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (controls.isLocked || (DEBUG && state.started)) simulate(dt);
  updateLights(dt);
  if (monster.visible) mixer.update(dt);
  updatePresence();
  render(dt, t);
}

// One step of gameplay (player, scares, monster). Debug mode can also step this by hand: game.tick().
function simulate(dt) {
  updatePlayer(dt);
  updateFlashlight(dt);
  updateScare1(dt);
  updateSightings(dt);
  updateScare2(dt);
  updateStalker(dt);
  updateEnding();
  updateDread(dt);
  const item = lookedAtItem();
  ui.prompt.textContent = item ? '[E] ' + item.label : '';
}
if (DEBUG) {
  window.game.tick = (seconds = 1, dt = 1 / 30) => {
    for (let s = 0; s < seconds; s += dt) {
      simulate(dt);
      updateLights(dt);
      if (monster.visible) mixer.update(dt);
      updatePresence();
    }
    render(0, clock.elapsedTime);
  };
}

function render(dt, t) {
  // screen effects
  state.aberration = Math.max(0, state.aberration - dt * 1.2);
  state.red = Math.max(0, state.red - dt * 0.8);
  state.fade += (state.fadeTarget - state.fade) * Math.min(1, dt * (state.fadeTarget > state.fade ? 12 : 1.5));
  const shake = state.shake * state.shake;
  state.shake = Math.max(0, state.shake - dt * 1.5);
  const ox = (Math.random() - 0.5) * shake * 0.12, oy = (Math.random() - 0.5) * shake * 0.12;
  camera.position.x += ox;
  camera.position.y += oy;

  post.uniforms.time.value = t;
  post.uniforms.aberration.value = state.aberration;
  post.uniforms.red.value = state.red;
  post.uniforms.fade.value = state.fade;

  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCam);

  camera.position.x -= ox;
  camera.position.y -= oy;
}
frame();

// ---------------------------------------------------------------- start / pause
ui.title.addEventListener('click', async () => {
  if (!audioReady) {
    ui.title.querySelector('.start').textContent = 'Loading...';
    await audio.init();
    audioReady = true;
  }
  ui.title.style.display = 'none';
  controls.lock();
  if (!state.started) {
    state.started = true;
    state.fade = 1;
    state.fadeTarget = 0;
    audio.startAmbience();
    setTimeout(() => setObjective('Find a way out.'), 1500);
    setTimeout(() => showMessage('"Maya? ...Maya, this isn\'t funny."', 3500), 3000);
  }
});
ui.pause.addEventListener('click', () => {
  if (ui.pause.dataset.restart) return location.reload();
  controls.lock();
});
controls.addEventListener('lock', () => { ui.pause.style.display = 'none'; ui.cross.style.display = 'block'; });
controls.addEventListener('unlock', () => {
  ui.cross.style.display = 'none';
  if (state.started && state.phase !== 'done') ui.pause.style.display = 'flex';
});
