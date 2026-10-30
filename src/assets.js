// Loads models and textures from assets/. Everything here is game-ready (converted from assets/raw).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'; // the characters are meshopt-compressed (~800 KB instead of ~3 MB)

// this build's version ("?v=...", stamped by tools/stamp_version.py) so updated files are never served from cache
export const VERSION = new URL(import.meta.url).search;

const MODELS = {
  bed: 'hospital/bed_1.glb',
  gurney: 'hospital/bed_2.glb',
  opchair: 'hospital/bed_4.glb',
  cupboard: 'hospital/cupboard_bottom.glb',
  cupboardTop: 'hospital/cupboard_top.glb',
  monitor: 'hospital/machine_1.glb',
  machine: 'hospital/machine_2.glb',
  tray: 'hospital/tray_1.glb',
  monster: 'monster.glb',
  maya: 'maya.glb',
};

const IMAGES = {
  floor: 'floor_tile.png',
  floorGrey: 'floor_tile_grey.png',
  wallUpper: 'wall_upper.png',
  wallLower: 'wall_lower.png',
  drips: 'drips.png',
  metal: 'metal.png',
  stain1: 'stain_01.png',
  stain2: 'stain_02.png',
  stain3: 'stain_03.png',
  stain4: 'stain_04.png',
  stain5: 'stain_05.png',
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function pixelTexture(source) {
  const t = source.isTexture ? source : new THREE.Texture(source);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

// Hospital wall: stained plaster on top, dark green paint below, rust drips running down.
function composeWall(img) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 192;
  const g = c.getContext('2d');
  const split = 118;
  g.drawImage(img.wallUpper, 0, 0, 128, split);
  g.drawImage(img.wallLower, 0, split, 128, 192 - split);
  g.fillStyle = 'rgba(40,60,40,0.35)';
  g.fillRect(0, split, 128, 192 - split);
  g.fillStyle = '#1e2219';
  g.fillRect(0, split - 3, 128, 5);
  g.globalAlpha = 0.85;
  g.drawImage(img.drips, 0, 0, 128, 150);
  g.globalAlpha = 1;
  const grad = g.createLinearGradient(0, 160, 0, 192);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(10,8,4,0.8)');
  g.fillStyle = grad;
  g.fillRect(0, 160, 128, 32);
  return pixelTexture(c);
}

export async function loadAssets(onProgress) {
  const gltf = new GLTFLoader()
  gltf.setMeshoptDecoder(MeshoptDecoder);
  let done = 0;
  const total = Object.keys(MODELS).length + Object.keys(IMAGES).length;
  const tick = () => onProgress && onProgress(++done / total);

  const img = {};
  const models = {};
  await Promise.all([
    ...Object.entries(IMAGES).map(async ([k, f]) => { img[k] = await loadImage('assets/textures/' + f + VERSION); tick(); }),
    ...Object.entries(MODELS).map(async ([k, f]) => { models[k] = await gltf.loadAsync('assets/models/' + f + VERSION); tick(); }),
  ]);

  return {
    models,
    tex: {
      floor: pixelTexture(img.floor),
      floorGrey: pixelTexture(img.floorGrey),
      wall: composeWall(img),
      metal: pixelTexture(img.metal),
      blood: [img.stain1, img.stain2, img.stain3].map((i) => pixelTexture(i)),
      grime: [img.stain4, img.stain5].map((i) => pixelTexture(i)),
    },
  };
}
