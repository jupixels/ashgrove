// Small moments on each floor, on top of the main story beats: a wheelchair that rolls out by itself, a phone that
// rings as you pass, a mirror with something standing behind you, a voice in the vents, and Maya's footprints in the
// blood that lead somewhere and just stop. Each happens once (remembered in the save's flags).
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

  // ---------------------------------------------------------------- per floor
  const FLOORS = {
    F1() {
      footprints([[11, 6], [21, 6], [21, 10]]);                            // from where she was taken, into the side hall... then nothing
      wheelchair({ from: [15, 8], to: [15, 5], trigger: [8, 13, 5, 6], flag: 'wheelchairF1' });
      mirror({ at: [40, 11], area: [39, 41, 11, 14], flag: 'mirrorF1' }); // the restroom
    },
    F2() {
      phone({ at: [16, 7], face: 'north', trigger: [12, 24, 4, 9], flag: 'phoneF2' }); // the nurse station
      wheelchair({ from: [33, 8], to: [33, 12], trigger: [26, 36, 7, 12], flag: 'wheelchairF2' });
      vent({ at: [11, 7], face: 'north', range: 12 });                      // the playroom
    },
    F3() {
      vent({ at: [12, 7], face: 'north', range: 14 });                      // the ICU
      phone({ at: [31, 7], face: 'north', trigger: [30, 36, 4, 11], flag: 'phoneF3' }); // records
    },
    F4() {
      footprints([[17, 4], [17, 6], [17, 8]]);                              // small prints, into the theatre
    },
  };

  return {
    enterFloor(key) {
      loops.forEach((stop) => stop());
      loops = [];
      active = [];
      if (FLOORS[key]) FLOORS[key]();
    },
    update(dt) { active = active.filter((fn) => !fn(dt)); },
    reset() { loops.forEach((stop) => stop()); loops = []; active = []; },
  };
}
