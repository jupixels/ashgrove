// Opening cutscene: found footage from Sam's phone. Outside shots use their own scene (the hospital
// exterior in the rain); inside shots reuse the game level with a separate camera.
import * as THREE from 'three';
import { pixelTexture } from './assets.js';

const $ = (id) => document.getElementById(id);
const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = pixelTexture(c);
  if (repeat) t.repeat.set(...repeat);
  return t;
}

function speckle(g, w, h, n, color, size) {
  g.fillStyle = color;
  for (let i = 0; i < n; i++) g.fillRect(Math.random() * w, Math.random() * h, size * Math.random() + 1, size * Math.random() + 1);
}

// ---------------------------------------------------------------- exterior
function buildExterior(psx) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x07090c);
  s.fog = new THREE.FogExp2(0x07090c, 0.022);
  s.add(new THREE.AmbientLight(0x3a4458, 1.8));
  const moon = new THREE.DirectionalLight(0x8090c0, 1.6);
  moon.position.set(-10, 20, 10);
  s.add(moon);
  const lam = (opts) => psx(new THREE.MeshLambertMaterial(opts));

  // the hospital: four floors of dead windows
  const facade = canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = '#4a4640';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, 900, 'rgba(20,18,14,0.35)', 2);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 14; col++) {
        const x = 6 + col * 18, y = 8 + row * 22;
        if (row === 3 && col >= 6 && col <= 7) continue; // entrance
        g.fillStyle = '#0b0b0d';
        g.fillRect(x, y, 10, 12);
        if (Math.random() < 0.25) { g.fillStyle = '#3b2a1c'; g.fillRect(x, y + 3, 10, 2); g.fillRect(x, y + 7, 10, 2); } // boarded
        else if (Math.random() < 0.3) { g.fillStyle = '#2a2c30'; g.fillRect(x + 1, y + 1, 4, 5); } // a pane left
      }
    }
    g.fillStyle = '#050505';
    g.fillRect(112, 72, 32, 24);
    for (let i = 0; i < 40; i++) { // rust and rain streaks
      g.fillStyle = `rgba(${40 + Math.random() * 30},${25 + Math.random() * 15},10,0.35)`;
      g.fillRect(Math.random() * w, Math.random() * 60, 1, 10 + Math.random() * 30);
    }
  });
  const wall = lam({ color: 0x3a3733 });
  const building = new THREE.Mesh(new THREE.BoxGeometry(44, 14, 14, 22, 7, 1), [wall, wall, wall, wall, lam({ map: facade }), wall]);
  building.position.set(0, 7, -37);
  s.add(building);

  // the 4th floor window that is lit... until it isn't
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xd8c27a, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const litWindow = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.75), windowMat);
  litWindow.position.set(-10.8, 11.96, -29.88);
  s.add(litWindow);

  const sign = canvasTex(256, 24, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = 'bold 17px "Special Elite", serif';
    g.textAlign = 'center';
    g.fillStyle = '#b9b2a0';
    g.fillText('ASHGR VE  MEMORIAL  HOSP TAL', w / 2, 18, w - 6); // (maxWidth: squeezed to fit, never cut off)
    speckle(g, w, h, 120, 'rgba(90,40,10,0.7)', 2);
  });
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(15, 1.4), lam({ map: sign, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  signMesh.position.set(0, 4.6, -29.86);
  s.add(signMesh);

  // the side door, propped open with a brick
  const doorway = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), new THREE.MeshBasicMaterial({ color: 0x000000, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  doorway.position.set(14, 1.2, -29.9);
  s.add(doorway);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.35, 0.06), lam({ color: 0x3a3b36 }));
  // hinged on the right of the doorway and swung outward (away from the wall and the camera)
  door.geometry.translate(-0.675, 0, 0);
  door.position.set(14.7, 1.18, -29.85);
  door.rotation.y = 2.0;
  s.add(door);
  const brick = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.1), lam({ color: 0x6a2a1a }));
  brick.position.set(15.15, 0.04, -28.55); // wedged under its outer edge
  s.add(brick);

  // wet asphalt with puddles
  const asphalt = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#18181b';
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, 300, 'rgba(40,40,45,0.8)', 1);
    for (let i = 0; i < 3; i++) {
      g.fillStyle = 'rgba(60,70,90,0.35)';
      g.beginPath();
      g.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 8, 3 + Math.random() * 4, 0, 0, Math.PI * 2);
      g.fill();
    }
  }, [50, 50]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200, 50, 50), lam({ map: asphalt })); // subdivided, or the snapped corners warp it
  ground.rotation.x = -Math.PI / 2;
  s.add(ground);

  // chain-link fence with a gap someone cut
  const chain = canvasTex(16, 16, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#8a8a86';
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(w, h);
    g.moveTo(w, 0); g.lineTo(0, h);
    g.stroke();
  });
  chain.wrapS = chain.wrapT = THREE.RepeatWrapping;
  const fenceMat = (width) => {
    const t = chain.clone();
    t.repeat.set(width / 0.35, 3 / 0.35);
    t.needsUpdate = true;
    return psx(new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
  };
  for (const [x0, x1] of [[-30, 1], [3.2, 30]]) {
    const w = x1 - x0;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, 3), fenceMat(w));
    f.position.set((x0 + x1) / 2, 1.5, -12);
    s.add(f);
    for (let x = x0; x <= x1; x += 3) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.2, 5), lam({ color: 0x55554f }));
      post.position.set(x, 1.6, -12);
      s.add(post);
    }
  }
  const flap = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.6), fenceMat(0.9));
  flap.position.set(1.4, 0.8, -11.6);
  flap.rotation.y = -0.9;
  s.add(flap);
  const condemned = canvasTex(64, 40, (g, w, h) => {
    g.fillStyle = '#d8d0c0';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#8a0f0f';
    g.fillRect(0, 0, w, 14);
    g.font = 'bold 11px sans-serif';
    g.textAlign = 'center';
    g.fillStyle = '#f0e8d8';
    g.fillText('CONDEMNED', w / 2, 11, w - 4);
    g.fillStyle = '#222';
    g.font = 'bold 10px sans-serif';
    g.fillText('KEEP OUT', w / 2, 27, w - 4);
    g.font = '6px sans-serif';
    g.fillText('BY ORDER OF THE COUNTY', w / 2, 36, w - 4);
    speckle(g, w, h, 60, 'rgba(90,50,20,0.6)', 2);
  });
  const condemnedSign = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.8), lam({ map: condemned, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  condemnedSign.position.set(-1.6, 1.7, -11.94);
  s.add(condemnedSign);

  // street lamps, one dying
  const lamps = [];
  for (const [x, z] of [[-9, -14], [17, -16], [-4, 14], [5, -26]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5, 5), lam({ color: 0x333330 }));
    pole.position.set(x, 2.5, z);
    s.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.3), new THREE.MeshBasicMaterial({ color: 0xffb070 }));
    head.position.set(x, 5, z);
    s.add(head);
    const light = new THREE.PointLight(0xff9a50, 9, 16, 1.4);
    light.position.set(x, 4.8, z);
    s.add(light);
    lamps.push({ light, head, flicker: lamps.length === 1 });
  }

  // rain: streaks that fall around the camera
  const DROPS = 1400;
  const pos = new Float32Array(DROPS * 6);
  for (let i = 0; i < DROPS; i++) {
    const x = (Math.random() - 0.5) * 36, y = Math.random() * 14, z = (Math.random() - 0.5) * 36;
    pos.set([x, y, z, x + 0.05, y + 0.55, z], i * 6);
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x8090a0, transparent: true, opacity: 0.45 }));
  s.add(rain);

  return {
    scene: s,
    litWindow,
    windowOn(on) { windowMat.color.set(on ? 0xd8c27a : 0x0b0b0d); },
    update(dt, cam) {
      rain.position.set(cam.position.x, 0, cam.position.z);
      for (let i = 0; i < DROPS; i++) {
        let y = pos[i * 6 + 1] - 24 * dt;
        if (y < 0) y += 14;
        pos[i * 6 + 1] = y;
        pos[i * 6 + 4] = y + 0.55;
      }
      rainGeo.attributes.position.needsUpdate = true;
      for (const l of lamps) {
        if (!l.flicker) continue;
        const on = Math.random() > 0.08;
        l.light.intensity = on ? 9 : 0;
        l.head.material.color.set(on ? 0xffb070 : 0x221810);
      }
    },
  };
}

// ---------------------------------------------------------------- the car (overlay for the car shot)
// Seen from the passenger seat: windshield with rain and wipers, the hood outside, dashboard with a lit
// instrument cluster and radio clock, steering wheel, rear-view mirror with a swinging air freshener.
function buildWindshield() {
  const canvas = $('windshield').querySelector('canvas');
  const g = canvas.getContext('2d');
  const drops = [];
  const glow = (x, y, r, color) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, color);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  };
  return {
    draw(t) {
      const w = (canvas.width = Math.floor(canvas.clientWidth / 2));
      const h = (canvas.height = Math.floor(canvas.clientHeight / 2));
      const top = h * 0.08, dash = h * 0.66;
      g.clearRect(0, 0, w, h);

      // --- outside the glass: the hood, catching a little street light
      g.fillStyle = '#060607';
      g.beginPath();
      g.moveTo(w * 0.02, dash);
      g.quadraticCurveTo(w * 0.5, h * 0.575, w * 0.98, dash);
      g.fill();
      g.strokeStyle = 'rgba(150,140,120,0.25)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(w * 0.15, h * 0.63);
      g.quadraticCurveTo(w * 0.5, h * 0.583, w * 0.85, h * 0.63);
      g.stroke();

      // --- on the glass: rain and wipers, clipped to the windshield
      g.save();
      g.beginPath();
      g.moveTo(w * 0.1, top); g.lineTo(w * 0.9, top); g.lineTo(w * 0.98, dash); g.lineTo(w * 0.02, dash);
      g.closePath();
      g.clip();
      if (Math.random() < 0.9) drops.push({ x: Math.random() * w, y: top + Math.random() * (dash - top), r: 1 + Math.random() * 2.5, vy: Math.random() < 0.15 ? 20 + Math.random() * 40 : 0 });
      const phase = (t % 1.8) / 1.8; // wipers sweep every 1.8s and clear what they pass
      const ang = Math.PI * (phase < 0.5 ? phase * 2 : 2 - phase * 2) * 0.85 + 0.1;
      const pivots = [w * 0.3, w * 0.68];
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.y += d.vy / 60;
        for (const px of pivots) {
          const a = Math.atan2(dash + h * 0.02 - d.y, d.x - px);
          if (Math.abs(a - (Math.PI - ang)) < 0.08) { drops.splice(i, 1); break; }
        }
      }
      if (drops.length > 260) drops.splice(0, drops.length - 260);
      for (const d of drops) {
        g.fillStyle = 'rgba(170,185,200,0.35)';
        g.beginPath();
        g.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.4)';
        g.fillRect(d.x - d.r * 0.3, d.y - d.r * 0.4, 1, 1);
      }
      g.strokeStyle = '#030303';
      g.lineWidth = Math.max(3, w * 0.008);
      for (const px of pivots) {
        g.beginPath();
        g.moveTo(px, dash + h * 0.02);
        g.lineTo(px + Math.cos(Math.PI - ang) * w * 0.4, dash + h * 0.02 - Math.sin(Math.PI - ang) * w * 0.4);
        g.stroke();
      }
      // fogged-up glass around the edges
      const fog = g.createRadialGradient(w / 2, h * 0.38, h * 0.2, w / 2, h * 0.38, w * 0.55);
      fog.addColorStop(0, 'rgba(120,130,140,0)');
      fog.addColorStop(1, 'rgba(120,130,140,0.22)');
      g.fillStyle = fog;
      g.fillRect(0, 0, w, h);
      g.restore();

      // --- the car around you
      g.fillStyle = '#08080a'; // headliner
      g.fillRect(0, 0, w, top + 2);
      g.beginPath(); // A-pillars
      g.moveTo(0, 0); g.lineTo(w * 0.1, 0); g.lineTo(w * 0.1, top); g.lineTo(w * 0.02, dash); g.lineTo(0, dash); g.fill();
      g.beginPath();
      g.moveTo(w, 0); g.lineTo(w * 0.9, 0); g.lineTo(w * 0.9, top); g.lineTo(w * 0.98, dash); g.lineTo(w, dash); g.fill();

      // dashboard, its top edge picking up the street lamps
      g.fillStyle = '#0b0b0c';
      g.beginPath();
      g.moveTo(0, h);
      g.lineTo(0, dash);
      g.quadraticCurveTo(w * 0.5, dash - h * 0.035, w, dash);
      g.lineTo(w, h);
      g.fill();
      g.strokeStyle = 'rgba(170,150,120,0.4)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(0, dash + 1);
      g.quadraticCurveTo(w * 0.5, dash - h * 0.035 + 1, w, dash + 1);
      g.stroke();

      // instrument cluster behind the wheel (driver side, left)
      const cx = w * 0.24, cy = h * 0.8;
      glow(cx, cy, w * 0.11, 'rgba(255,150,40,0.16)');
      for (const [dx, col] of [[-w * 0.05, 'rgba(255,170,60,0.75)'], [w * 0.05, 'rgba(120,255,160,0.6)']]) {
        g.strokeStyle = col;
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(cx + dx, cy, w * 0.035, Math.PI * 0.8, Math.PI * 2.2);
        g.stroke();
        g.beginPath(); // needle
        g.moveTo(cx + dx, cy);
        const na = Math.PI * 1.1 + (dx < 0 ? 0.1 : 0.6);
        g.lineTo(cx + dx + Math.cos(na) * w * 0.028, cy + Math.sin(na) * w * 0.028);
        g.stroke();
      }
      // steering wheel
      g.strokeStyle = '#030303';
      g.lineWidth = w * 0.022;
      g.beginPath();
      g.ellipse(cx, h * 1.0, w * 0.17, h * 0.21, 0, Math.PI * 1.05, Math.PI * 1.95);
      g.stroke();
      g.strokeStyle = 'rgba(120,110,95,0.25)';
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(cx, h * 1.0 - w * 0.011, w * 0.17, h * 0.21, 0, Math.PI * 1.2, Math.PI * 1.6);
      g.stroke();
      g.fillStyle = '#030303';
      g.fillRect(cx - w * 0.008, h * 0.84, w * 0.016, h * 0.2); // column

      // radio clock and vents in the middle
      const rx = w * 0.5, ry = h * 0.82;
      g.fillStyle = '#050608';
      g.fillRect(rx - w * 0.06, ry - h * 0.03, w * 0.12, h * 0.06);
      glow(rx, ry, w * 0.06, 'rgba(80,150,255,0.18)');
      g.fillStyle = 'rgba(120,190,255,0.9)';
      g.font = `${Math.max(8, Math.round(h * 0.035))}px "Courier New", monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('11:46', rx, ry);
      g.fillStyle = '#040404';
      for (const vx of [rx - w * 0.12, rx + w * 0.08]) g.fillRect(vx, h * 0.73, w * 0.04, h * 0.025);

      // rear-view mirror with an air freshener swinging from it
      g.fillStyle = '#060607';
      g.fillRect(w * 0.497, 0, w * 0.006, h * 0.11);
      g.fillStyle = '#0c0d10';
      g.beginPath();
      g.roundRect(w * 0.42, h * 0.1, w * 0.16, h * 0.075, 6);
      g.fill();
      g.strokeStyle = 'rgba(160,160,170,0.25)';
      g.stroke();
      const swing = Math.sin(t * 1.7) * 0.22;
      const sx = w * 0.5 + Math.sin(swing) * h * 0.09, sy = h * 0.175 + Math.cos(swing) * h * 0.09;
      g.strokeStyle = 'rgba(90,90,90,0.8)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(w * 0.5, h * 0.175);
      g.lineTo(sx, sy);
      g.stroke();
      g.fillStyle = '#1d3a22';
      g.beginPath(); // little pine tree
      g.moveTo(sx, sy);
      g.lineTo(sx - h * 0.025, sy + h * 0.06);
      g.lineTo(sx + h * 0.025, sy + h * 0.06);
      g.fill();
    },
  };
}

// ---------------------------------------------------------------- the timeline
export function createIntro(ctx) {
  const { mainScene, psx, audio, state, lights, monster, monsterAnim } = ctx;
  const ext = buildExterior(psx);
  const shield = buildWindshield();
  const cam = new THREE.PerspectiveCamera(70, 1, 0.05, 120);
  const samLight = new THREE.SpotLight(0xfff1d6, 0, 16, 0.5, 0.6, 1.4);
  samLight.position.set(0.2, -0.15, 0);
  cam.add(samLight);
  const samAim = new THREE.Object3D();
  samAim.position.set(0, 0, -1);
  cam.add(samAim);
  samLight.target = samAim;

  // Maya, with her phone light coming from her right hand
  const mayaLight = new THREE.SpotLight(0xe8f0ff, 0, 14, 0.55, 0.6, 1.4);
  const mayaTarget = new THREE.Object3D();
  mayaLight.target = mayaTarget;
  const mayaGlow = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  mayaGlow.visible = false;
  const mayaRig = ctx.mayaRig; // shared with the rest of the game (src/maya.js)
  const maya = mayaRig.group;
  maya.visible = false;
  ctx.floorGroup.add(mayaLight, mayaTarget, mayaGlow); // cleaned up with the ground floor
  const handPos = V(0, 0, 0), mayaFwd = V(0, 0, 0);
  // Stand her on the floor at `pos`, facing `look`.
  function placeMaya(pos, look) {
    maya.position.set(pos.x, 0, pos.z);
    maya.lookAt(look.x, 0, look.z);
  }
  // Walk her from a to b between times t0 and t1 (walking animation while moving, breathing idle once there).
  function walkMaya(a, b, t0, t1, t, look, speed = 1) {
    const k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
    const pos = a.clone().lerp(b, k);
    placeMaya(pos, k < 1 ? b.clone().add(b.clone().sub(a)) : look);
    mayaRig.play(k > 0 && k < 1 ? 'walk' : 'idle', speed);
  }
  function updateMayaLight(dt) {
    if (!maya.visible) return;
    mayaRig.mixer.update(dt);
    maya.updateMatrixWorld(true);
    (mayaRig.hand || maya).getWorldPosition(handPos);
    maya.getWorldDirection(mayaFwd);
    mayaLight.position.copy(handPos);
    mayaGlow.position.copy(handPos);
    mayaTarget.position.copy(handPos).addScaledVector(mayaFwd, 5).setY(0.9);
  }

  // her phone: knocked out of her hand when she's grabbed, left on the floor still lit
  const phone = new THREE.Group();
  phone.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.16), new THREE.MeshBasicMaterial({ color: 0x111111 })));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.14), new THREE.MeshBasicMaterial({ color: 0x9fc4ff }));
  screen.rotation.x = -Math.PI / 2;
  screen.position.y = 0.007;
  phone.add(screen);
  const phoneLight = new THREE.PointLight(0x9fc4ff, 0, 2.2, 1.5);
  phoneLight.position.y = 0.08;
  phone.add(phoneLight);
  phone.visible = false;
  ctx.floorGroup.add(phone);
  const GRAB = V(14, 0, 11.8);          // where she is standing when it takes her
  const PHONE_REST = V(13.1, 0.02, 12.2);

  // blood where it grabbed her and smeared drag marks down the hall, shown once it happens
  const gore = [];
  gore.push(ctx.decal(ctx.blood[0], 1.6, 1.6, V(14.2, 0.012, 11.9), -Math.PI / 2, 0.4));
  for (let i = 0; i < 6; i++) {
    gore.push(ctx.decal(ctx.blood[(i + 1) % 3], 1.5, 0.45, V(15.4 + i * 1.35, 0.011, 11.75 + Math.sin(i) * 0.12), -Math.PI / 2, Math.PI / 2 + (Math.random() - 0.5) * 0.2));
  }
  gore.forEach((d) => (d.visible = false));

  const ui = {
    root: $('intro'), typed: $('typed'), footage: $('footage'), chat: $('chat'), stamp: $('stamp'),
    viewers: $('viewers'), shield: $('windshield'), sub: $('subtitle'), title: $('titlecard'), skip: $('skip'),
  };

  let subTimer = 0;
  function say(who, text, ms = 3800, cls = '') {
    ui.sub.innerHTML = (who ? `<span class="who">${who}:</span> ` : '') + `<span class="${cls}">${text}</span>`;
    ui.sub.style.opacity = 1;
    clearTimeout(subTimer);
    subTimer = setTimeout(() => (ui.sub.style.opacity = 0), ms);
  }
  function chat(user, msg) {
    const d = document.createElement('div');
    d.innerHTML = `<b>${user}</b> ${msg}`;
    ui.chat.appendChild(d);
    while (ui.chat.children.length > 7) ui.chat.firstChild.remove();
  }
  // Length of a voice file in seconds (or a guess while it hasn't been recorded yet).
  const len = (name, guess) => (audio.buffers && audio.buffers[name] ? audio.buffers[name].duration : guess);
  // Play a voice line with its subtitle, held for as long as the line lasts.
  function line(name, who, text, guess, cls = '') {
    const sound = audio.play(name, { volume: 1 });
    say(who, text, (len(name, guess) + 0.4) * 1000, cls);
    return sound;
  }

  // handheld phone camera: a breathing sway plus small jitters
  let shakeT = 0;
  function aim(pos, target, amount = 1) {
    shakeT += 0.016;
    cam.position.copy(pos);
    cam.position.y += Math.sin(shakeT * 1.7) * 0.015 * amount;
    cam.lookAt(target);
    cam.rotateZ(Math.sin(shakeT * 0.9) * 0.02 * amount);
    cam.rotateX(Math.sin(shakeT * 2.3) * 0.008 * amount + (Math.random() - 0.5) * 0.003 * amount);
    cam.rotateY(Math.sin(shakeT * 1.3) * 0.01 * amount);
  }
  function useScene(which) {
    const s = which === 'ext' ? ext.scene : mainScene;
    s.add(cam);
    ctx.setView(s, cam);
  }
  function lightsOff(off) {
    for (const l of lights) { l.off = off; l.dark = false; }
  }

  let rainLoop = null;
  const saved = lights.map((l) => ({ base: l.base, flicker: l.flicker }));
  const fogDensity = mainScene.fog.density;
  let stepT = 0;
  function footsteps(dt, every = 0.55) {
    stepT += dt;
    if (stepT > every) { stepT = 0; audio.footstep('walk'); }
  }

  // Each shot: duration, optional chat lines [time, user, text], and enter/update(t, dt) hooks.
  // Shots with voice lines stretch their duration to fit the recorded line.
  // Timed events inside a shot are dropped if the shot ends first (skipping), so nothing leaks into later shots.
  const later = (fn, ms) => { const at = shot; setTimeout(() => { if (active && shot === at) fn(); }, ms); };

  const shots = [
    { // 1. black screen, typed text
      dur: 8,
      enter() {
        useScene('ext');
        ui.typed.style.opacity = 1;
        this.text = 'On October 31st, 2026, two teenagers entered\nAshgrove Memorial Hospital.\n\nThis footage was recovered from inside.';
        audio.play('heartbeat', { volume: 0.6 });
      },
      update(t) {
        ui.typed.textContent = this.text.slice(0, Math.floor(t / 0.045));
        aim(V(-2.5, 1.25, 10), V(0, 6, -30), 0.4);
      },
    },
    { // 2. the car, rain on the windshield
      chat: [[1.5, 'kyle_b', 'yooo we live'], [3, 'mira.x', 'ashgrove?? my aunt says thats actually haunted'],
        [5.5, 'dt_99', 'sam looks terrified lmao'], [8, 'mira.x', 'pls dont go in there'], [10, 'kyle_b', 'GO IN GO IN']],
      enter() {
        ui.footage.style.opacity = 1;
        ui.shield.style.opacity = 1;
        shield.draw(0);                 // the car is in place before the black screen starts fading
        ui.typed.style.opacity = 0;
        rainLoop = audio.loop('car_rain_interior', 0.7);
        // timed on the shot's own clock so the lines can't drift from it if loading stutters
        this.samAt = 1 + len('maya_intro', 4) + 0.4;
        this.dur = this.samAt + len('sam_hi', 2.5) + 0.5; // out of the car right after Sam's line
      },
      update(t) {
        if (t > 1 && !this.mayaSaid) { this.mayaSaid = true; line('maya_intro', 'Maya', "Okay okay, we're live! Say hi to all eleven viewers, Sam.", 4); }
        if (t > this.samAt && !this.samSaid) { this.samSaid = true; line('sam_hi', 'Sam', '...hi. This is a terrible idea.', 2.5); }
        shield.draw(t);
        aim(V(-2.5, 1.25, 10), V(-1, 6.5, -30), 0.35);
      },
      exit() { ui.shield.style.opacity = 0; },
    },
    { // 3. through the fence; the 4th floor window goes dark
      chat: [[2, 'dt_99', 'condemned 💀'], [8.2, 'mira.x', 'THE WINDOW'], [9, 'kyle_b', 'did anyone else see that light??']],
      enter() {
        if (rainLoop) rainLoop.stop();
        rainLoop = audio.loop('car_rain_interior', 1.0);
        audio.play('car_door', { volume: 0.9 }); // out of the car
        later(() => audio.play('dog_bark_distant', { volume: 0.7 }), 2600); // somewhere out in the dark
        ext.windowOn(true);
        this.dur = Math.max(11, 7.2 + len('maya_window', 4) + 1);
      },
      update(t, dt) {
        const walk = smooth(t / 6.5);
        const pos = V(-2, 1.6, 4).lerp(V(2.1, 1.6, -13.4), walk);
        let target = V(1.5, 1.4, -20);
        if (t > 4.4 && t < 5.4) { if (!this.rattled) { this.rattled = true; audio.play('fence_rattle', { volume: 0.8 }); } }
        if (t > 6.2) target = target.lerp(V(-10.8, 12, -30), smooth((t - 6.2) / 1.6));
        if (t > 7.2 && !this.dark) {
          this.dark = true;
          ext.windowOn(false);
          line('maya_window', 'Maya', 'Dude... the fourth floor window. Was that light on a second ago?', 4);
        }
        if (t < 6.5) footsteps(dt);
        aim(pos, target, t < 6.5 ? 1.4 : 0.8);
      },
    },
    { // 4. the side door, propped open with a brick
      chat: [[1, 'dt_99', 'thats so convenient wtf'], [3.5, 'mira.x', 'NO']],
      enter() {
        this.dur = Math.max(6, 0.5 + len('maya_door', 3) + 2);
        if (rainLoop) rainLoop.stop(0.4);
        rainLoop = audio.loop('car_rain_interior', 0.5); // quieter under her voice
        later(() => line('maya_door', 'Maya', "Side door's open. Somebody propped it with a brick.", 3), 500);
      },
      update(t, dt) {
        const pos = V(4, 1.6, -15).lerp(V(13.4, 1.6, -27.6), smooth(t / (this.dur - 1)));
        if (t > this.dur - 1.6 && !this.creak) { this.creak = true; audio.play('door_creak_open', { volume: 0.9 }); }
        footsteps(dt);
        aim(pos, V(14, 1.2, -30), 1.2);
      },
      exit() { if (rainLoop) rainLoop.stop(); rainLoop = null; },
    },
    { // 5. the lobby, dark, Maya ahead with her light
      chat: [[2, 'kyle_b', 'its so dark'], [5.5, 'mira.x', 'TONIGHTS date??'], [7, 'dt_99', 'nah im out'], [9, 'kyle_b', 'its fake. its gotta be fake']],
      enter() {
        useScene('int');
        ctx.setPower(true);
        lightsOff(true);
        mainScene.fog.density = 0.07;
        samLight.intensity = 22;
        mayaLight.intensity = 26;
        mayaGlow.visible = true;
        maya.visible = true;
        ctx.startAmbience();
        this.dur = Math.max(11, 3.5 + len('maya_signin', 5) + 1);
        later(() => line('maya_signin', 'Maya', "Wait. Look at this sign-in book. The last entry is... tonight's date.", 5), 3500);
      },
      update(t, dt) {
        const pos = V(5, 1.6, 16.8).lerp(V(5, 1.6, 14.2), smooth(t / 8));
        // she walks ahead, then stops at the reception desk to read the sign-in book
        walkMaya(V(5, 0, 14), V(5.5, 0, 12.2), 0, 2.4, t, V(5.5, 0, 6), 0.9);
        footsteps(dt, 0.7);
        aim(pos, V(5.3, 1.2, 9), 1);
      },
    },
    { // 6. the hallway: something is standing ahead of her
      chat: [[3.6, 'mira.x', 'WHAT WAS THAT'], [4.2, 'dt_99', 'end of the hall?????'], [6, 'kyle_b', 'MAYA TURN AROUND']],
      enter() {
        monster.position.set(19.5, 0, 11.8);
        monsterAnim('idle', { fade: 0 });
        audio.play('tension_riser', { volume: 0.7 });
        this.dur = Math.max(9, 5 + len('sam_comeback', 2) + 1);
      },
      update(t, dt) {
        walkMaya(V(7.4, 0, 12.1), GRAB, 0, 7.5, t, V(30, 0, 11.8), 0.85);
        if (t < 7.5) footsteps(dt, 0.75);
        // two glitched frames where it is there
        const seen = (t > 3.2 && t < 3.34) || (t > 3.55 && t < 3.66);
        monster.visible = seen;
        monster.lookAt(cam.position.x, 0, cam.position.z);
        if (seen) { state.aberration = 1.8; if (!this.glitched) { this.glitched = true; audio.play('flicker', { volume: 1 }); } }
        if (t > 5 && !this.called) { this.called = true; line('sam_comeback', 'Sam', 'Maya. Maya, come back.', 2); }
        aim(V(6.2, 1.6, 12.2), V(20, 1.35, 11.9), 1);
      },
      exit() { monster.visible = false; },
    },
    { // 7. every light slams on; the lockdown
      chat: [[0.4, 'kyle_b', '!!!!!!'], [3.2, 'mira.x', 'GET OUT GET OUT']],
      enter() {
        lightsOff(false);
        for (const l of lights) { l.flicker = false; l.base = 14; }
        mainScene.fog.density = fogDensity;
        audio.play('lights_slam_on', { volume: 1 });
        state.aberration = 1.2;
        const pa = len('pa_lockdown', 5);
        this.slamAt = 1.1 + pa * 0.5;        // the shutters come down as it says the exits are sealed
        this.deadAt = Math.max(5.4, 1.1 + pa + 0.4);
        this.dur = this.deadAt + 0.6;
        later(() => {
          audio.play('pa_crackle', { volume: 0.8 });
          line('pa_lockdown', 'PA', 'Quarantine protocol engaged. All exits are sealed. Please remain calm.', 5, 'whisper');
        }, 1100);
      },
      update(t) {
        let target = V(20, 1.35, 11.9);
        if (t > this.slamAt) {
          if (!this.slam) { this.slam = true; audio.play('metal_shutter_slam', { volume: 1 }); state.shake = 1; }
          // whip round to the shutters, then back to Maya
          const back = smooth((t - this.slamAt - 1.6) / 0.8);
          target = target.clone().lerp(V(2, 1.4, 17), smooth((t - this.slamAt) / 0.35) * (1 - back));
        }
        // Maya turns round to face Sam; once the shutters slam she's terrified
        const turn = smooth((t - this.slamAt) / 0.8);
        placeMaya(GRAB, V(30, 0, 11.8).lerp(V(GRAB.x - 5, 0, GRAB.z), turn));
        mayaRig.play(t > this.slamAt ? 'scared' : 'idle');
        if (t > this.deadAt && !this.dead) {
          this.dead = true;
          lightsOff(true);
          audio.play('flicker', { volume: 1 });
          ui.viewers.textContent = '—';
          chat('', '<i>connection lost</i>');
        }
        aim(V(6.2, 1.6, 12.2), target, t > this.slamAt ? 2.5 : 1);
      },
    },
    { // 8. darkness. A strobe shows it right behind her. It grabs her, Sam's light dies, and you only hear it.
      dur: 9.5,
      enter() {
        monster.position.set(GRAB.x + 0.9, 0, GRAB.z);
        monster.visible = false;
        monsterAnim('idle', { fade: 0 });
        placeMaya(GRAB, V(GRAB.x - 5, 0, GRAB.z));
        mayaRig.play('scared');
      },
      update(t, dt) {
        // the hall lights stutter on for a few frames: there it is, right behind her
        const strobe = (t > 1.2 && t < 1.32) || (t > 1.45 && t < 1.53);
        lightsOff(!strobe);
        if (t > 1.2 && !this.revealed) {
          this.revealed = true;
          monster.visible = true;
          audio.play('jumpscare_sting_1', { volume: 0.8 });
          audio.play('monster_breathing', { volume: 0.9 });
          state.aberration = 0.5;
        }
        if (monster.visible) monster.lookAt(cam.position.x, 0, cam.position.z);
        if (t > 1.6 && !this.grabbed) { // it grabs her, and Sam's light dies in a glitch
          this.grabbed = true;
          monsterAnim('attack', { fade: 0.05, speed: 1.4, once: true });
          this.scream = line('maya_scream', 'Maya', 'AAAAHH! SAM!', 4);
          later(() => line('sam_scream', 'Sam', 'MAYA!', 1.2), 500);
          later(() => { audio.play('monster_drag_tubes', { volume: 1 }); audio.play('vent_scrape_drag', { volume: 0.9 }); }, 400);
          later(() => audio.play('phone_drop', { volume: 0.9 }), 450);
          later(() => audio.play('kill_grab_gore', { volume: 0.7 }), 150);
          state.aberration = 1.8;
          state.shake = 1;
        }
        const dark = t > 1.6 && t < 4.8;
        if (t > 1.75 && !this.taken) { // gone in the dark: what's left is her phone and the blood
          this.taken = true;
          monster.visible = false;
          maya.visible = false;
          mayaLight.intensity = 0;
          mayaGlow.visible = false;
          gore.forEach((d) => (d.visible = true));
          phone.visible = true;
          phone.position.copy(PHONE_REST);
          phone.rotation.set(0, 0.6, 0);
          phoneLight.intensity = 1.5;
        }
        if (dark) state.aberration = Math.max(state.aberration, 0.6 + Math.random() * 0.6); // the camera fighting itself
        // her scream fades as she's hauled away, then stops dead
        if (this.scream && this.scream.gain && t > 2.2) this.scream.gain.gain.value = Math.max(0, 1 - (t - 2.2) / 2.4);
        if (t > 4.6 && !this.silenced) { this.silenced = true; if (this.scream) this.scream.stop(); }
        // Sam's light: on, dead while it happens (two failing flickers), then back on an empty hall
        const flicker = (t > 2.7 && t < 2.77) || (t > 3.4 && t < 3.46);
        samLight.intensity = t < 0.4 ? 0 : dark && !flicker ? 0 : 22;
        // camera: on her, a flinch away when it grabs, then finding the phone and walking up to it
        const start = V(6.2, 1.6, 12.2).lerp(V(9.4, 1.6, 12.1), smooth(t / 1.1));
        if (t < 1.1) footsteps(dt, 0.4);
        let look = V(GRAB.x, 1.3, GRAB.z);
        if (t > 1.6) look = V(10.5, 0.4, 13.2);              // flinching away, light pointing at the floor
        if (t > 4.8) look = look.lerp(PHONE_REST, smooth((t - 4.8) / 0.8));     // glance at her phone
        if (t > 6.2) look = look.lerp(V(24, 1.35, 11.9), smooth((t - 6.2) / 1.2)); // then up the hall, into the dark
        const walkIn = smooth((t - 6) / 2.6);
        if (t > 6 && walkIn < 1) footsteps(dt, 0.6);
        aim(start.lerp(V(12.2, 1.45, 12.3), walkIn), look, dark ? 3 : 1.2);
      },
    },
    { // 9. the walkie-talkie
      enter() {
        const walkieAt = 0.6 + len('sam_walkie', 2.2) + 0.9;
        this.dur = walkieAt + len('maya_walkie_1', 9) + 1.4;
        this.endAt = this.dur - 0.8;
        line('sam_walkie', 'Sam', 'Maya?! Maya, where are you?!', 2.2);
        later(() => audio.play('walkie_static', { volume: 1 }), (walkieAt - 0.5) * 1000); // the walkie crackling on
        later(() => line('maya_walkie_1', 'Maya (walkie)',
          "Sam... it took me upstairs... it's sewing something... Please. Find the keycards. Get the lockdown off.", 9, 'whisper'),
        walkieAt * 1000);
      },
      update(t) {
        aim(V(12.4, 1.6, 12.3), V(24, 1.35, 11.9), 0.9); // staring down the hall where it took her
        if (t > this.endAt && !this.end) { this.end = true; audio.play('walkie_static', { volume: 0.6 }); }
      },
    },
    { // 10. title card, wait for a click
      dur: Infinity,
      enter() {
        ui.footage.style.opacity = 0;
        ui.skip.style.display = 'none';
        ui.title.style.opacity = 1;
        audio.play('jumpscare_sting_1', { volume: 0.5 });
        later(() => ui.root.classList.add('clickable'), 1800);
      },
      update() {},
    },
  ];

  let shot = -1, t = 0, clock = 0, skipHeld = 0, active = false;
  function next() {
    if (shots[shot] && shots[shot].exit) shots[shot].exit();
    shot++;
    t = 0;
    shots[shot].enter && shots[shot].enter();
  }

  function onKey(e) { if (e.code === 'Space') skipHeld = e.type === 'keydown' ? Math.max(skipHeld, 0.001) : 0; }

  function finish() {
    ctx.setPower(false); // and it's dead again when you start playing
    active = false;
    removeEventListener('keydown', onKey);
    removeEventListener('keyup', onKey);
    lightsOff(false);
    lights.forEach((l, i) => Object.assign(l, saved[i]));
    mainScene.fog.density = fogDensity;
    samLight.distance = 16;
    samLight.intensity = 0;
    mayaLight.intensity = 0;
    mayaGlow.visible = false;
    maya.visible = false;
    phoneLight.intensity = 0;
    monster.visible = false;
    if (rainLoop) rainLoop.stop();
    ui.root.classList.remove('on', 'clickable');
    ctx.onDone(phone);
  }

  return {
    get active() { return active; },
    frozen: false, // debug: stop real-time playback (step it with game.introTick)
    get shot() { return shot; },
    get time() { return t; },
    jump(i) { shot = i - 1; next(); }, // debug: start shot i
    useScene,
    start() {
      active = true;
      ui.root.classList.add('on');
      addEventListener('keydown', onKey);
      addEventListener('keyup', onKey);
      ui.root.addEventListener('click', () => { if (ui.root.classList.contains('clickable')) finish(); });
      next();
    },
    update(dt) {
      if (!active) return;
      clock += dt;
      t += dt;
      if (skipHeld > 0) {
        skipHeld += dt;
        if (skipHeld > 0.6 && shot < shots.length - 1) {
          skipHeld = 0;
          // jump straight to the title card, leaving the level as the story leaves it
          if (rainLoop) rainLoop.stop();
          rainLoop = null;
          useScene('int');
          lightsOff(true);
          monster.visible = false;
          maya.visible = false;
          mayaLight.intensity = 0;
          mayaGlow.visible = false;
          gore.forEach((d) => (d.visible = true));
          for (const n of ['typed', 'shield', 'sub']) ui[n].style.opacity = 0;
          phone.visible = true;
          phone.position.copy(PHONE_REST);
          phone.rotation.set(0, 0.6, 0);
          phoneLight.intensity = 1.5;
          shot = shots.length - 2;
          next();
        }
      }
      const s = shots[shot];
      for (const [time, user, msg] of s.chat || []) if (t >= time && t - dt < time) chat(user, msg);
      const secs = 47 * 60 + 2 + Math.floor(clock);
      const mm = String(Math.floor(secs / 60)).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0');
      ui.stamp.textContent = `OCT 31 2026  11:${mm}:${ss} PM`;
      if (ext.scene.children.includes(cam)) ext.update(dt, cam);
      cam.aspect = ctx.aspect();
      cam.updateProjectionMatrix();
      s.update(t, dt);
      updateMayaLight(dt);
      if (t >= s.dur) next();
    },
  };
}
