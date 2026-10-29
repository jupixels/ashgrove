// Sam: walking, sprinting, crouching, the flashlight, hiding in lockers, holding your breath, the phone camera,
// and using things you look at. Movement makes noise the monster can hear.
import * as THREE from 'three';
import { PHONE_LAYER } from './world.js';

const EYE = 1.6, CROUCH_EYE = 1.0, RADIUS = 0.3;
const REACH = 2.4;

export function createPlayer({ camera, scene, audio, ui, settings, onNoise }) {
  const flashlight = new THREE.SpotLight(0xfff1d6, 30, 18, 0.42, 0.55, 1.4);
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.set(512, 512);
  flashlight.shadow.camera.near = 0.1;
  flashlight.shadow.bias = -0.0005;
  flashlight.shadow.normalBias = 0.05; // no striped self-shadowing on walls and floors seen at a glancing angle
  flashlight.position.set(0.25, -0.2, 0);
  camera.add(flashlight);
  const flashTarget = new THREE.Object3D();
  scene.add(flashTarget);
  flashlight.target = flashTarget;
  const flashAim = new THREE.Vector3();

  // The beam: a faint cone of light through the dusty air, and dust drifting through it.
  const BEAM = 7.5;
  const beamGeo = new THREE.ConeGeometry(BEAM * Math.tan(0.4), BEAM, 18, 1, true);
  beamGeo.translate(0, -BEAM / 2, 0);
  beamGeo.rotateX(-Math.PI / 2); // apex at the torch, opening along +z (lookAt points +z at the target)
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { strength: { value: 0 }, time: { value: 0 } },
    vertexShader: `varying float vAlong; varying vec3 vN, vV;
      void main(){ vAlong = position.z / ${BEAM.toFixed(1)}; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float strength, time; varying float vAlong; varying vec3 vN, vV;
      void main(){
        float edge = pow(abs(dot(vN, vV)), 1.6);                 // soft sides, denser through the middle
        float fall = pow(1.0 - clamp(vAlong, 0.0, 1.0), 2.2) * smoothstep(0.0, 0.08, vAlong);
        float swirl = 0.8 + 0.2 * sin(vAlong * 23.0 - time * 0.7 + gl_FragCoord.x * 0.05);
        gl_FragColor = vec4(vec3(1.0, 0.95, 0.84) * edge * fall * swirl * strength * 0.11, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.copy(flashlight.position);
  beam.frustumCulled = false;
  beam.renderOrder = 10;
  camera.add(beam);

  const DUST = 700, BOX = 9;
  const dustPos = new Float32Array(DUST * 3).map(() => Math.random() * BOX);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.ShaderMaterial({
    uniforms: { strength: { value: 0 }, time: { value: 0 }, eye: { value: new THREE.Vector3() }, aim: { value: new THREE.Vector3(0, 0, -1) } },
    vertexShader: `uniform float strength, time; uniform vec3 eye, aim; varying float vA;
      void main(){
        vec3 p = position + vec3(sin(time * 0.3 + position.y * 3.0), sin(time * 0.2 + position.x * 2.0) - time * 0.04, cos(time * 0.25 + position.z * 3.0)) * 0.25;
        p = mod(p - eye + ${(BOX / 2).toFixed(1)}, ${BOX.toFixed(1)}) + eye - ${(BOX / 2).toFixed(1)}; // an endless field of dust around you
        vec3 to = p - eye; float d = length(to);
        float inBeam = smoothstep(0.88, 0.97, dot(to / d, aim));
        vA = inBeam * (1.0 - smoothstep(1.0, ${BEAM.toFixed(1)}, d)) * smoothstep(0.3, 0.8, d) * strength;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv; gl_PointSize = 1.5;
      }`,
    fragmentShader: `varying float vA; void main(){ if (vA < 0.02) discard; gl_FragColor = vec4(vec3(1.0, 0.95, 0.85) * vA * 0.9, 1.0); }`,
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
    p.stamina = THREE.MathUtils.clamp(p.stamina + (p.sprinting ? -0.2 : p.winded ? 0.09 : 0.14) * dt, 0, 1);
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
    // beam and dust follow the light (and fade with the battery)
    const strength = flashlight.intensity / 30;
    beam.visible = strength > 0.01;
    beam.lookAt(flashAim);
    beamMat.uniforms.strength.value = dustMat.uniforms.strength.value = strength;
    beamMat.uniforms.time.value = dustMat.uniforms.time.value += dt;
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
