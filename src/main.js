// ASHGROVE: boot, menus, loading floors, checkpoints, and the frame loop.
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { createEngine, psx } from './engine.js';
import { GameAudio } from './audio.js';
import { loadAssets } from './assets.js';
import { createIntro } from './cutscene.js';
import { FLOORS, TAPE_COUNT, CHAPTERS } from './floors.js';
import { buildFloor } from './world.js';
import { createPlayer } from './player.js';
import { createMonster } from './monster.js';
import { createStory, CREDITS } from './story.js';
import { createUI } from './ui.js';
import { setupMaya } from './maya.js';
import * as SAVE from './save.js';

const DEBUG = location.search.includes('debug');
const ui = createUI();

// phones and tablets: this game needs a keyboard and mouse
const touchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;
if (touchOnly && !DEBUG) { ui.mobile(); throw new Error('touch device'); }

const engine = createEngine();
const camera = engine.camera;
const scene = new THREE.Scene();
scene.add(camera);
const ambient = new THREE.AmbientLight(0x1a1f1a, 0.35);
scene.add(ambient);
function indoors() {
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x020202, 0.11);
  ambient.intensity = 0.35;
}
indoors();

const A = await loadAssets((p) => ui.loading(p));
const audio = new GameAudio();
let settings = SAVE.loadSettings();

const controls = new PointerLockControls(camera, document.body);
const fx = { aberration: 0, red: 0, fade: 1, fadeTarget: 0, shake: 0, timeScale: 1 };
const game = { state: 'menu', save: null, floor: null, taken: new Set(), overlay: false };
const view = { scene, camera };

const monster = createMonster({ A, scene, audio });
const player = createPlayer({ camera, scene, audio, ui, settings, onNoise: (pos, r) => monster.hear(pos, r) });
player.yaw = () => camera.rotation.y;
const maya = setupMaya(A.models.maya);
maya.group.visible = false;
scene.add(maya.group);

function applySettings() {
  controls.pointerSpeed = 0.8 * settings.sensitivity;
  if (audio.master) audio.master.gain.value = settings.volume;
  engine.post.uniforms.grain.value = 0.09;
}
applySettings();

// ---------------------------------------------------------------- saving
function persist() {
  game.save.taken = [...game.taken];
  // where you are right now, so Continue puts you back on the exact spot (dying still goes back to the checkpoint)
  if (game.state === 'playing' && game.floor && !story.dying) {
    const pos = player.hidden ? player.hidden.outside : camera.position;
    game.save.resume = { floor: game.floor.key, x: pos.x, z: pos.z, yaw: camera.rotation.y, battery: player.battery };
  }
  SAVE.writeSave(game.save);
}

// autosave every few seconds, whenever nothing is mid-way through happening
let autosaveT = 0;
const calm = () => game.state === 'playing' && !player.frozen && !story.busy() && !(monster.mode === 'ai' && monster.state === 'chase');
function autosave(dt) {
  autosaveT += dt;
  if (autosaveT < 5 || !calm()) return;
  autosaveT = 0;
  persist();
}
const saveNow = () => { if (calm()) persist(); }; // otherwise the last autosave stands
addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

// ---------------------------------------------------------------- floors
let ambienceLoop = null;
function loadFloor(key, arrive) {
  if (game.floor) { scene.remove(game.floor.group); game.floor.dispose(); }
  const def = FLOORS[key];
  const floor = buildFloor(key, def, A, { taken: game.taken, lessGore: settings.lessGore, powered: !!game.save.flags.power });
  floor.onSound = (name, pos, vol) => audio.play(name, { pos, volume: vol * THREE.MathUtils.clamp(1 - camera.position.distanceTo(pos) / 25, 0.1, 1) });
  scene.add(floor.group);
  if (def.outdoor) { scene.fog = new THREE.FogExp2(0x4a3a4a, 0.02); ambient.intensity = 1.6; } else indoors();
  game.floor = floor;
  player.setFloor(floor);
  const at = typeof arrive === 'object' && arrive ? arrive : def.arrive[arrive] || Object.values(def.arrive)[0];
  player.spawn(at);
  player.frozen = false;
  player.flashOn = true;
  player.setPhone(false);
  if (ambienceLoop) ambienceLoop.stop(1);
  ambienceLoop = def.ambience && audio.buffers[def.ambience] ? audio.loop(def.ambience, 0.35) : null;
  story.enterFloor(key, typeof arrive === 'string' ? arrive : 'checkpoint');
}

function changeFloor(key, arrive) {
  player.frozen = true;
  fx.fadeTarget = 1;
  setTimeout(() => {
    game.save.floor = key;
    game.save.checkpoint = arrive;
    game.save.resume = null;
    loadFloor(key, arrive);
    persist(); // arriving somewhere new is a checkpoint
    fx.fadeTarget = 0;
  }, 700);
}

// ---------------------------------------------------------------- story context
const ctx = {
  audio, ui, player, monster, maya, scene, fx, camera,
  get save() { return game.save; },
  get floor() { return game.floor; },
  get settings() { return settings; },
  overlay(open) {
    game.overlay = true;
    controls.unlock();
    open(() => { game.overlay = false; controls.lock(); });
  },
  checkpoint(pos) { game.save.floor = game.floor.key; if (pos) game.save.checkpoint = pos; persist(); },
  saveTaken(id) { game.taken.add(id); },
  changeFloor,
  noise: (pos, r) => monster.hear(pos, r),
  died,
  end: endGame,
};
const story = createStory(ctx);

// ---------------------------------------------------------------- dying, endings, menus
function died(text) {
  game.state = 'dead';
  silenceHeart();
  monster.mode = 'off';
  monster.group.visible = false;
  const disk = SAVE.loadSave();
  if (disk) { disk.deaths = (disk.deaths || 0) + 1; disk.resume = null; SAVE.writeSave(disk); }
  ui.hud(false);
  controls.unlock();
  ui.death(text, retry, toMenu);
}

function retry() {
  game.save = SAVE.loadSave() || SAVE.newSave();
  game.taken = new Set(game.save.taken || []);
  resetFx();
  story.reset();
  loadFloor(game.save.floor, game.save.checkpoint);
  startPlaying();
}

function endGame(kind) {
  game.state = 'ending';
  silenceHeart();
  player.frozen = true;
  monster.mode = 'off';
  monster.group.visible = false;
  controls.unlock();
  ui.hud(false);
  fx.fadeTarget = 1;
  SAVE.clearSave();
  ui.ending(story.endingCards(kind), () => ui.credits(CREDITS, toMenu));
}

function resetFx() {
  Object.assign(fx, { aberration: 0, red: 0, fade: 1, fadeTarget: 0, shake: 0, timeScale: 1 });
}

function startPlaying() {
  game.state = 'playing';
  ui.hideMainMenu();
  ui.hud(true);
  controls.lock();
}

function toMenu() {
  game.state = 'menu';
  silenceHeart();
  story.reset();
  monster.mode = 'off';
  monster.group.visible = false;
  maya.group.visible = false;
  if (game.floor) { scene.remove(game.floor.group); game.floor.dispose(); game.floor = null; }
  if (ambienceLoop) { ambienceLoop.stop(1); ambienceLoop = null; }
  ui.hud(false);
  ui.pauseMenu(false);
  showMainMenu();
}

async function ensureAudio() {
  if (!audio.ctx) {
    await audio.init();
    // muffle sounds that have a wall or closed door between you and them
    audio.occluded = (pos) => !!game.floor && !game.floor.def.outdoor && !game.floor.los(camera.position, new THREE.Vector3(pos.x, camera.position.y, pos.z));
    applySettings();
    audio.startAmbience();
  }
}

function newGame() {
  ensureAudio().then(() => {
    game.save = SAVE.newSave();
    game.taken = new Set();
    persist();
    resetFx();
    story.reset();
    loadFloor('F1', 'start');
    ui.hideMainMenu();
    if (DEBUG && location.search.includes('nointro')) { startPlaying(); return; }
    game.state = 'intro';
    player.frozen = true;
    intro = createIntro({
      mainScene: scene, floorGroup: game.floor.group, psx, audio, state: fx, lights: game.floor.lights,
      monster: monster.group, monsterAnim: monster.anim, mayaRig: maya, decal: game.floor.decal, blood: A.tex.blood,
      startAmbience: () => {}, aspect: () => camera.aspect,
      setPower: (on) => game.floor.setPower(on),
      setView(s, c) { view.scene = s; view.camera = c; },
      onDone: () => {
        view.scene = scene;
        view.camera = camera;
        intro = null;
        player.spawn(FLOORS.F1.arrive.start);
        player.frozen = false;
        fx.fade = 1;
        fx.fadeTarget = 0;
        startPlaying();
        ui.chapter(CHAPTERS[1].title, 'GROUND FLOOR');
        game.save.flags.card1 = true;
        setTimeout(() => ui.objective('Find a way to lift the lockdown.'), 3800);
      },
    });
    intro.start();
  });
}

function continueGame() {
  ensureAudio().then(() => {
    game.save = SAVE.loadSave();
    if (!game.save) return newGame();
    game.taken = new Set(game.save.taken || []);
    resetFx();
    story.reset();
    const r = game.save.resume;
    if (r && r.floor === game.save.floor) {
      loadFloor(game.save.floor, { x: r.x, z: r.z, yaw: r.yaw });
      player.battery = r.battery ?? player.battery;
    } else loadFloor(game.save.floor, game.save.checkpoint);
    startPlaying();
  });
}

function showMainMenu() {
  ui.mainMenu({
    canContinue: !!SAVE.loadSave(),
    onNew: newGame,
    onContinue: continueGame,
    onSettings: () => { ui.hideMainMenu(); openSettings(showMainMenu); },
    onCredits: () => { ui.hideMainMenu(); ui.credits(CREDITS, showMainMenu); },
  });
}

function openSettings(back) {
  ui.settingsMenu(settings, (s) => { settings = { ...settings, ...s }; SAVE.writeSettings(settings); applySettings(); }, back);
}

function pauseStats() {
  const s = game.save;
  const keys = ['red', 'blue', 'black'].filter((k) => s.flags[k]).length;
  return `${CHAPTERS[s.chapter].title} · Tapes ${s.tapes.length}/${TAPE_COUNT} · Keycards ${keys}/3\n${s.objective || ''}`;
}
function showPause() {
  ui.pauseMenu(true, {
    stats: pauseStats(),
    onResume: () => { ui.pauseMenu(false); controls.lock(); },
    onSettings: () => { ui.pauseMenu(false); openSettings(showPause); },
    onQuit: () => { ui.pauseMenu(false); saveNow(); toMenu(); },
  });
}

controls.addEventListener('lock', () => { ui.pauseMenu(false); ui.hud(game.state === 'playing'); });
controls.addEventListener('unlock', () => {
  if (game.state === 'playing' && !game.overlay) { saveNow(); showPause(); }
});

// ---------------------------------------------------------------- input
addEventListener('keydown', (e) => {
  if (game.state !== 'playing' || game.overlay || !(controls.isLocked || DEBUG)) return;
  if (e.code === 'Space') e.preventDefault();
  player.keyDown(e.code);
});
addEventListener('keyup', (e) => player.keyUp(e.code));
addEventListener('mousedown', (e) => { if (game.state === 'playing' && controls.isLocked) player.mouseDown(e.button); });
addEventListener('contextmenu', (e) => e.preventDefault());

// ---------------------------------------------------------------- dread: heartbeat and distortion when it's close
let heartT = 0, heartLoop = null;
function silenceHeart() { if (heartLoop) heartLoop.gain.gain.value = 0; }
function updateDread(dt) {
  const near = monster.group.visible ? monster.distanceTo(camera.position) : 99;
  if (audio.buffers.heartbeat_fast) {
    // the recorded heartbeat fades in as it gets close
    if (!heartLoop) heartLoop = audio.loop('heartbeat_fast', 0);
    const target = THREE.MathUtils.clamp(1 - (near - 1.5) / 8, 0, 1);
    heartLoop.gain.gain.value += (target - heartLoop.gain.gain.value) * Math.min(1, dt * 3);
  } else {
    heartT -= dt;
    if (near < 7 && heartT <= 0) {
      audio.play('heartbeat', { volume: 0.9 });
      heartT = 0.4 + near * 0.11;
    }
  }
  if (monster.group.visible && !settings.reduceFlashing) fx.aberration = Math.max(fx.aberration, THREE.MathUtils.clamp(1 - near / 10, 0, 0.55));
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
let intro = null;
const monsterEvents = {
  caught: (how) => story.caught(how),
  spotted: () => {},
  stunned: () => ui.message('It flinches from the light!', 1200),
};

function simulate(dt) {
  player.update(dt);
  monster.update(dt, player, monsterEvents);
  story.update(dt);
  game.floor.update(dt);
  updateDread(dt);
  autosave(dt);
  game.save.playTime = (game.save.playTime || 0) + dt;
  ui.camTime(game.save.playTime);
}

// ---------------------------------------------------------------- light and air
// One ceiling light at a time casts real shadows: the one nearest the monster, so its shape stretches across the
// walls and floor as it walks under it (or, when it's not around, the one nearest you). The shadow light always
// exists and just takes that light's place, so the light count never changes and nothing recompiles.
const shadowLight = new THREE.PointLight(0xffffff, 0, 11, 1.6);
shadowLight.castShadow = true;
shadowLight.shadow.mapSize.set(256, 256);
shadowLight.shadow.camera.near = 0.2;
shadowLight.shadow.camera.far = 12;
shadowLight.shadow.bias = -0.002;
shadowLight.shadow.normalBias = 0.05;
scene.add(shadowLight);
function castShadows() {
  shadowLight.intensity = 0;
  const f = game.floor;
  if (!f || f.def.outdoor) return;
  const near = monster.group.visible ? monster.group.position : camera.position;
  let best = null, bestD = monster.group.visible ? 7 : 9;
  for (const l of f.lights) {
    if (l.light.intensity <= 0) continue;
    const d = Math.hypot(l.light.position.x - near.x, l.light.position.z - near.z);
    if (d < bestD) { bestD = d; best = l.light; }
  }
  if (!best) return;
  shadowLight.position.copy(best.position);
  shadowLight.color.copy(best.color);
  shadowLight.distance = best.distance;
  shadowLight.decay = best.decay;
  shadowLight.intensity = best.intensity;
  best.intensity = 0;
}
// the air is thick with dust: the fog closes in where the lights are dead and thins out under working ones
let fogDensity = 0.11;
function updateFog(dt) {
  const f = game.floor;
  if (!f || f.def.outdoor || !scene.fog) return;
  let lit = 0;
  for (const l of f.lights) lit += (l.light.intensity / 7) * Math.max(0, 1 - camera.position.distanceTo(l.light.position) / 9);
  const want = THREE.MathUtils.lerp(0.16, 0.08, Math.min(1, lit));
  fogDensity += (want - fogDensity) * Math.min(1, dt * 0.8);
  scene.fog.density = fogDensity;
}

function render(dt, t) {
  fx.aberration = Math.max(0, fx.aberration - dt * 1.2);
  fx.red = Math.max(0, fx.red - dt * 0.8);
  fx.fade += (fx.fadeTarget - fx.fade) * Math.min(1, dt * (fx.fadeTarget > fx.fade ? 12 : 1.5));
  const shake = fx.shake * fx.shake;
  fx.shake = Math.max(0, fx.shake - dt * 1.5);
  const cam = view.camera;
  const ox = (Math.random() - 0.5) * shake * 0.12, oy = (Math.random() - 0.5) * shake * 0.12;
  cam.position.x += ox;
  cam.position.y += oy;
  // stamina and breath show on the screen itself, not as bars
  const playing = game.state === 'playing';
  const tiredWant = playing && !player.hidden ? (player.winded ? 1 : THREE.MathUtils.clamp((0.45 - player.stamina) / 0.45, 0, 1) * 0.7) : 0;
  const airWant = playing && player.hidden ? (player.breathHeld ? 1 - player.breath : (1 - player.breath) * 0.4) : 0;
  fx.tired = (fx.tired || 0) + (tiredWant - (fx.tired || 0)) * Math.min(1, dt * 3);
  fx.air = (fx.air || 0) + (airWant - (fx.air || 0)) * Math.min(1, dt * 4);
  engine.render(view.scene, cam, { time: t, aberration: fx.aberration, red: fx.red, fade: fx.fade, phone: player.phoneUp ? 1 : 0, tired: fx.tired, air: fx.air });
  cam.position.x -= ox;
  cam.position.y -= oy;
}

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (intro && intro.active) {
    if (!intro.frozen) intro.update(dt);
    monster.update(dt, null, monsterEvents);
  } else if (game.state === 'playing' && game.floor && (controls.isLocked || DEBUG) && !game.overlay) simulate(dt * fx.timeScale);
  if (game.floor) game.floor.updateLights(dt, (pos) => { if (camera.position.distanceTo(pos) < 10) audio.play('flicker', { volume: 0.4, pos }); });
  updateFog(dt);
  castShadows();
  audio.listen(view.camera);
  render(dt, t);
}

if (DEBUG) {
  window.game = { game, player, monster, story, ctx, loadFloor, changeFloor, fx, maya, get intro() { return intro; } };
  window.game.tick = (seconds = 1, dt = 1 / 30) => { for (let s = 0; s < seconds; s += dt) { simulate(dt); game.floor.updateLights(dt); } render(0, clock.elapsedTime); };
  window.game.introTick = (seconds = 1, dt = 1 / 30) => { for (let s = 0; s < seconds; s += dt) { intro.update(dt); monster.update(dt, null, monsterEvents); game.floor.updateLights(dt); render(dt, clock.elapsedTime); } };
}

ui.loading(1);
showMainMenu();
frame();
