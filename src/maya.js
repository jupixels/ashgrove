// Maya: the Mixamo girl (Ch02) with walking, breathing-idle and scared-idle animations (tools/convert_mixamo.py).
// One rig for the whole game: the opening cutscene and the Ward C rescue both use it.
import * as THREE from 'three';
import { psx } from './engine.js';

export function setupMaya(gltf) {
  const model = gltf.scene;
  model.traverse((o) => {
    if (!o.isMesh) return;
    const map = o.material.map;
    if (map) map.magFilter = map.minFilter = THREE.NearestFilter;
    const hair = o.material.name.includes('hair');
    o.material = psx(new THREE.MeshLambertMaterial({ map, alphaTest: hair ? 0.5 : 0, side: hair ? THREE.DoubleSide : THREE.FrontSide }));
    o.castShadow = true;
    o.frustumCulled = false;
  });
  const group = new THREE.Group();
  group.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const clip of gltf.animations) {
    // walk in place: we move her ourselves, so lock the hips except vertically
    const hips = clip.tracks.find((t) => t.name.endsWith('Hips.position'));
    if (hips) {
      const v = hips.values;
      const size = [0, 1, 2].map((a) => Math.abs(v[a]));
      const up = size.indexOf(Math.max(...size));
      for (let i = 0; i < v.length; i += 3) for (let a = 0; a < 3; a++) if (a !== up) v[i + a] = v[a];
    }
    actions[clip.name] = mixer.clipAction(clip);
  }
  // start in the breathing idle at full weight so she never shows her bind (T) pose
  let current = actions.idle || null;
  if (current) current.play();
  mixer.update(0);
  return {
    group,
    mixer,
    hand: model.getObjectByName('mixamorigRightHand'),
    play(name, speed = 1) {
      const a = actions[name];
      if (!a) return;
      if (a === current) { a.setEffectiveTimeScale(speed); return; }
      a.reset().setEffectiveTimeScale(speed).fadeIn(0.3).play();
      if (current) current.fadeOut(0.3);
      current = a;
    },
  };
}
