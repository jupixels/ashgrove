// The story: chapters, objectives, where the stairs lead, every scripted scare, and the endings.
//
//  1. Admitted          1F    the lockdown console is dead: power runs through the basement
//  2. Cold Storage      B1    pull the breaker, take the RED keycard off Dr. Harlan. Drawer 13.
//  3. Lullaby           2F    the music box; the BLUE keycard; what the phone camera sees in the corner
//  4. One Heartbeat     3F    the ICU monitors; Voss's office (code 1031); the BLACK keycard; the elevator
//  5. Leaving So Soon   1F    lift the lockdown; the door is welded; "Maya" in the restroom; run upstairs
//  6. Ward C            4F    free Maya (or don't), the ceiling, the roof, the fire escape
import * as THREE from 'three';
import { FLOORS, CHAPTERS, TAPE_LINES, TAPE_COUNT } from './floors.js';

const STOP = Symbol('stop');
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const cellPos = (x, z) => V(x * 2 + 1, 0, z * 2 + 1);

export function createStory(ctx) {
  const { audio, ui, player, monster, maya } = ctx;
  const S = () => ctx.save;
  const F = () => S().flags;
  const floor = () => ctx.floor;
  const story = { time: 0, gen: 0, dying: false };
  let waits = [];
  const loops = {}; // positional sound loops: { name: { loop, pos, range, base } }

  // ---------------------------------------------------------------- helpers
  const wait = (s) => new Promise((res) => waits.push({ t: story.time + s, res }));
  // run a scripted sequence; it quietly stops if the floor changes or you die
  let running = 0, runningGen = 0; // scenes playing right now (on this floor)
  function scene(fn) {
    const gen = story.gen;
    if (runningGen !== gen) { running = 0; runningGen = gen; }
    running++;
    const w = async (s) => { await wait(s); if (gen !== story.gen) throw STOP; };
    fn(w).catch((e) => { if (e !== STOP) console.error(e); }).finally(() => { if (runningGen === gen) running--; });
  }
  story.busy = () => story.dying || (runningGen === story.gen && running > 0);
  const len = (name, guess) => (audio.buffers && audio.buffers[name] ? audio.buffers[name].duration : guess);
  function voice(name, who, text, guess = 3, cls = '') {
    const s = audio.play(name, { volume: 1 });
    ui.say(who, text, (len(name, guess) + 0.5) * 1000, cls);
    return s;
  }
  function walkie(name, text, guess = 4) {
    audio.play('walkie_static', { volume: 1 }); // the walkie crackling on
    setTimeout(() => voice(name, 'Maya (walkie)', text, guess, 'whisper'), 500);
  }
  function objective(text) { S().objective = text; ui.objective(text); }
  const scare = (power = 1) => {
    audio.play(Math.random() < 0.5 ? 'jumpscare_sting_1' : 'jumpscare_sting_2', { volume: power });
    ctx.fx.shake = power;
    ctx.fx.aberration = ctx.settings.reduceFlashing ? 0.4 : 1.6 * power;
  };
  const blackout = (s) => { floor().blackout = ctx.settings.reduceFlashing ? Math.min(s, 0.3) : s; audio.play('flicker', { volume: 0.8 }); };
  const inCells = (x0, x1, z0, z1) => {
    const [x, z] = floor().cellOf(player.position);
    return x >= x0 && x <= x1 && z >= z0 && z <= z1;
  };
  // a point in front of (or behind) the camera, on the floor
  function aheadOf(dist, side = 0) {
    const f = player.forward();
    f.y = 0;
    f.normalize();
    const r = V(-f.z, 0, f.x);
    return player.position.clone().addScaledVector(f, dist).addScaledVector(r, side).setY(0);
  }
  function loop(name, pos, range, base = 0.8) {
    if (loops[name]) return;
    const l = audio.loop(name, 0, range < 1e8 ? pos : null); // placed in the world (chase music isn't)
    loops[name] = { loop: l, pos, range, base };
  }
  function stopLoop(name) { if (loops[name]) { loops[name].loop.stop(1); delete loops[name]; } }
  function stopAllLoops() { for (const k in loops) stopLoop(k); }
  function chapter(n) {
    if (S().chapter < n) S().chapter = n;
    if (F()[`card${n}`]) return;
    F()[`card${n}`] = true;
    ui.chapter(CHAPTERS[n].title, FLOORS[CHAPTERS[n].floor].name.toUpperCase());
  }
  const keycardCount = () => ['red', 'blue', 'black'].filter((k) => F()[k]).length;

  // ---------------------------------------------------------------- arriving on a floor
  story.enterFloor = (key, how) => {
    story.gen++;
    waits = [];
    stopAllLoops();
    story.dying = false;
    const f = floor();
    f.onUse = use;
    f.onPickup = pickup;
    monster.setFloor(f);
    if (key !== 'F4' && key !== 'ROOF') maya.group.visible = false;
    ui.keycards(F());

    if (key === 'F1') {
      f.setPower(!!F().power);
      if (F().consoleDone) f.objects.console.slots.forEach((s) => s.material.color.set(0x10a010));
      if (S().chapter >= 5) {
        chapter(5);
        if (F().welded) f.emergency = true;
        if (how === 'elevator' && !F().woke) {
          F().woke = true;
          ui.message('You wake up on the elevator floor. The doors are open. You are back on the ground floor.', 5000);
          scene(async (w) => { await w(5.5); objective('Insert the three keycards at the security console.'); });
        } else objective(S().objective || 'Insert the three keycards at the security console.');
        if (F().fakeMayaDone) monster.startAI({ avoid: player.position });
      } else {
        objective(F().power ? 'The stairwell has power now. Go upstairs.' : S().objective || 'Find a way to lift the lockdown.');
      }
    } else if (key === 'B1') {
      chapter(2);
      f.setPower(!!F().power);
      if (F().power) f.objects.boiler.glow.intensity = 3;
      monster.startAI({ avoid: player.position });
      objective(!F().power ? 'Restore the power: the boiler room is down here.' : !F().red ? "Find the red keycard. Dr. Harlan's body is in the morgue." : 'Go back upstairs.');
    } else if (key === 'F2') {
      chapter(3);
      if (!F().musicbox) {
        loop('music_box_lullaby', f.objects.musicbox.pos, 26, 0.9);
        f.objects.musicbox.playing = true;
        objective('Find the blue keycard. Someone is playing music down here.');
      } else {
        monster.startAI({ avoid: player.position });
        objective(F().blue ? 'Go upstairs to surgery.' : 'Get the blue keycard from the nurse station.');
      }
    } else if (key === 'F3') {
      chapter(4);
      monster.startAI({ avoid: player.position });
      objective(F().black ? 'Take the elevator down to the security office.' : "Find the black keycard. Dr. Voss's office is on this floor.");
    } else if (key === 'F4') {
      chapter(6);
      if (!F().mayaFreed) {
        placeMayaOnTable();
        loop('stitching_sound', f.objects.mayaTable.pos.clone().setY(1), 14, 0.9);
        scene(async (w) => { await w(2); walkie('maya_walkie_3', "It's coming back. I can hear the tubes dragging. Please hurry.", 4); });
        objective('Find Maya. The operating theatre.');
      } else {
        mayaFollowStart(player.position);
        objective('Get Maya to the roof. The stairs are at the end of the ward.');
      }
      monster.startAI({ avoid: player.position });
    } else if (key === 'ROOF') {
      ctx.scene.background = new THREE.Color(0x4a3a4a);
      ctx.scene.fog.color.set(0x4a3a4a);
      ctx.scene.fog.density = 0.02;
      if (F().mayaFreed) mayaFollowStart(player.position.clone().add(V(0, 0, -1.5)));
      objective('Dawn. The fire escape, on the far edge of the roof.');
      scene(async (w) => {
        await w(3);
        monster.show(cellPos(2, 1), player.position); // it stops in the doorway, out of the light
        monster.mode = 'script';
        monster.anim('idle');
        audio.play('monster_breathing', { volume: 0.6 });
        ui.message("It stops in the doorway. It won't come out into the light.", 4000);
        await w(6);
        monster.group.visible = false;
      });
    }
  };

  // ---------------------------------------------------------------- pickups
  function pickup(kind, data, id) {
    const f = floor();
    if (kind === 'battery') { player.addBattery(); ui.message('Fresh batteries.', 1800); }
    else if (kind === 'note') {
      audio.play('pickup_paper', { volume: 0.8 });
      const n = f.def.notes[data.n];
      if (n) ctx.overlay((close) => ui.note(n.title, n.text, close));
    } else if (kind === 'tape') {
      const name = f.def.tapes[data.n];
      if (!name) return;
      if (!S().tapes.includes(name)) S().tapes.push(name);
      audio.play('cassette_insert_play', { volume: 0.7 });
      setTimeout(() => voice(name, `Dr. Voss (tape ${S().tapes.length}/${TAPE_COUNT})`, TAPE_LINES[name], 10, 'whisper'), 900);
    } else if (kind === 'keycard') {
      F()[data.key] = true;
      audio.play('keycard_beep', { volume: 0.6 });
      ui.keycards(F());
      ui.message(`${data.key.toUpperCase()} keycard. (${keycardCount()}/3)`, 2500);
      if (f.key === 'B1') objective(F().power ? 'Go back upstairs. The stairwell has power now.' : 'Now the power: the boiler room.');
      if (f.key === 'F2') { if (!F().musicbox) musicBoxStops(); else objective('Go upstairs to surgery.'); }
      if (f.key === 'F3') objective('Take the elevator at the end of the hall down to the security office.');
    }
    ctx.saveTaken(id);
  }

  // ---------------------------------------------------------------- using things
  function use(kind, data) {
    const f = floor();
    const key = f.key;
    if (kind === 'door') { data.openNow(); return; }
    if (kind === 'keypad') {
      ctx.overlay((close) => ui.keypad(data.label || 'Keypad', (code) => {
        if (code === data.code) { audio.play('keycard_beep', { volume: 0.7 }); data.locked = false; data.openNow(); return true; }
        audio.play('keycard_denied', { volume: 0.7 });
        return false;
      }, close));
      return;
    }
    if (kind === 'locker') { player.hide(data); return; }
    if (kind === 'payphone') {
      audio.play('walkie_static', { volume: 0.15 });
      ctx.checkpoint({ x: player.position.x, z: player.position.z, yaw: player.yaw() });
      ui.message('No dial tone. Just breathing on the line... (progress saved)', 3500);
      return;
    }
    if (kind === 'stairs') return stairs(key, data);
    const handler = USES[kind];
    if (handler) handler(f);
  }

  function stairs(key, dir) {
    const locked = (text) => { audio.play('door_locked_rattle', { volume: 0.8 }); ui.message(text, 3200); };
    if (key === 'F1') {
      if (dir === 'down') return S().chapter >= 5 ? locked('No. Up. Ward C is the only way now.') : ctx.changeFloor('B1', 'fromAbove');
      if (!F().power) return locked('The stairwell door is magnetically sealed. No power.');
      if (S().chapter >= 5) {
        if (!F().fakeMayaDone) return locked('Maya. Find Maya first.');
        ui.message('You run up past the second and third floors. Their doors are welded shut.', 4000);
        return ctx.changeFloor('F4', 'fromBelow');
      }
      return ctx.changeFloor('F2', 'fromBelow');
    }
    if (key === 'B1') return ctx.changeFloor('F1', 'fromBelow');
    if (key === 'F2') return ctx.changeFloor(dir === 'up' ? 'F3' : 'F1', dir === 'up' ? 'fromBelow' : 'fromAbove');
    if (key === 'F3') return dir === 'up' ? locked('The stairs up have caved in.') : ctx.changeFloor('F2', 'fromAbove');
    if (key === 'F4') return dir === 'up' ? ctx.changeFloor('ROOF', 'fromBelow') : locked('No going back.');
    if (key === 'ROOF') return locked('No.');
  }

  const USES = {
    console(f) {
      if (!F().power) {
        ui.message('The console is dead. No power.', 3000);
        if (!F().power) objective('Restore the power. The security log said it runs through the basement boiler room.');
        return;
      }
      if (F().consoleDone) { ui.message('LOCKDOWN LIFTED.', 2000); return; }
      const have = ['red', 'blue', 'black'].map((k) => `${k.toUpperCase()} ${F()[k] ? '■' : '□'}`).join('   ');
      if (keycardCount() < 3) {
        audio.play('keycard_denied', { volume: 0.6 });
        ui.message(`LOCKDOWN ACTIVE — insert director keycards:   ${have}`, 4500);
        if (!F().red) objective('Find the red keycard. Try the basement.');
        else if (!F().blue) objective('Find the blue keycard. Pediatrics, upstairs.');
        else objective('Find the black keycard. Surgery, on the third floor.');
        return;
      }
      scene(async (w) => {
        player.frozen = true;
        for (const s of f.objects.console.slots) { s.material.color.set(0x10a010); audio.play('keycard_beep', { volume: 0.8 }); await w(0.6); }
        f.objects.console.screen.material.color.set(0x103a18);
        ui.message('LOCKDOWN LIFTED. EXITS RELEASED.', 3500);
        audio.play('metal_shutter_slam', { volume: 0.7 });
        F().consoleDone = true;
        player.frozen = false;
        objective('Get out. The main entrance is in the lobby.');
        ctx.checkpoint({ x: player.position.x, z: player.position.z, yaw: player.yaw() });
      });
    },
    exit(f) {
      if (!F().consoleDone) { audio.play('door_locked_rattle', { volume: 0.8 }); ui.message('The shutters are down. QUARANTINE.', 3000); return; }
      if (F().welded) { ui.message('Welded shut. From the outside.', 2500); return; }
      F().welded = true;
      scene(async (w) => {
        audio.play('door_locked_rattle', { volume: 1 });
        ui.message('The shutters are up... but the doors behind them are welded shut. From the outside.', 4000);
        await w(4.5);
        audio.play('pa_crackle', { volume: 0.8 });
        voice('voss_leaving', 'Dr. Voss (PA)', "Leaving so soon? But we've only just admitted you.", 4, 'whisper');
        await w(1.5);
        f.emergency = true;
        audio.play('lights_slam_on', { volume: 0.8 });
        await w(len('voss_leaving', 4) + 2.5);
        walkie('maya_fake', "Sam! I got free! I'm in the bathroom on one, come get me!", 5);
        F().walkieFake = true;
        await w(5);
        objective('Find Maya: the restroom on this floor, past the cafeteria.');
      });
    },
    vending(f) {
      const v = f.objects.vending;
      if (v.done) return;
      v.done = true;
      scene(async (w) => {
        ui.message('You reach under the machine...', 1500);
        await w(1.3);
        // the glass bursts and an arm grabs at you
        audio.play('glass_shatter_grab', { volume: 1 });
        scare(1);
        v.glassFront.visible = false;
        const arm = new THREE.Group();
        const skin = new THREE.MeshLambertMaterial({ color: 0xb8a890 });
        arm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.7, 6), skin));
        arm.children[0].rotation.x = Math.PI / 2;
        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.16), skin);
        hand.position.z = 0.4;
        arm.add(hand);
        arm.position.copy(v.front).setY(1.2);
        arm.lookAt(player.position);
        f.group.add(arm);
        const start = arm.position.clone();
        const end = start.clone().lerp(player.position, 0.5);
        for (let i = 0; i <= 6; i++) { arm.position.lerpVectors(start, end, i / 6); await w(0.025); }
        await w(0.7);
        for (let i = 0; i <= 10; i++) { arm.position.lerpVectors(end, start, i / 10); await w(0.04); }
        f.group.remove(arm);
        player.addBattery();
        ui.message('...a corpse, wired up behind the glass. Your heart will not slow down. (Fresh batteries.)', 4000);
      });
    },
    elevator(f) {
      if (f.key === 'F1') { audio.play('door_locked_rattle', { volume: 0.6 }); ui.message("It's stuck somewhere above.", 2500); return; }
      if (!F().black) { ui.message("It won't move without a director's keycard.", 3000); return; }
      scene(async (w) => {
        player.frozen = true;
        player.setPhone(false);
        ctx.fx.fadeTarget = 1;
        audio.play('elevator_ding_broken', { volume: 0.9 });
        await w(1.2);
        ui.message('The doors grind shut. The elevator lurches down.', 3000);
        await w(3);
        // the lights come back for a moment: it's in here with you
        monster.mode = 'script';
        monster.show(aheadOf(0.9), player.position);
        monster.anim('attack', { fade: 0.05, speed: 1.4, once: true });
        ctx.fx.fade = 0.25;
        ctx.fx.fadeTarget = 0.25;
        ctx.fx.red = 0.5;
        audio.play('monster_scream', { volume: 1 });
        scare(1);
        await w(0.7);
        ctx.fx.fade = 1;
        ctx.fx.fadeTarget = 1;
        monster.group.visible = false;
        await w(2.5);
        S().chapter = 5;
        player.frozen = false;
        ctx.changeFloor('F1', 'elevator');
      });
    },
    fakeMaya(f) {
      const o = f.objects.fakeMaya;
      if (o.opened) return;
      if (!F().walkieFake) { audio.play('door_locked_rattle', { volume: 0.7 }); ui.message('Locked from the inside. Something drips under the door.', 3000); return; }
      o.opened = true;
      scene(async (w) => {
        o.door.rotation.y = -1.4;
        o.door.position.set(-0.9, 1.0, 0.6);
        // a puppet: Maya's orange top stretched over something that isn't Maya
        const g = new THREE.Group();
        const shirt = new THREE.MeshLambertMaterial({ color: 0xd06020 });
        const pale = new THREE.MeshLambertMaterial({ color: 0x9a8a7a });
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.6, 6), shirt);
        torso.position.y = 0.9;
        torso.rotation.z = 0.35;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), pale);
        head.position.set(0.2, 1.25, 0);
        const hair = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), new THREE.MeshLambertMaterial({ color: 0xb08a40 }));
        hair.position.set(0.22, 1.3, -0.03);
        g.add(torso, head, hair);
        g.position.copy(o.pos).setX(o.pos.x + 0.5);
        f.group.add(g);
        scare(0.8);
        ui.message("It's not Maya. It's her shirt, stretched over... something.", 3500);
        await w(1.6);
        // it drops through the ceiling behind you
        audio.play('monster_ceiling_burst', { volume: 1 });
        monster.mode = 'script';
        const spot = aheadOf(-3.2);
        monster.show(spot, player.position);
        monster.anim('roar', { fade: 0.05, once: true });
        for (let i = 0; i <= 8; i++) { monster.group.position.y = 2.6 * (1 - i / 8); await w(0.03); }
        audio.play('monster_scream', { volume: 1 });
        scare(1);
        F().fakeMayaDone = true;
        await w(1.4); // a head start
        monster.startAI({ at: monster.group.position.clone(), state: 'chase' });
        monster.lastSeen = player.position.clone();
        objective('RUN. Upstairs. Ward C is the only way out now.');
      });
    },
    drawer13(f) {
      const o = f.objects.drawer13;
      if (o.opened) return;
      o.opened = true;
      scene(async (w) => {
        audio.play('drawer_morgue_slide', { volume: 0.9 });
        for (let i = 0; i <= 10; i++) { o.drawer.position.x = o.pos.x + 0.03 + i * 0.07; await w(0.04); }
        ui.message('Empty. Still warm.', 2000);
        await w(1.2);
        // it is right behind you
        monster.mode = 'script';
        monster.show(aheadOf(-0.95), player.position);
        monster.anim('idle', { fade: 0 });
        audio.play('monster_breathing', { volume: 1 });
        for (let t = 0; t < 6 && player.facingFlat(monster.group.position) < 0.5; t += 0.1) await w(0.1);
        monster.group.lookAt(player.position.x, 0, player.position.z);
        monster.anim('roar', { fade: 0.05, speed: 1.3, once: true });
        audio.play('monster_scream', { volume: 1 });
        scare(1);
        await w(0.9);
        blackout(1.2);
        await w(0.15);
        monster.group.visible = false;
        await w(2.5);
        monster.startAI({ avoid: player.position });
      });
    },
    lever(f) {
      const o = f.objects.lever;
      if (o.pulled) return;
      o.pulled = true;
      o.handle.rotation.x = -0.6;
      F().power = true;
      f.setPower(true);
      f.objects.boiler.glow.intensity = 3;
      audio.play('lights_slam_on', { volume: 1 });
      audio.play('boiler_room', { volume: 0.4 });
      ctx.noise(player.position.clone(), 40);
      ui.message("The boiler roars to life. That was LOUD. Something heard it.", 3500);
      scene(async (w) => {
        await w(3);
        audio.play('pa_crackle', { volume: 0.6 });
        voice('pa_doctor_call', 'PA', 'Doctor Voss to Ward C. Doctor Voss to Ward C.', 4, 'whisper');
      });
      objective(F().red ? 'Go back upstairs. The stairwell has power now.' : "Now the red keycard. Dr. Harlan's body is in the morgue.");
      ctx.checkpoint(null); // the power stays on even if you die
    },
    musicbox() { musicBoxStops(); },
    mayaTable(f) {
      const o = f.objects.mayaTable;
      if (o.freed) return;
      o.freed = true;
      F().mayaFreed = true;
      stopLoop('stitching_sound');
      scene(async (w) => {
        voice('sam_found_maya', 'Sam', "Maya! I'm here, I've got you. Hold still.", 2.5);
        maya.group.rotation.set(0, 0, 0);
        maya.group.position.copy(o.pos).add(V(-1.1, 0, 0));
        maya.group.lookAt(player.position.x, 0, player.position.z);
        maya.play('scared');
        await w(len('sam_found_maya', 2.5));
        voice('maya_rescued', 'Maya', 'You came back. You actually came back. Go, GO, it\'s right behind us!', 4);
        await w(1.5);
        voice('sam_run', 'Sam', 'RUN! Up the stairs, GO!', 1.5);
        mayaFollowStart(maya.group.position);
        monster.startAI({ at: monster.mode === 'ai' ? monster.group.position.clone() : undefined, avoid: player.position, state: 'chase' });
        monster.lastSeen = player.position.clone();
        objective('Get Maya to the roof! The stairs at the far end of the ward.');
      });
    },
    fireEscape() {
      ctx.end(F().mayaFreed ? 'together' : 'escaped');
    },
  };

  // 2F: the music box stops on its own (or you shut it). Then the lights go, and it comes.
  function musicBoxStops() {
    if (F().musicbox) return;
    F().musicbox = true;
    const f = floor();
    f.objects.musicbox.playing = false;
    f.objects.musicbox.done = true;
    stopLoop('music_box_lullaby');
    scene(async (w) => {
      await w(1.8);
      blackout(1.5);
      await w(1.2);
      monster.startAI({ avoid: player.position, state: 'chase' });
      monster.lastSeen = player.position.clone();
      audio.play('monster_growl_distant', { volume: 1 });
      objective(F().blue ? 'HIDE. Then go upstairs to surgery.' : 'HIDE. Then get the blue keycard from the nurse station.');
    });
  }

  // ---------------------------------------------------------------- Maya in Ward C
  let mayaFollowing = false, mayaPath = [], mayaRepath = 0;
  function placeMayaOnTable() {
    const o = floor().objects.mayaTable;
    maya.group.visible = true;
    maya.group.position.copy(o.pos).setY(0.92);
    maya.group.rotation.set(-Math.PI / 2, 0, 0);
    maya.play('idle');
    mayaFollowing = false;
  }
  function mayaFollowStart(pos) {
    maya.group.visible = true;
    maya.group.rotation.set(0, 0, 0);
    maya.group.position.set(pos.x, 0, pos.z);
    mayaFollowing = true;
    mayaPath = [];
  }
  function updateMaya(dt) {
    if (!maya.group.visible) return;
    maya.mixer.update(dt);
    if (!mayaFollowing) return;
    const f = floor();
    const g = maya.group.position;
    const d = Math.hypot(player.position.x - g.x, player.position.z - g.z);
    if (d > 2.2) {
      mayaRepath -= dt;
      if (!mayaPath.length || mayaRepath <= 0) { mayaPath = f.route(f.cellOf(g), f.cellOf(player.position)).slice(1); mayaRepath = 0.5; }
      const next = mayaPath.length > 1 ? f.cellCenter(...mayaPath[0]) : player.position.clone().setY(0);
      const dir = V(next.x - g.x, 0, next.z - g.z);
      const step = dir.length();
      if (step < 0.25 && mayaPath.length) mayaPath.shift();
      else {
        dir.normalize();
        const speed = d > 6 ? 4.4 : 2.6;
        g.addScaledVector(dir, Math.min(step, speed * dt));
        maya.group.rotation.y = Math.atan2(dir.x, dir.z);
        maya.play('walk', speed / 2.4);
        const door = mayaPath.length ? f.doorAt(...mayaPath[0]) : null;
        if (door && !door.open) door.openNow(false);
      }
    } else {
      maya.play(monster.mode === 'ai' && monster.state === 'chase' ? 'scared' : 'idle');
      maya.group.lookAt(player.position.x, 0, player.position.z);
    }
  }

  // ---------------------------------------------------------------- 1F sightings (chapter 1): it just stands there
  const SIGHTINGS = [
    { id: 1, area: [6, 12, 1, 3], at: [8, 5], behind: true },     // patient room: watching from the hall when you turn round
    { id: 2, area: [22, 24, 8, 10], at: [23, 7], behind: true },  // the staff room doorway
    { id: 3, area: [29, 37, 8, 12], at: [31, 7], behind: true },  // the cafeteria doorway
  ];
  const sight = { current: null, timer: 0, lit: 0, look: 0, cooldown: 0 };
  function updateSightings(dt) {
    sight.cooldown -= dt;
    if (sight.current) {
      sight.timer += dt;
      monster.group.lookAt(player.position.x, 0, player.position.z);
      const dist = monster.distanceTo(player.position);
      // the ones that wait behind you: turn and see it, and it holds your stare a moment... then screams and is gone
      const staring = player.facingFlat(monster.group.position) > 0.88 && dist < 16;
      sight.look = staring ? sight.look + dt : Math.max(0, sight.look - dt * 0.5);
      if (sight.current.behind && sight.look > 1.3) {
        sight.current = null;
        sight.cooldown = 8;
        scare(0.9);
        blackout(0.25);
        monster.group.visible = false;
        monster.mode = 'off';
        return;
      }
      if (player.facingFlat(monster.group.position) > 0.93 && player.flashOn && dist < 14) sight.lit += dt;
      if (sight.lit > 1.6 || dist < 3.2 || sight.timer > 12) {
        sight.current = null;
        sight.cooldown = 8;
        blackout(0.45);
        if (Math.random() < 0.5) audio.play('monster_growl_distant', { volume: 0.6 });
        setTimeout(() => { if (monster.mode === 'script') monster.group.visible = false; }, 120);
      }
      return;
    }
    if (monster.group.visible || sight.cooldown > 0) return;
    for (const s of SIGHTINGS) {
      const i = s.id;
      if (F()[`sight${i}`] || !inCells(...s.area)) continue;
      const pos = cellPos(...s.at);
      if (s.behind && player.facingFlat(pos) > -0.2) continue;
      F()[`sight${i}`] = true;
      sight.current = s;
      sight.timer = sight.lit = sight.look = 0;
      monster.mode = 'script';
      monster.show(pos, player.position);
      monster.anim('idle', { fade: 0 });
      audio.play(['monster_drag_tubes', 'monster_clicking', 'monster_humming'][i % 3], { volume: 0.45 });
      break;
    }
  }

  // ---------------------------------------------------------------- 2F: the corner of the playroom, through the phone
  const corner = { state: 'idle', seenT: 0 };
  player.onPhone = (up) => {
    if (!floor() || floor().key !== 'F2' || F().cornerDone) return;
    if (!up && corner.state === 'shown' && corner.seenT > 0.5) { corner.state = 'armed'; monster.group.visible = false; }
    else if (up && corner.state === 'armed') { // raise it again: it's in your face
      F().cornerDone = true;
      corner.state = 'done';
      scene(async (w) => {
        monster.mode = 'script';
        monster.phoneOnly(true);
        monster.show(aheadOf(0.75), player.position);
        monster.anim('attack', { fade: 0.05, speed: 1.3, once: true });
        audio.play('monster_scream', { volume: 1 });
        scare(1);
        await w(0.75);
        monster.group.visible = false;
        monster.phoneOnly(false);
        monster.mode = 'off';
      });
    }
  };
  function updateCorner(dt) {
    if (F().cornerDone || F().musicbox) return;
    const inPlayroom = inCells(5, 13, 7, 12);
    if (corner.state === 'idle' && inPlayroom) {
      corner.state = 'shown';
      corner.seenT = 0;
      monster.mode = 'script';
      monster.phoneOnly(true); // only the camera can see it
      monster.show(V(26.6, 0, 14.6), player.position);
      monster.anim('idle', { fade: 0 });
    }
    if (corner.state === 'shown') {
      monster.group.lookAt(player.position.x, 0, player.position.z);
      if (player.phoneUp && player.facing(monster.group.position.clone().setY(1.6)) > 0.93) corner.seenT += dt;
      if (!inPlayroom) { corner.state = 'idle'; monster.group.visible = false; monster.phoneOnly(false); monster.mode = 'off'; }
    }
    if (corner.state === 'armed' && !inPlayroom) { corner.state = 'idle'; monster.phoneOnly(false); monster.mode = 'off'; }
  }

  // ---------------------------------------------------------------- 3F: the ICU monitors beat with your steps, then flatline
  let icuBeats = -1;
  player.onStep = () => {
    if (icuBeats < 0 || !floor() || floor().key !== 'F3') return;
    audio.play('heart_monitor_beep', { volume: 0.9 });
    icuBeats++;
    if (icuBeats >= 7) {
      icuBeats = -1;
      audio.play('heart_monitor_flatline', { volume: 1 });
      blackout(0.5);
      ctx.noise(cellPos(12, 10), 40);
      ui.message('Every monitor flatlines at once.', 3000);
    }
  };

  // ---------------------------------------------------------------- 4F: it comes through the ceiling of the roof stairwell
  function updateCeiling() {
    if (F().ceilingDrop || !inCells(32, 34, 3, 6)) return;
    F().ceilingDrop = true;
    scene(async (w) => {
      audio.play('monster_ceiling_crawl', { volume: 0.9 });
      await w(0.4);
      audio.play('monster_ceiling_burst', { volume: 1 });
      monster.mode = 'script';
      const spot = cellPos(33, 2).add(V(0.9, 0, 0.6));
      monster.show(spot, player.position);
      monster.anim('roar', { fade: 0.05, once: true });
      ctx.fx.timeScale = 0.35; // slow motion as it lands
      for (let i = 0; i <= 8; i++) { monster.group.position.y = 2.6 * (1 - i / 8); await w(0.02); }
      audio.play('monster_scream', { volume: 1 });
      scare(1);
      await w(0.35);
      ctx.fx.timeScale = 1;
      ui.message('RUN PAST IT!', 1500);
      await w(1.2);
      monster.startAI({ at: monster.group.position.clone(), state: 'chase' });
      monster.lastSeen = player.position.clone();
    });
  }

  // ---------------------------------------------------------------- dying
  // getting caught: no slash from across the room. Its face lunges into yours, fills the screen and screams.
  let deathScare = null; // runs every frame while it plays
  story.caught = (how) => {
    if (story.dying) return;
    story.dying = true;
    story.gen++;
    stopAllLoops();
    sight.current = null;
    player.frozen = true;
    if (player.hidden) player.unhide();
    player.setPhone(false);
    const cam = ctx.camera, calm = ctx.settings.reduceFlashing;
    const dir = player.forward();
    dir.y = 0;
    dir.normalize();
    monster.mode = 'script';
    monster.show(aheadOf(1), player.position);
    monster.anim('idle', { fade: 0 }); // the body stays steady; only the head thrashes
    audio.play('jumpscare_sting_2', { volume: 1 });
    audio.play('jumpscare_sting_1', { volume: 0.8 });
    audio.play('monster_scream', { volume: 1 });
    ctx.clearView(true); // a sharper picture, and the camera effects toned down so the face reads clearly
    const text = { dragged: 'It saw where you hid.', breath: 'It heard you breathing.', caught: 'It caught you.' }[how] || 'It caught you.';
    const head = V(), want = V(), aim = V();
    let t = 0, twitchT = 0, nod = 0, turn = 0, tilt = 0;
    const power = calm ? 0.35 : 1;
    deathScare = (dt) => {
      t += dt;
      // from arm's length to right in your face in a blink, then it stays there and its head shakes violently
      const d = t < 0.13 ? 1.0 - 0.58 * (t / 0.13) ** 2 : 0.42;
      want.copy(cam.position).addScaledVector(dir, d);
      if (t < 0.2) { // the lunge carries the whole body in; after that it stays planted
        monster.group.lookAt(cam.position.x, monster.group.position.y, cam.position.z);
        monster.headPos(head);
        monster.group.position.add(want.clone().sub(head)); // move the body so its face lands right there
      }
      if (t > 0.13) {
        twitchT -= dt;
        if (twitchT <= 0) { // a new jerk every few frames: the head snaps side to side, not a smooth wobble
          twitchT = 0.035 + Math.random() * 0.045;
          turn = (Math.random() - 0.5) * 0.7 * power;
          nod = (Math.random() - 0.5) * 0.35 * power;
          tilt = (Math.random() - 0.5) * 0.5 * power;
        }
        monster.twistHead(nod, turn, tilt);
      }
      if (t < 0.2) { monster.headPos(head); aim.set(head.x, head.y + 0.06, head.z); } // follow the lunge, then hold still: it shakes, not you
      cam.lookAt(aim); // every frame, so moving the mouse can't look away
      // lit well from just in front and a little below, so every detail of the face shows
      monster.light = { intensity: 12, at: cam.position.clone().addScaledVector(dir, 0.15).setY(cam.position.y - 0.18) };
      // the usual effects, just lighter: a faint red, a little distortion with the odd glitch spike, a small shake
      ctx.fx.red = ctx.settings.lessGore ? 0.08 : 0.18 + 0.06 * Math.sin(t * 20);
      ctx.fx.aberration = calm ? 0.05 : (Math.random() < 0.08 ? 0.9 : 0.3);
      ctx.fx.shake = calm ? 0.08 : 0.3;
      if (t > 1.5) {
        deathScare = null;
        monster.light = null;
        monster.group.visible = false;
        ctx.clearView(false);
        ctx.fx.red = ctx.settings.lessGore ? 0.3 : 0.8; // the red flash comes as it cuts to black
        ctx.fx.fade = 1;
        ctx.fx.fadeTarget = 1;
        if (!ctx.settings.lessGore) audio.play('kill_grab_gore', { volume: 1 });
        setTimeout(() => ctx.died(text), 900);
      }
    };
  };

  // ---------------------------------------------------------------- per frame
  story.update = (dt) => {
    story.time += dt;
    const due = waits.filter((x) => x.t <= story.time);
    if (due.length) { waits = waits.filter((x) => x.t > story.time); due.forEach((x) => x.res()); }
    if (deathScare) { deathScare(dt); return; }
    const f = floor();
    if (!f) return;
    for (const k in loops) {
      const l = loops[k];
      if (l.loop.gain) {
        const d = player.position.distanceTo(l.pos);
        l.loop.gain.gain.value = l.base * THREE.MathUtils.clamp(1 - d / l.range, 0, 1) ** 1.5;
      }
    }
    if (f.key === 'F1' && S().chapter === 1) updateSightings(dt);
    if (f.key === 'F2') updateCorner(dt);
    if (f.key === 'F3' && !F().icu && inCells(5, 19, 7, 12)) { F().icu = true; icuBeats = 0; ui.message('The heart monitors are beeping. In time with your footsteps.', 3000); }
    if (f.key === 'F4') {
      updateCeiling();
      if (!F().mayaFreed && !F().mayaCalled && player.position.distanceTo(f.objects.mayaTable.pos.clone().setY(1.6)) < 9) {
        F().mayaCalled = true;
        voice('maya_table', 'Maya', "Sam?! Sam, get me off this thing! Cut the straps, hurry, it's coming back!", 5);
        objective('Cut Maya free. Hold E at the table.');
      }
    }
    updateMaya(dt);
    // chase music
    const chasing = monster.mode === 'ai' && monster.state === 'chase';
    if (chasing && !loops.chase_tension) loop('chase_tension', player.position, 1e9, 0.6);
    if (loops.chase_tension) {
      loops.chase_tension.pos = player.position;
      if (!chasing) stopLoop('chase_tension');
    }
  };

  // ---------------------------------------------------------------- endings
  story.endingCards = (kind) => {
    const s = S();
    const secs = Math.round((Date.now() - s.startedAt) / 1000);
    const time = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    const cards = kind === 'together' ? [
      ['You climb down the fire escape together as the sun comes up.', 4],
      ['At the edge of the light, it stops.\nIt can\'t follow you out.', 4.5],
      ['"We\'re out. We\'re actually out."', 4, () => audio.play('maya_together', { volume: 1 })],
      ["On Maya's phone, still recording, one more figure stands in a fourth-floor window.\n\nWaving.", 6],
      ['ENDING: TOGETHER', 3.5],
    ] : [
      ['You climb down the fire escape alone as the sun comes up.', 4],
      ["You don't look back.", 3],
      ['In the car, the dashcam turns itself on.', 3.5],
      ['"Why\'d you leave me, Sam?"', 4, () => audio.play('maya_left_behind', { volume: 1 })],
      ['ENDING: ESCAPED', 3.5],
    ];
    if (s.tapes.length >= TAPE_COUNT) {
      cards.push(['You found every one of Dr. Voss\'s tapes.', 3]);
      cards.push(['"I didn\'t run. I\'m still here. I\'m all of them now."', 5, () => audio.play('voss_tape_8', { volume: 1 })]);
      cards.push(['SECRET ENDING: HE NEVER LEFT', 3.5]);
    }
    cards.push([`Tapes found: ${s.tapes.length}/${TAPE_COUNT}\nTimes admitted: ${s.deaths}\nTime: ${time}`, 5]);
    return cards;
  };

  story.reset = () => { if (deathScare) ctx.clearView(false); deathScare = null; monster.light = null; story.gen++; waits = []; stopAllLoops(); mayaFollowing = false; corner.state = 'idle'; icuBeats = -1; sight.current = null; };
  return story;
}

export const CREDITS = `ASHGROVE


A game by
jupixels


Built with
Claude Code


Hospital models
Atomic Realm (atomicrealm.itch.io)

Medical props
Retro Assets Library

Horror textures
Screaming Brain Studios (CC0)

Characters & animation
Mixamo

Voices & sound effects
ElevenLabs

Engine
three.js


Thank you for playing.

Don't go to C.`;
