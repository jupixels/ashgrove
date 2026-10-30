// The monster: the Mixamo creature (Ch25) with its animations, plus the AI that hunts you on each floor.
//
//   patrol      walks between the floor's patrol points
//   investigate heard something: goes to where the noise came from
//   chase       sees you: runs at you, re-pathing as you move
//   search      lost you: looks around where it last saw/heard you, then goes back to patrolling
//
// Story scenes take it over with mode = 'script' and place/animate it directly.
import * as THREE from 'three';
import { psx } from './engine.js';
import { PHONE_LAYER } from './world.js';

const SCALE = 1.35;
const SPEED = { patrol: 1.3, investigate: 2.1, chase: 3.8, search: 1.0 };
const ANIM = { patrol: 'walk', investigate: 'walk', chase: 'run', search: 'search', stunned: 'roar' };

export function createMonster({ A, scene, audio }) {
  const group = new THREE.Group();
  const model = A.models.monster.scene;
  model.scale.setScalar(SCALE);
  model.traverse((o) => {
    if (!o.isMesh) return;
    const map = o.material.map;
    if (map) map.magFilter = map.minFilter = THREE.NearestFilter;
    o.material = psx(new THREE.MeshLambertMaterial({ map }));
    o.castShadow = true;
    o.frustumCulled = false;
  });
  group.add(model);
  group.visible = false;
  scene.add(group);

  // A faint, sickly glow in front of it so its shape always reads in the dark. It stays in the scene (just dimmed)
  // so hiding the monster never changes the light count, which would recompile every material mid-scare.
  const presence = new THREE.PointLight(0xb0a080, 0, 3.5, 1.5);
  scene.add(presence);

  const mixer = new THREE.AnimationMixer(model);
  const clips = {};
  for (const clip of A.models.monster.animations) {
    // animations play in place: we move the monster ourselves
    const hips = clip.tracks.find((t) => t.name.endsWith('Hips.position'));
    if (hips) {
      const v = hips.values;
      const size = [0, 1, 2].map((a) => Math.abs(v[a]));
      const up = size.indexOf(Math.max(...size));
      for (let i = 0; i < v.length; i += 3) for (let a = 0; a < 3; a++) if (a !== up) v[i + a] = v[a];
    }
    clips[clip.name] = mixer.clipAction(clip);
  }
  let current = null;
  function anim(name, { fade = 0.25, speed = 1, once = false } = {}) {
    const a = clips[name];
    if (!a) return;
    if (a === current) { a.setEffectiveTimeScale(speed); return; }
    a.reset();
    a.setEffectiveTimeScale(speed);
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat);
    a.clampWhenFinished = once;
    a.fadeIn(fade).play();
    if (current) current.fadeOut(fade);
    current = a;
  }

  const m = {
    group, anim,
    mode: 'off',                  // 'off' | 'ai' | 'script'
    state: 'patrol',
    floor: null,
    path: [], repath: 0,
    target: null, lastSeen: null, lostT: 0, searchT: 0, stunT: 0, stunCooldown: 0,
    suspicion: 0, sawHide: false, stepT: 0, growlT: 0,
    speedScale: 1, hearScale: 1, sightScale: 1,   // set per floor and difficulty
    route: 0, routeI: 0,                          // which patrol route it's walking, and where along it
  };
  const tmp = new THREE.Vector3();

  m.setFloor = (floor) => { m.floor = floor; m.mode = 'off'; group.visible = false; };
  m.show = (pos, lookAt) => {
    group.position.set(pos.x, 0, pos.z);
    group.visible = true;
    if (lookAt) group.lookAt(lookAt.x, 0, lookAt.z);
  };
  m.hide = () => { group.visible = false; m.mode = m.mode === 'ai' ? 'off' : m.mode; };
  m.phoneOnly = (on) => model.traverse((o) => { if (o.isMesh) o.layers.set(on ? PHONE_LAYER : 0); });

  // start hunting on this floor, from a spot (or the patrol point furthest from `avoid`)
  m.startAI = ({ at, avoid, state = 'patrol', target } = {}) => {
    const f = m.floor;
    let start = at;
    if (!start && f.waypoints.length) {
      start = f.waypoints.slice().sort((a, b) => (avoid ? b.distanceTo(avoid) - a.distanceTo(avoid) : 0))[0];
    }
    m.show(start || f.waypoints[0]);
    m.mode = 'ai';
    m.state = state;
    m.target = target ? target.clone() : null;
    m.path = [];
    m.suspicion = 0;
    m.sawHide = false;
    m.heardBreath = false;
    m.route = Math.floor(Math.random() * 2); // start on either patrol route
    m.routeI = 0;
    if (state === 'chase') anim('run');
    else anim('walk');
  };

  // where its face is (the death scare frames it)
  let head = null;
  model.traverse((o) => { if (o.isBone && /Head$/.test(o.name)) head = o; });

  // footsteps in time with its feet: each foot's height above the floor; when one comes back down, that's a step
  const feet = [];
  model.traverse((o) => { if (o.isBone && /(Left|Right)Foot$/.test(o.name)) feet.push({ bone: o, low: Infinity, down: true }); });
  const footPos = new THREE.Vector3();
  function footfalls(dt, onStep) {
    group.updateMatrixWorld(true);
    for (const f of feet) {
      f.bone.getWorldPosition(footPos);
      const y = footPos.y - group.position.y;
      f.low = Math.min(f.low + dt * 0.05, y); // the lowest it gets (drifting up slowly, so it adapts to walk and run)
      if (!f.down && y < f.low + 0.04) { f.down = true; onStep(); }
      else if (f.down && y > f.low + 0.1) f.down = false;
    }
  }
  // how loud something it does is where you are: loud up close, fading out to `range` metres
  const near = (d, range) => THREE.MathUtils.clamp(1 - d / range, 0, 1);
  m.headPos = (out = new THREE.Vector3()) => {
    group.updateMatrixWorld(true);
    return head ? head.getWorldPosition(out) : out.copy(group.position).setY(2.2);
  };
  m.light = null; // a story scene can take over its glow: { intensity, at }
  // turn just the head (nod, shake, tilt) on top of the current animation pose; the next frame's animation resets it
  m.twistHead = (nod, turn, tilt) => {
    if (!head) return;
    head.rotateX(nod);
    head.rotateY(turn);
    head.rotateZ(tilt);
  };

  m.distanceTo = (v) => Math.hypot(group.position.x - v.x, group.position.z - v.z);

  // somebody made a noise of this loudness (metres it carries)
  m.hear = (pos, radius) => {
    if (m.mode !== 'ai' || m.state === 'chase' || m.state === 'stunned') return;
    if (m.distanceTo(pos) > radius * m.hearScale) return;
    m.state = 'investigate';
    m.target = pos.clone();
    m.path = [];
    if (m.growlT <= 0) { audio.play('monster_clicking', { volume: Math.max(0.25, near(m.playerDist ?? 20, 50)), pos: group.position }); m.growlT = 4; }
  };

  function goTo(goal, speed, dt) {
    const f = m.floor;
    m.repath -= dt;
    if (!m.path.length || m.repath <= 0) {
      m.path = f.route(f.cellOf(group.position), f.cellOf(goal)).slice(1);
      m.repath = m.state === 'chase' ? 0.35 : 1.5;
    }
    let next = m.path.length ? f.cellCenter(...m.path[0]) : goal.clone();
    if (!m.path.length || m.path.length === 1) next = goal.clone(); // last stretch: straight to it
    const door = m.path.length ? f.doorAt(...m.path[0]) : null;
    if (door && !door.open && m.distanceTo(next) < 2.4) door.openNow();
    tmp.set(next.x - group.position.x, 0, next.z - group.position.z);
    const d = tmp.length();
    if (d < 0.25) { m.path.shift(); return d; }
    tmp.normalize();
    group.position.addScaledVector(tmp, Math.min(d, speed * m.speedScale * dt));
    const yaw = Math.atan2(tmp.x, tmp.z);
    group.rotation.y += Math.atan2(Math.sin(yaw - group.rotation.y), Math.cos(yaw - group.rotation.y)) * Math.min(1, dt * 8);
    return m.distanceTo(goal);
  }

  // ---------------------------------------------------------------- the hunt
  m.update = (dt, player, events) => {
    if (group.visible) mixer.update(dt);
    presence.intensity = group.visible ? (m.light ? m.light.intensity : 2.6) : 0;
    if (group.visible) presence.position.copy(m.light ? m.light.at : group.localToWorld(tmp.set(0, 1.9, 1.0)));
    if (m.mode !== 'ai' || !player) return;

    const f = m.floor;
    m.growlT -= dt;
    m.stunCooldown -= dt;
    const eye = group.position.clone().setY(2.0);
    const pp = player.position.clone();
    const dist = m.distanceTo(pp);
    m.playerDist = dist;
    const toPlayer = pp.clone().setY(0).sub(group.position.clone().setY(0)).normalize();
    const facing = new THREE.Vector3(Math.sin(group.rotation.y), 0, Math.cos(group.rotation.y));
    const inView = facing.dot(toPlayer) > 0.35 || dist < 3;
    // how far it can see you: further on a floor whose lights you've switched back on, and if you're standing under a
    // working light you don't need your torch on to be seen
    const powered = f.def.needsPower && f.powered;
    const range = 22 * m.sightScale * (powered ? 1.35 : 1);
    const underLight = f.lights.some((l) => l.lit && Math.hypot(l.light.position.x - pp.x, l.light.position.z - pp.z) < 5);
    const lit = player.flashOn || underLight || dist < 9 * m.sightScale;
    const sees = !player.hidden && dist < range && inView && lit && f.los(eye, pp);

    if (m.state === 'stunned') {
      m.stunT -= dt;
      if (m.stunT <= 0) { m.state = 'chase'; m.lastSeen = pp.clone(); m.path = []; }
      return;
    }

    if (sees) {
      if (m.state !== 'chase') {
        anim('roar', { fade: 0.1, speed: 1.6, once: true });
        audio.play('monster_growl_distant', { volume: 1.4 * Math.max(0.35, near(dist, 50)), pos: group.position });
        if (events.spotted) events.spotted();
      }
      m.state = 'chase';
      m.lastSeen = pp.clone();
      m.lostT = 0;
    }
    // if it watched you climb into a locker, it knows exactly where you are
    if (player.hidden && m.state === 'chase' && m.lostT < 0.6 && dist < 12) m.sawHide = true;

    let moveSpeed = 0;
    if (m.state === 'chase') {
      m.lostT += sees ? 0 : dt;
      const goal = player.hidden && m.sawHide ? player.hidden.outside : m.lastSeen;
      const left = goTo(goal, SPEED.chase, dt);
      moveSpeed = SPEED.chase;
      if (m.lostT > 3.5 && !m.sawHide) { m.state = 'search'; m.target = m.lastSeen.clone(); m.searchT = 5; m.path = []; }
      if (player.hidden && m.sawHide && left < 1.0) { events.caught(m.heardBreath ? 'breath' : 'dragged'); return; }
    } else if (m.state === 'investigate') {
      const left = goTo(m.target, SPEED.investigate, dt);
      moveSpeed = SPEED.investigate;
      if (left < 0.8) { m.state = 'search'; m.searchT = 4; }
    } else if (m.state === 'search') {
      m.searchT -= dt;
      if (m.searchT <= 0) { m.state = 'patrol'; m.target = null; m.path = []; }
    } else { // patrol
      if (!m.target || m.distanceTo(m.target) < 0.8) {
        const routes = (f.def.routes || []).map((r) => r.map((n) => f.wp[n]).filter(Boolean)).filter((r) => r.length);
        if (routes.length) {
          // two patrol routes (the front corridor and the back): walk one, then usually switch to the other
          if (m.target) m.routeI++;
          if (m.routeI >= routes[m.route % routes.length].length) { m.routeI = 0; if (Math.random() < 0.7) m.route++; }
          m.target = routes[m.route % routes.length][m.routeI].clone();
        } else {
          const pts = f.waypoints.filter((w) => w.distanceTo(group.position) > 3);
          m.target = (pts.length ? pts : f.waypoints)[Math.floor(Math.random() * (pts.length || f.waypoints.length))].clone();
        }
        m.path = [];
      }
      goTo(m.target, SPEED.patrol, dt);
      moveSpeed = SPEED.patrol;
    }
    anim(ANIM[m.state], { speed: m.state === 'chase' ? 1.15 : 1 });

    // heavy footsteps, each one as a foot comes down: loud close by, heard a long way off
    if (moveSpeed && dist < 45) {
      footfalls(dt, () => {
        const v = 1.8 * near(dist, 45) ** 1.2;
        if (v > 0.03) audio.play(Math.random() < 0.2 ? 'monster_drag_tubes' : 'monster_footstep_heavy', { volume: v, pos: group.position });
      });
    }

    // caught in the open
    if (!player.hidden && dist < 1.15 && (m.state === 'chase' || m.state === 'investigate')) { events.caught('caught'); return; }

    // close to your hiding place: if you're breathing, it hears you
    if (player.hidden && !m.sawHide && dist < 2.6) {
      m.suspicion += player.breathHeld ? -dt : dt;
      m.suspicion = Math.max(0, m.suspicion);
      if (m.suspicion > 1.3) { m.sawHide = true; m.heardBreath = true; m.state = 'chase'; m.lastSeen = pp.clone(); }
      if (m.state === 'patrol' && m.suspicion > 0.4) { m.state = 'search'; m.searchT = 4; }
    } else m.suspicion = Math.max(0, m.suspicion - dt);
  };

  return m;
}
