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

export function writingTex(text) {
  const t = makeTex(256, 64, 5, (g, w, h, r) => {
    g.clearRect(0, 0, w, h);
    g.font = 'bold 34px "Special Elite", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(90,0,0,0.92)';
    g.fillText(text, w / 2, h / 2 - 4);
    // drips
    for (let i = 0; i < 14; i++) {
      const x = 30 + r() * 196;
      g.fillRect(x, h / 2 + 4, 1 + Math.round(r()), 4 + r() * 20);
    }
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
