// Procedural textures (low-res, PSX style) for things the asset packs don't cover.
import * as THREE from 'three';

function rng(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function makeTex(w, h, seed, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h, rng(seed));
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function blob(g, x, y, r, color) {
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

function noise(g, w, h, r, amount) {
  const img = g.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * amount;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

// draw text centred at (x, y), shrinking the font until it fits maxW: nothing ever runs off a texture's edge
function fitText(g, text, x, y, maxW, px, family = 'sans-serif', weight = 'bold') {
  g.font = `${weight} ${px}px ${family}`;
  const w = g.measureText(text).width;
  if (w > maxW) g.font = `${weight} ${Math.floor(px * maxW / w)}px ${family}`;
  g.fillText(text, x, y);
  return Math.min(w, maxW);
}

export function ceilingTex() {
  return makeTex(64, 64, 23, (g, w, h, r) => {
    g.fillStyle = '#7d7b6e';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(40,38,30,0.6)';
    for (let i = 0; i < 160; i++) g.fillRect(r() * w, r() * h, 1, 1);
    g.fillStyle = '#3a3a33';
    g.fillRect(0, 0, w, 2);
    g.fillRect(0, 0, 2, h);
    g.fillRect(31, 0, 2, h);
    g.fillRect(0, 31, w, 2);
    for (let i = 0; i < 4; i++) blob(g, r() * w, r() * h, 6 + r() * 16, 'rgba(90,60,20,0.55)');
    // one missing tile
    if (r() > 0.4) {
      g.fillStyle = '#050505';
      g.fillRect(33, 33, 31, 31);
    }
    noise(g, w, h, r, 16);
  });
}

export function writingTex(text, color = 'rgba(90,0,0,0.92)') {
  const t = makeTex(256, 64, 5, (g, w, h, r) => {
    g.clearRect(0, 0, w, h);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = color;
    const tw = fitText(g, text, w / 2, h / 2 - 4, w - 24, 34, '"Special Elite", serif');
    // drips, only under the letters
    for (let i = 0; i < 14; i++) {
      const x = (w - tw) / 2 + 4 + r() * (tw - 8);
      g.fillRect(x, h / 2 + 4, 1 + Math.round(r()), 4 + r() * 20);
    }
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Morgue drawer fronts: a grid of steel doors with handles and number plates.
export function drawersTex() {
  return makeTex(128, 64, 211, (g, w, h, r) => {
    g.fillStyle = '#5e605c';
    g.fillRect(0, 0, w, h);
    g.font = 'bold 7px sans-serif';
    g.textAlign = 'center';
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const x = col * 32, y = row * 32;
        g.fillStyle = '#7a7c77';
        g.fillRect(x + 2, y + 2, 28, 28);
        g.fillStyle = '#2a2b29';
        g.fillRect(x + 10, y + 18, 12, 3);
        g.fillStyle = '#d8d4c4';
        g.fillRect(x + 11, y + 6, 10, 7);
        g.fillStyle = '#222';
        g.fillText(String(1 + col + row * 4 + (r() < 0 ? 0 : 0)), x + 16, y + 12);
      }
    }
    for (let i = 0; i < 8; i++) blob(g, r() * w, r() * h, 4 + r() * 10, 'rgba(60,40,20,0.5)');
    noise(g, w, h, r, 18);
  });
}

// A child's crayon drawing of the monster: a tall scribbled figure with many mouths.
export function crayonTex(seed = 1) {
  const t = makeTex(64, 64, 300 + seed, (g, w, h, r) => {
    g.fillStyle = '#e8e2cc';
    g.fillRect(4, 4, w - 8, h - 8);
    g.lineWidth = 2;
    g.strokeStyle = '#1a1a1a';
    g.beginPath(); // tall body
    g.moveTo(32, 14); g.lineTo(30, 46); g.lineTo(24, 58); g.moveTo(30, 46); g.lineTo(36, 58);
    g.moveTo(31, 22); g.lineTo(16, 40); g.moveTo(31, 22); g.lineTo(46, 40);
    g.stroke();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(32, 12, 6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#b01010'; // mouths
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(28 + r() * 8, 20 + i * 6, 2, 0, Math.PI); g.stroke(); }
    g.strokeStyle = '#3050c0'; // a small child figure
    g.beginPath(); g.moveTo(12, 50); g.lineTo(12, 58); g.moveTo(9, 53); g.lineTo(15, 53); g.stroke();
    g.beginPath(); g.arc(12, 47, 2.5, 0, Math.PI * 2); g.stroke();
    noise(g, w, h, r, 10);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Broken glass on the floor: glinting shards.
export function glassTex() {
  const t = makeTex(64, 64, 401, (g, w, h, r) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const x = 8 + r() * 48, y = 8 + r() * 48, s = 1 + r() * 4;
      g.fillStyle = `rgba(${180 + r() * 60},${200 + r() * 55},${210 + r() * 45},${0.5 + r() * 0.5})`;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y + s * 0.4); g.lineTo(x + s * 0.3, y + s); g.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// A painted or lit sign (STAIRS, ELEVATOR, EXIT...).
export function signTex(text, bg = '#1c3a1e', fg = '#e8f0d8') {
  const t = makeTex(128, 32, 77, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    fitText(g, text, w / 2, h / 2 + 1, w - 10, 18);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// faded hospital posters for the corridor walls
const POSTERS = [
  ['WASH', 'YOUR HANDS', '#2a5a7a'], ['QUIET', 'PLEASE', '#6a2a2a'], ['VISITING', 'HOURS 2-8 PM', '#3a5a3a'],
  ['FLU SHOTS', 'ASK A NURSE', '#7a6a2a'], ['NO', 'SMOKING', '#7a2a2a'], ['CHILDREN', 'MUST BE ACCOMPANIED', '#4a3a6a'],
];
export function posterTex(n) {
  const [a, b, color] = POSTERS[n % POSTERS.length];
  return makeTex(48, 64, 300 + n, (g, w, h, r) => {
    g.fillStyle = '#c8c0a8';
    g.fillRect(0, 0, w, h);
    g.fillStyle = color;
    g.fillRect(3, 3, w - 6, 26);
    g.fillStyle = '#e8e0cc';
    g.textAlign = 'center';
    fitText(g, a, w / 2, 19, w - 8, 9);
    g.fillStyle = '#2a2620';
    fitText(g, b, w / 2, 40, w - 6, 6);
    g.fillStyle = color;
    g.beginPath(); g.arc(w / 2, 52, 6, 0, Math.PI * 2); g.fill(); // a little icon
    for (let i = 0; i < 6; i++) blob(g, r() * w, r() * h, 4 + r() * 10, 'rgba(90,70,30,0.35)'); // water damage
    if (r() < 0.5) { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(w - 14 - r() * 10, 0, 30, 10 + r() * 12); } // a torn corner
    noise(g, w, h, r, 30);
  });
}

// a sheet of paper on the floor (charts, forms)
export function paperTex(n) {
  return makeTex(16, 22, 500 + n, (g, w, h, r) => {
    g.fillStyle = '#d8d2c0';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(40,40,60,0.55)';
    for (let y = 3; y < h - 2; y += 2) g.fillRect(2, y, 4 + r() * (w - 6), 1);
    blob(g, r() * w, r() * h, 6, 'rgba(70,60,40,0.4)');
  });
}

// a puddle: dark, with a faint sheen
export function puddleTex(seed = 1) {
  return makeTex(64, 64, 700 + seed, (g, w, h, r) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) blob(g, w / 2 + (r() - 0.5) * 26, h / 2 + (r() - 0.5) * 26, 10 + r() * 14, 'rgba(6,8,10,0.55)');
    for (let i = 0; i < 4; i++) blob(g, w / 2 + (r() - 0.5) * 24, h / 2 + (r() - 0.5) * 24, 4 + r() * 6, 'rgba(120,130,140,0.18)');
  });
}

// a bloody sneaker print (Maya's): sole and heel with tread lines
export function footprintTex(left) {
  const t = makeTex(32, 64, left ? 900 : 901, (g, w, h, r) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(80,4,4,0.85)';
    g.beginPath(); g.ellipse(w / 2 + (left ? 1 : -1), 20, 10, 16, 0, 0, Math.PI * 2); g.fill(); // ball of the foot
    g.beginPath(); g.ellipse(w / 2, 50, 8, 10, 0, 0, Math.PI * 2); g.fill();                     // heel
    g.fillStyle = 'rgba(0,0,0,0.5)';
    for (let y = 8; y < 60; y += 5) if (y < 36 || y > 41) g.fillRect(6, y, w - 12, 1);            // tread
    for (let i = 0; i < 40; i++) { g.clearRect(r() * w, r() * h, 2, 2); }                          // patchy
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
