// Sam: walking, sprinting, crouching, the flashlight, hiding in lockers, holding your breath, the phone camera,
// and using things you look at. Movement makes noise the monster can hear.
import * as THREE from 'three';
import { PHONE_LAYER } from './world.js';

const EYE = 1.6, CROUCH_EYE = 1.0, RADIUS = 0.3;
const REACH = 2.4;

export function createPlayer({ camera, scene, audio, ui, settings, onNoise }) {
  const flashlight = new THREE.SpotLight(0xfff1d6, 30, 20, 0.62, 0.92, 1.3); // wide, with a long soft fade out to the edges
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.set(512, 512);
  flashlight.shadow.camera.near = 0.1;
  flashlight.shadow.bias = -0.0005;
  flashlight.shadow.normalBias = 0.05; // no striped self-shadowing on walls and floors seen at a glancing angle
  flashlight.position.set(0, -0.06, 0); // from the centre of your view
  camera.add(flashlight);
  const flashTarget = new THREE.Object3D();
  scene.add(flashTarget);
  flashlight.target = flashTarget;
  const flashAim = new THREE.Vector3();

  // Dust drifting through the air, only visible where the flashlight catches it.
  const BEAM = 7.5;
  // Each speck has its own slow air current, sways and tumbles, settles a little, and only glints now and then as
  // it turns in the light. Specks close to you are bigger and softer; it's sparse, like real dust in a torch beam.
  const DUST = 160, BOX = 8;
  const dustPos = new Float32Array(DUST * 3).map(() => Math.random() * BOX);
  const dustSeed = new Float32Array(DUST * 4).map(() => Math.random());
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('seed', new THREE.BufferAttribute(dustSeed, 4));
  const dustMat = new THREE.ShaderMaterial({
    uniforms: { strength: { value: 0 }, time: { value: 0 }, eye: { value: new THREE.Vector3() }, aim: { value: new THREE.Vector3(0, 0, -1) } },
    vertexShader: `uniform float strength, time; uniform vec3 eye, aim; attribute vec4 seed; varying float vA;
      void main(){
        float t = time;
        // a gentle draft through the building, plus this speck's own drift and a slow settle
        vec3 drift = vec3(0.05, -0.012, 0.025) + (seed.xyz - 0.5) * vec3(0.09, 0.04, 0.09);
        // lazy figure-of-eight swirls at speck-specific speeds
        float f = 0.25 + seed.w * 0.5;
        vec3 sway = vec3(sin(t * f + seed.x * 31.0), sin(t * f * 1.3 + seed.y * 17.0) * 0.6, cos(t * f * 0.8 + seed.z * 23.0)) * (0.12 + seed.w * 0.2);
        vec3 p = position + drift * t + sway;
        p = mod(p - eye + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) + eye - ${(BOX / 2).toFixed(1)}; // an endless field around you
        vec3 to = p - eye; float d = length(to);
        float inBeam = smoothstep(0.8, 0.95, dot(to / d, aim));
        // it only catches the light as it tumbles: a slow glint, not a steady glow
        float glint = 0.25 + 0.75 * pow(0.5 + 0.5 * sin(t * (1.5 + seed.w * 3.0) + seed.x * 40.0), 3.0);
        vA = inBeam * glint * (1.0 - smoothstep(1.5, 6.0, d)) * smoothstep(0.35, 0.9, d) * strength;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(3.2 / d, 1.0, 3.5) * (0.7 + seed.y * 0.6);
        vA /= gl_PointSize * 0.6; // big close specks are out of focus, so dimmer
      }`,
    fragmentShader: `varying float vA; void main(){
        if (vA < 0.02) discard;
        float r = length(gl_PointCoord - 0.5) * 2.0;
        gl_FragColor = vec4(vec3(1.0, 0.95, 0.85) * vA * (1.0 - r * r) * 0.85, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  dust.renderOrder = 11;
  scene.add(dust);

  const p = {
    floor: null,
    battery: 1, flashOn: true,
    stamina: 1, winded: false,
    breath: 1, breathHeld: false, gaspCooldown: 0,
    hidden: null,           // the locker you're in
    phoneUp: false,
    crouch: false, moving: false, sprinting: false,
    bob: 0, lastStepSign: 1,
    frozen: false,          // cutscenes and scripted moments
    holdT: 0, holdTarget: null,
    looked: null,
    keys: {},
  };

  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), tmp = new THREE.Vector3();

  function collides(x, z, r = RADIUS) {
    for (const s of p.floor.solids) if (x + r > s.minX && x - r < s.maxX && z + r > s.minZ && z - r < s.maxZ) return true;
    return false;
  }

  p.setFloor = (floor) => { p.floor = floor; };
  p.spawn = ({ x, z, yaw }) => {
    p.hidden = null;
    camera.position.set(x, EYE, z);
    camera.rotation.set(0, yaw, 0, 'YXZ');
    flashAim.copy(camera.position).add(new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).multiplyScalar(5));
    ui.locker(false);
  };
  p.position = camera.position;
  p.forward = (out = new THREE.Vector3()) => camera.getWorldDirection(out);
  // how directly you're looking at a point (1 = dead centre)
  p.facing = (pos) => {
    camera.getWorldDirection(tmp);
    const to = pos.clone().sub(camera.position).normalize();
    return tmp.dot(to);
  };
  p.facingFlat = (pos) => {
    camera.getWorldDirection(tmp);
    tmp.y = 0;
    tmp.normalize();
    const to = pos.clone().setY(0).sub(camera.position.clone().setY(0)).normalize();
    return tmp.dot(to);
  };

  // ---------------------------------------------------------------- input
  p.keyDown = (code) => {
    p.keys[code] = true;
    if (p.frozen) return;
    if (code === 'KeyF') toggleFlashlight();
    if (code === 'KeyE') p.useLooked();
    if (code === 'KeyQ') p.setPhone(!p.phoneUp);
  };
  p.keyUp = (code) => {
    p.keys[code] = false;
    if (code === 'KeyE') { p.holdT = 0; p.holdTarget = null; ui.hold(0); }
  };
  p.mouseDown = (button) => { if (button === 2 && !p.frozen) p.setPhone(!p.phoneUp); };

  function toggleFlashlight() {
    if (p.battery <= 0) return;
    p.flashOn = !p.flashOn;
    audio.play('flashlight_click', { volume: 0.7 });
  }

  p.setPhone = (up) => {
    if (p.phoneUp === up) return;
    p.phoneUp = up;
    if (up) { camera.layers.enable(PHONE_LAYER); audio.play('phone_camera_raise', { volume: 0.6 }); }
    else camera.layers.disable(PHONE_LAYER);
    camera.fov = up ? 58 : 70;
    camera.updateProjectionMatrix();
    ui.phone(up);
    if (p.onPhone) p.onPhone(up);
  };

  // ---------------------------------------------------------------- hiding
  p.hide = (locker) => {
    p.hidden = locker;
    p.setPhone(false);
    audio.play('locker_open', { volume: 0.6 });
    setTimeout(() => audio.play('locker_close_hide', { volume: 0.5 }), 350);
    camera.position.copy(locker.inside);
    camera.rotation.set(0, locker.yaw, 0, 'YXZ');
    locker.group.children.slice(1).forEach((slat) => (slat.visible = false)); // the overlay draws the slats from inside
    locker.group.children[0].castShadow = false; // or the locker you're standing in blocks your own light
    ui.locker(true);
  };
  p.unhide = () => {
    if (!p.hidden) return;
    const l = p.hidden;
    p.hidden = null;
    l.group.children.slice(1).forEach((slat) => (slat.visible = true));
    l.group.children[0].castShadow = true;
    audio.play('locker_open', { volume: 0.7 });
    camera.position.set(l.outside.x, EYE, l.outside.z);
    p.breathHeld = false;
    ui.locker(false);
    ui.breath(1, false);
  };

  // ---------------------------------------------------------------- what you're looking at
  function lookedAt() {
    camera.getWorldDirection(tmp);
    let best = null, bestT = REACH;
    for (const it of p.floor.interactables) {
      if (!it.enabled) continue;
      const v = it.pos.clone().sub(camera.position);
      const t = v.dot(tmp);
      if (t < 0 || t > bestT) continue;
      const perp = v.addScaledVector(tmp, -t).length();
      if (perp > it.radius) continue;
      const label = typeof it.label === 'function' ? it.label() : it.label;
      if (!label) continue;
      best = { it, label };
      bestT = t;
    }
    return best;
  }

  p.useLooked = () => {
    if (p.hidden) { p.unhide(); return; }
    const l = lookedAt();
    if (!l) return;
    if (l.it.hold) { p.holdTarget = l.it; p.holdT = 0; return; }
    l.it.use();
  };

  // ---------------------------------------------------------------- per frame
  p.update = (dt) => {
    const floor = p.floor;
    if (p.hidden) updateHidden(dt);
    else if (!p.frozen) updateMove(dt);
    updateFlashlight(dt);

    // interaction prompt and hold-to-use
    if (!p.frozen) {
      p.looked = p.hidden ? null : lookedAt();
      ui.prompt(p.hidden ? '[E] Leave the locker  ·  [Space] Hold your breath' : p.looked ? p.looked.label : '');
      if (p.holdTarget) {
        if (!p.looked || p.looked.it !== p.holdTarget || !p.keys.KeyE) { p.holdTarget = null; ui.hold(0); }
        else {
          p.holdT += dt;
          ui.hold(p.holdT / p.holdTarget.hold);
          if (p.holdT >= p.holdTarget.hold) { const it = p.holdTarget; p.holdTarget = null; ui.hold(0); it.use(); }
        }
      }
    } else ui.prompt('');

    // noisy floor things: trays you bump, glass you step on
    if (!p.hidden && floor) {
      for (const n of floor.noisy) {
        if (n.done) continue;
        n.cooldown = Math.max(0, (n.cooldown || 0) - dt);
        const d = Math.hypot(camera.position.x - n.pos.x, camera.position.z - n.pos.z);
        if (d > n.radius || !p.moving) continue;
        if (n.kind === 'tray' && !(p.crouch && !p.sprinting)) {
          n.trigger();
          audio.play('knock_over_tray', { volume: 1 });
          onNoise(n.pos, 16, 'tray');
        } else if (n.kind === 'glass' && !p.crouch && n.cooldown <= 0) {
          n.cooldown = 0.7;
          audio.play('glass_crunch_step', { volume: 0.8 });
          onNoise(n.pos, 9, 'glass');
        }
      }
    }
  };

  function updateMove(dt) {
    const k = p.keys;
    p.crouch = !!(k.ControlLeft || k.KeyC);
    const move = new THREE.Vector2((k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0), (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0));
    p.moving = move.lengthSq() > 0;
    if (p.stamina <= 0 && !p.winded) { p.winded = true; audio.play('breathing_scared', { volume: 0.7 }); }
    if (p.winded && p.stamina > 0.35) p.winded = false;
    p.sprinting = !!k.ShiftLeft && p.moving && !p.crouch && move.y > 0 && !p.winded;
    p.stamina = THREE.MathUtils.clamp(p.stamina + (p.sprinting ? -0.12 : p.winded ? 0.12 : 0.2) * dt, 0, 1); // ~8 s of sprint, back in ~5 s
    ui.stamina(p.stamina, p.winded);
    const speed = (p.crouch ? 1.1 : p.sprinting ? 4.6 : 2.2) * (p.phoneUp ? 0.8 : 1);

    if (p.moving) {
      move.normalize();
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      right.crossVectors(fwd, camera.up).normalize();
      const dx = (fwd.x * move.y + right.x * move.x) * speed * dt;
      const dz = (fwd.z * move.y + right.z * move.x) * speed * dt;
      if (!collides(camera.position.x + dx, camera.position.z)) camera.position.x += dx;
      if (!collides(camera.position.x, camera.position.z + dz)) camera.position.z += dz;
      p.bob += dt * speed * 2.6;
      const s = Math.sign(Math.sin(p.bob));
      if (s !== p.lastStepSign) {
        const pace = p.sprinting ? 'run' : p.crouch ? 'sneak' : 'walk';
        audio.footstep(pace);
        onNoise(camera.position.clone(), { run: 11, walk: 4.5, sneak: 1.2 }[pace], 'step');
        if (p.onStep) p.onStep();
      }
      p.lastStepSign = s;
    }
    const targetY = (p.crouch ? CROUCH_EYE : EYE) + (p.moving ? Math.sin(p.bob * 2) * (p.sprinting ? 0.06 : 0.035) : 0);
    camera.position.y += (targetY - camera.position.y) * Math.min(1, dt * 10);
  }

  // in a locker: look through the slats, hold your breath when it's close
  function updateHidden(dt) {
    p.moving = false;
    p.sprinting = false;
    p.gaspCooldown = Math.max(0, p.gaspCooldown - dt);
    const want = !!p.keys.Space && p.gaspCooldown <= 0;
    p.breathHeld = want && p.breath > 0;
    p.breath = THREE.MathUtils.clamp(p.breath + (p.breathHeld ? -dt / 7 : dt / 3), 0, 1);
    if (want && p.breath <= 0) { // out of air: you gasp
      p.breathHeld = false;
      p.gaspCooldown = 2.5;
      audio.play('hold_breath_gasp', { volume: 0.9 });
      onNoise(camera.position.clone(), 7, 'gasp');
    }
    ui.breath(p.breath, true, p.breathHeld);
    // keep the view roughly pointed out of the locker
    const e = camera.rotation;
    const dyaw = Math.atan2(Math.sin(e.y - p.hidden.yaw), Math.cos(e.y - p.hidden.yaw));
    if (Math.abs(dyaw) > 0.6) e.y = p.hidden.yaw + Math.sign(dyaw) * 0.6;
    e.x = THREE.MathUtils.clamp(e.x, -0.4, 0.4);
  }

  function updateFlashlight(dt) {
    if (p.flashOn) p.battery = Math.max(0, p.battery - dt / 240);
    if (p.battery <= 0) p.flashOn = false;
    let intensity = p.flashOn ? 30 : 0;
    if (p.flashOn && p.battery < 0.2 && Math.random() < 0.06) intensity *= Math.random() * 0.3;
    flashlight.intensity = intensity * (0.6 + p.battery * 0.4);
    camera.getWorldDirection(tmp);
    flashAim.lerp(camera.position.clone().add(tmp.multiplyScalar(5)), Math.min(1, dt * 9));
    flashTarget.position.copy(flashAim);
    // the dust follows the light (and fades with the battery)
    dustMat.uniforms.strength.value = flashlight.intensity / 30;
    dustMat.uniforms.time.value += dt;
    dustMat.uniforms.eye.value.copy(camera.position);
    dustMat.uniforms.aim.value.copy(flashAim).sub(camera.position).normalize();
    ui.battery(p.battery, p.battery < 0.35 || !p.flashOn);
  }

  p.addBattery = () => {
    p.battery = Math.min(1, p.battery + 0.55);
    audio.play('battery_insert', { volume: 0.8 });
  };
  p.flashlight = flashlight;
  return p;
}
