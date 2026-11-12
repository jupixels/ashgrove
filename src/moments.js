// Small moments on each floor, on top of the main story beats: a wheelchair that rolls out by itself, a phone that
// rings as you pass, a mirror with something standing behind you, a voice in the vents, Maya's footprints in the
// blood that lead somewhere and just stop, and footsteps in the ceiling that keep pace with yours. Each happens once
// (remembered in the save's flags). And on every floor, a patient chart: yours.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import * as T from './textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const cellPos = (x, z) => V(x * 2 + 1, 0, z * 2 + 1);

export function createMoments(ctx) {
  const { audio, ui, player, monster } = ctx;
  const F = () => ctx.save.flags;
  let active = [];   // per-frame updaters for this floor
  let loops = [];    // positional loops to stop when leaving
  let stepHook = null; // something that wants to know each time you take a step

  const inCells = (x0, x1, z0, z1) => {
    const [x, z] = ctx.floor.cellOf(player.position);
    return x >= x0 && x <= x1 && z >= z0 && z <= z1;
  };

  // ---------------------------------------------------------------- Maya's footprints, ending in a smear
  function footprints(path) {
    const f = ctx.floor;
    const tex = [T.footprintTex(true), T.footprintTex(false)];
    let step = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const a = cellPos(...path[i]), b = cellPos(...path[i + 1]);
      const dir = b.clone().sub(a);
      const len = dir.length();
      dir.normalize();
      const side = V(-dir.z, 0, dir.x);
      const yaw = Math.atan2(dir.x, dir.z);
      for (let d = 0; d < len; d += 0.68) {
        const left = step++ % 2 === 0;
        const p = a.clone().addScaledVector(dir, d).addScaledVector(side, left ? -0.12 : 0.12).setY(0.017);
        const fade = 1 - (i + d / len) / (path.length - 1) * 0.6; // the prints get fainter as the blood runs out
        const dec = f.decal(tex[left ? 0 : 1], 0.16, 0.32, p, -Math.PI / 2, yaw + Math.PI);
        dec.material.opacity = fade;
      }
    }
    // where they stop: a long smear, as if she was lifted
    const end = cellPos(...path[path.length - 1]);
    if (!ctx.settings.lessGore) f.decal(f.bloodTex(1), 1.4, 1.4, end.clone().setY(0.018), -Math.PI / 2, 0.7);
  }

  // ---------------------------------------------------------------- the wheelchair that rolls out on its own
  function wheelchair({ from, to, trigger, flag }) {
    const f = ctx.floor;
    const chair = f.makeWheelchair();
    const a = cellPos(...from), b = cellPos(...to);
    chair.position.copy(F()[flag] ? b : a);
    chair.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    f.add(chair);
    if (F()[flag]) return;
    let t = -1;
    active.push((dt) => {
      if (t < 0) {
        if (!inCells(...trigger) || player.facingFlat(a) < 0.6) return;
        F()[flag] = true;
        t = 0;
        audio.play('wheelchair_roll', { volume: 0.9, pos: a });
      }
      t += dt;
      const k = Math.min(1, t / 3.2);
      const ease = 1 - (1 - k) * (1 - k); // gives a shove, then slows to a stop
      chair.position.lerpVectors(a, b, ease);
      chair.rotation.y += Math.sin(t * 3) * 0.002; // a slight wobble
      return k >= 1;
    });
  }

  // ---------------------------------------------------------------- the phone that rings as you walk past
  function phone({ at, face, trigger, flag }) {
    const f = ctx.floor;
    const c = cellPos(...at);
    const n = { north: V(0, 0, 1), south: V(0, 0, -1), east: V(-1, 0, 0), west: V(1, 0, 0) }[face]; // out of the wall
    const pos = c.clone().addScaledVector(n, -0.96).setY(1.4);
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.08), new THREE.MeshLambertMaterial({ color: 0x2a2826 }));
    const handset = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.05), new THREE.MeshLambertMaterial({ color: 0x1a1816 }));
    handset.position.set(0.07, 0, 0.05);
    g.add(body, handset);
    g.position.copy(pos);
    g.rotation.y = Math.atan2(n.x, n.z);
    f.add(g);
    if (F()[flag]) return;
    let ring = null, ringT = 0, done = false;
    const answer = () => {
      if (done) return;
      done = true;
      F()[flag] = true;
      if (ring) ring.stop(0.05);
      handset.visible = false;
      audio.play('walkie_static', { volume: 0.25 });
      setTimeout(() => {
        audio.play('phone_whisper', { volume: 1 });
        ui.say('???', '...Sam?... (static) ...it\'s so cold up here...', 4500, 'whisper');
      }, 900);
      setTimeout(() => { handset.visible = true; ui.message('The line goes dead.', 2500); }, 6000);
    };
    f.interact({ id: 'ringingPhone', pos, radius: 0.4, label: () => (ring && !done ? '[E] Answer the phone' : null), use: answer });
    active.push((dt) => {
      if (done) return true;
      if (!ring && inCells(...trigger)) {
        ringT = 0;
        if (audio.buffers.phone_ring) ring = audio.loop('phone_ring', 0.8, pos);
        else { // no recording yet: an old two-tone ring, every 3 seconds
          const id = setInterval(() => audio.play('phone_ring', { volume: 0.7, pos }), 3000);
          audio.play('phone_ring', { volume: 0.7, pos });
          ring = { stop: () => clearInterval(id) };
        }
      }
      if (ring) {
        ringT += dt;
        if (ringT > 14) { ring.stop(0.3); ring = null; done = true; F()[flag] = true; } // it stops before you get there
      }
    });
    loops.push(() => ring && ring.stop(0.1));
  }

  // ---------------------------------------------------------------- the mirror: look into it, and it's behind you
  function mirror({ at, flag, area }) {
    const f = ctx.floor;
    const c = cellPos(...at);
    const pos = c.clone().setZ(at[1] * 2 + 0.05).setY(1.55); // on the north wall of the cell, facing south
    const glass = new Reflector(new THREE.PlaneGeometry(1.3, 0.8), { textureWidth: 256, textureHeight: 160, color: 0x8a8a8a, clipBias: 0.003 });
    glass.position.copy(pos);
    f.add(glass);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.92, 0.03), new THREE.MeshLambertMaterial({ color: 0x3a3a34 }));
    frame.position.copy(pos).setZ(pos.z - 0.02);
    f.add(frame);
    if (F()[flag]) return;
    let state = 'wait', t = 0, behind = null;
    active.push((dt) => {
      if (state === 'wait') {
        if (monster.mode === 'ai' || !inCells(...area) || player.position.distanceTo(pos) > 4 || player.facing(pos) < 0.85) return;
        // put it right behind you, where only the mirror shows it
        const back = player.forward();
        back.y = 0;
        back.normalize().multiplyScalar(-1.5);
        behind = player.position.clone().add(back).setY(0);
        const [bx, bz] = f.cellOf(behind);
        if (!f.walkable(bx, bz)) return;
        state = 'shown';
        t = 0;
        monster.mode = 'script';
        monster.show(behind, player.position.clone().add(back.multiplyScalar(-2)));
        monster.anim('idle', { fade: 0 });
        audio.play('monster_breathing', { volume: 0.5, pos: behind });
      } else if (state === 'shown') {
        t += dt;
        const turned = player.facingFlat(behind) > 0.1;
        if (turned || t > 6) {
          // you turn round: nothing there
          state = 'gone';
          F()[flag] = true;
          monster.group.visible = false;
          monster.mode = 'off';
          if (turned) { audio.play('jumpscare_sting_1', { volume: 0.7 }); ctx.fx.shake = 0.4; }
          return true;
        }
      }
    });
  }

  // ---------------------------------------------------------------- a patient's voice through the vents
  function vent({ at, face, range }) {
    const f = ctx.floor;
    const c = cellPos(...at);
    const n = { north: V(0, 0, 1), south: V(0, 0, -1), east: V(-1, 0, 0), west: V(1, 0, 0) }[face];
    const pos = c.clone().addScaledVector(n, -0.97).setY(2.55);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.04), new THREE.MeshLambertMaterial({ color: 0x4a4a46 }));
    grille.position.copy(pos);
    grille.rotation.y = Math.atan2(n.x, n.z);
    f.add(grille);
    for (let i = 0; i < 5; i++) { // slats
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.02, 0.02), new THREE.MeshBasicMaterial({ color: 0x080808 }));
      s.position.copy(pos).addScaledVector(n, 0.025).setY(pos.y - 0.1 + i * 0.05);
      s.rotation.y = grille.rotation.y;
      f.add(s);
    }
    let wait = 4;
    active.push((dt) => {
      if (player.position.distanceTo(pos) > range) return;
      wait -= dt;
      if (wait > 0) return;
      wait = 22 + Math.random() * 20;
      audio.play('vent_voice', { volume: 0.7, pos });
      if (player.position.distanceTo(pos) < range * 0.6) ui.say('(in the vents)', '...help me... it\'s so cold... I can hear it breathing...', 4000, 'whisper');
    });
  }

  // ---------------------------------------------------------------- footsteps in the ceiling, keeping pace with yours
  // After you've walked a while, something up in the crawlspace walks when you walk: a beat late, a little behind you,
  // soft when you creep, heavy when you run. Stop, and it stops too. Then it takes one more step, right above your
  // head. Walk on and it follows; stop again and it drags itself away. Nothing to see, no sting: just the sound.
  const STEPS = ['monster_step_1', 'monster_step_2', 'monster_step_3'];
  function above({ area, flag, when }) {
    if (F()[flag]) return;
    let walked = 0, follows = 0, stops = 0, sinceStep = 0, heldT = 0, n = 0, phase = 'wait';
    const pending = [];
    const overhead = (back) => {
      const fw = player.forward();
      fw.y = 0;
      fw.normalize();
      return player.position.clone().addScaledVector(fw, -back).setY(3.4);
    };
    const thud = (pos, volume) => audio.play(audio.buffers && audio.buffers.monster_step_1 ? STEPS[n++ % 3] : 'monster_footstep_heavy', { volume, pos, muffled: true, rate: 0.92 });
    const finish = () => {
      F()[flag] = true;
      phase = 'done';
      stepHook = null;
      audio.play('monster_drag_tubes', { volume: 0.45, pos: overhead(4), muffled: true }); // off through the crawlspace
    };
    stepHook = () => {
      if (phase === 'done' || !when() || !inCells(...area)) return;
      sinceStep = 0;
      if (phase === 'wait' && ++walked < 14) return;
      phase = 'follow'; // (and if it was holding still above you: you moved, so it moves)
      follows++;
      if (follows <= 5 && follows % 2 === 0) return; // at first only now and then, as if far off; then every step
      pending.push({ t: 0.26 + Math.random() * 0.08, pos: overhead(1.6), volume: player.sprinting ? 0.85 : player.crouch ? 0.2 : 0.5 });
      if (follows === 12) ui.message('Footsteps in the ceiling. Keeping pace with yours.', 3500);
    };
    active.push((dt) => {
      for (let i = pending.length - 1; i >= 0; i--) if ((pending[i].t -= dt) <= 0) thud(pending[i].pos, pending[i].volume), pending.splice(i, 1);
      if (phase === 'done') return !pending.length;
      sinceStep += dt;
      if (!when()) { pending.length = 0; return; } // it's somewhere else just now
      if (phase === 'follow' && follows >= 6 && sinceStep > 0.8) {
        // you stopped. It stopped. Then one more step, right over your head.
        phase = 'held';
        heldT = 0;
        stops++;
        pending.push({ t: 0.75, pos: player.position.clone().setY(3.4), volume: 0.65 });
      }
      if (phase === 'held' && (heldT += dt) > (stops >= 2 ? 3.5 : 9)) finish();
      if (phase === 'follow' && !inCells(...area)) finish();
    });
  }

  // ---------------------------------------------------------------- the patient chart: yours
  // One hangs on a wall on every floor. Someone has been keeping notes on you: when you were admitted, where you hide,
  // whether you run, whether you keep the light on, how many times you've died. It's written from what you've actually
  // done (save.obs, save.hid, deaths, tapes), and the plan at the bottom moves on as you go up. Read it again later
  // and it has changed.
  const clock = (sec) => {
    const m = (23 * 60 + 40 + Math.floor(sec / 60)) % 1440; // you went in at 23:40
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  };
  function chartText() {
    const s = ctx.save, f = s.flags, o = s.obs || {}, t = o.t || 0;
    const hides = Object.values(s.hid || {}).flatMap((floor) => Object.values(floor));
    const hid = hides.reduce((a, b) => a + b, 0);
    const deaths = s.deaths || 0;
    const obs = [
      deaths && `Re-admitted ${deaths === 1 ? 'once' : `${deaths} times`}. Each intake goes more smoothly.`,
      !hid ? 'Has not hidden yet.' : Math.max(...hides) >= 2 ? 'Hides when frightened. Always goes back to the same place.' : 'Hides when frightened.',
      (o.run || 0) > 25 ? 'Runs. Loudly. Easy to follow.' : t > 150 && 'Walks softly. Listens before it moves.',
      t > 90 && ((o.dark || 0) / t > 0.2 ? 'Has learned to put the light out.' : 'Will not let the light go out.'),
      (o.phone || 0) >= 3 && 'Keeps looking at us through the phone.',
      s.tapes.length && 'Has been listening to the doctor\'s tapes.',
    ].filter(Boolean).slice(0, 4).map((l) => '- ' + l); // (a page: it has to fit on a small screen)
    const ch = s.chapter;
    const plan = f.mayaFreed ? 'Bed 15 is empty. Bring them both back.'
      : ch >= 6 ? 'None needed. The patient has come up to the ward by itself.'
      : ch === 5 ? 'Theatre 2, tonight. Bed 16 is made up.'
      : ch >= 3 ? 'Prepare for theatre. Keep the patient moving upward.'
      : 'Observe. Do not approach yet.';
    const core = [
      'REYES, Sam. 16. Admitted 10/31, 23:40. Bed 16.',
      `With: OKAFOR, Maya. 16. Bed 15.${f.mayaFreed ? ' DISCHARGED WITHOUT CONSENT.' : ''}`,
      '', 'Obs.:', ...obs, '', `Plan: ${plan}  - E.V.`,
    ];
    const text = [...core.slice(0, 3), `Obs. ${clock(t)}:`, ...core.slice(4)].join('\n');
    return { text, core: core.join('\n') }; // (core: the same, without the time, to tell whether anything's new)
  }
  function chart({ at, face }) {
    const f = ctx.floor;
    const c = cellPos(...at);
    const n = { north: V(0, 0, 1), south: V(0, 0, -1), east: V(-1, 0, 0), west: V(1, 0, 0) }[face];
    const pos = c.clone().addScaledVector(n, -0.97).setY(1.45);
    const g = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.36, 0.015), new THREE.MeshLambertMaterial({ color: 0x4a3a2a }));
    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.29, 0.004), new THREE.MeshLambertMaterial({ color: 0xcfc8b2 }));
    paper.position.set(0, -0.02, 0.01);
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.02), new THREE.MeshLambertMaterial({ color: 0x8a8a80 }));
    clip.position.set(0, 0.16, 0.012);
    g.add(board, paper, clip);
    const ink = new THREE.MeshBasicMaterial({ color: 0x2a2620 });
    for (let i = 0; i < 9; i++) { // lines of handwriting
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.08 + ((i * 37) % 9) / 100, 0.005, 0.002), ink);
      line.position.set(-0.03 + ((i * 13) % 5) / 200, 0.09 - i * 0.026, 0.013);
      g.add(line);
    }
    g.position.copy(pos);
    g.rotation.y = Math.atan2(n.x, n.z);
    f.add(g);
    const seen = () => (F().chartSeen ||= {});
    f.interact({
      id: 'chart', pos, radius: 0.35,
      label: () => (seen()[f.key] && seen()[f.key] !== chartText().core ? '[E] Read the patient chart (fresh ink)' : '[E] Read the patient chart'),
      use: () => {
        const { text, core } = chartText();
        seen()[f.key] = core;
        audio.play('pickup_paper', { volume: 0.6 });
        const title = 'Patient chart #16';
        const read = (ctx.save.notesRead ||= []);
        const kept = read.find((r) => r.title === title);
        if (kept) kept.text = text; else read.push({ title, text }); // (the journal keeps the latest version)
        ctx.overlay((close) => ui.note(title, text, close));
      },
    });
  }

  // ---------------------------------------------------------------- Dr. Voss's door code, scrawled on a wall
  // big enough to read in your torchlight. A new code every game, on a wall inside one of the rooms (never the
  // corridors): operating room 1, operating room 2, the ICU, storage, records.
  const CODE_SPOTS = [[6, 0, 'south'], [15, 0, 'south'], [20, 9, 'west'], [21, 8, 'east'], [37, 9, 'west']];
  function doorCode() {
    const f = ctx.floor;
    if (F().codeSpot === undefined || F().codeSpot >= CODE_SPOTS.length) F().codeSpot = Math.floor(Math.random() * CODE_SPOTS.length);
    const [x, z, face] = CODE_SPOTS[F().codeSpot];
    const c = cellPos(x, z).setY(1.55);
    const at = { south: [c.clone().setZ((z + 1) * 2 + 0.05), 0], north: [c.clone().setZ(z * 2 - 0.05), Math.PI],
      east: [c.clone().setX((x + 1) * 2 + 0.05), Math.PI / 2], west: [c.clone().setX(x * 2 - 0.05), -Math.PI / 2] }[face];
    f.decal(T.writingTex(ctx.doorCode().split('').join(' ')), 2.0, 0.6, at[0], 0, at[1]);
  }

  // ---------------------------------------------------------------- per floor
  const FLOORS = {
    F1() {
      chart({ at: [10, 5], face: 'north' });                               // a few steps from where you start
      footprints([[11, 6], [21, 6], [21, 10]]);                            // from where she was taken, into the side hall... then nothing
      wheelchair({ from: [15, 8], to: [15, 5], trigger: [8, 13, 5, 6], flag: 'wheelchairF1' });
      mirror({ at: [40, 11], area: [39, 41, 11, 14], flag: 'mirrorF1' }); // the restroom
      above({ area: [1, 28, 5, 6], flag: 'aboveF1', when: () => ctx.save.chapter === 1 && !monster.group.visible }); // the main corridor
    },
    B1() {
      chart({ at: [6, 2], face: 'north' });                                // at the foot of the stairs
    },
    F2() {
      chart({ at: [3, 7], face: 'east' });                                 // by the stairs
      phone({ at: [16, 7], face: 'north', trigger: [12, 24, 4, 9], flag: 'phoneF2' }); // the nurse station
      wheelchair({ from: [33, 8], to: [33, 12], trigger: [26, 36, 7, 12], flag: 'wheelchairF2' });
      vent({ at: [11, 7], face: 'north', range: 12 });                      // the playroom
      above({ area: [1, 37, 4, 5], flag: 'aboveF2', when: () => !F().musicbox && !monster.group.visible }); // the front corridor, while the music plays
    },
    F3() {
      chart({ at: [3, 7], face: 'east' });                                 // by the stairs
      doorCode();
      vent({ at: [12, 7], face: 'north', range: 14 });                      // the ICU
      phone({ at: [31, 7], face: 'north', trigger: [30, 36, 4, 11], flag: 'phoneF3' }); // records
    },
    F4() {
      chart({ at: [4, 4], face: 'north' });                                // just in from the stairs
      footprints([[17, 4], [17, 6], [17, 8]]);                              // small prints, into the theatre
    },
  };

  return {
    enterFloor(key) {
      loops.forEach((stop) => stop());
      loops = [];
      active = [];
      stepHook = null;
      if (FLOORS[key]) FLOORS[key]();
    },
    update(dt) { active = active.filter((fn) => !fn(dt)); },
    step() { if (stepHook) stepHook(); },
    reset() { loops.forEach((stop) => stop()); loops = []; active = []; stepHook = null; },
  };
}
