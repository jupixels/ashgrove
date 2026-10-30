// "The Night Before": a short playable opening as Maya, scouting the hospital alone with her phone the night before
// she brings Sam. She sets her camera down at the end of the hall... and something at the far end comes for her.
// She gets out. She never tells Sam. Then the intro plays.
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const cellPos = (x, z) => V(x * 2 + 1, 0, z * 2 + 1);
export const PROLOGUE_START = { x: 12.4, z: 12.3, yaw: -Math.PI / 2 }; // inside the side door, facing down the hall

export function createPrologue(ctx) {
  const { audio, ui, player, monster, fx } = ctx;
  const CAMERA_SPOT = cellPos(20, 5);
  const EXIT = [1, 7, 5, 6]; // back where she came in
  let state = 'off', t = 0, skipT = 0, hum = null, camMesh = null;
  const saved = { color: new THREE.Color(), intensity: 0 };
  const say = (name, text, secs) => {
    if (audio.buffers && audio.buffers[name]) audio.play(name, { volume: 1 });
    ui.say('Maya', text, secs * 1000);
  };
  const inCells = (x0, x1, z0, z1) => {
    const [x, z] = ctx.floor.cellOf(player.position);
    return x >= x0 && x <= x1 && z >= z0 && z <= z1;
  };

  function finish(caught) {
    if (state === 'done') return;
    state = 'done';
    if (hum) { hum.stop(0.5); hum = null; }
    player.frozen = true;
    fx.fadeTarget = 1;
    if (caught) { audio.play('monster_scream', { volume: 1 }); fx.shake = 0.8; fx.fade = 1; }
    monster.group.visible = false;
    monster.mode = 'off';
    setTimeout(() => ui.chapter('She never told Sam what she saw.', ''), caught ? 600 : 1400);
    setTimeout(() => ui.chapter('THE NEXT NIGHT', ''), 5600);
    setTimeout(() => {
      player.flashlight.color.copy(saved.color);
      ctx.onDone();
    }, 9200);
  }

  return {
    get active() { return state !== 'off' && state !== 'done'; },
    start() {
      this.l1 = this.bang = this.hum = this.run = false;
      state = 'walk';
      t = 0;
      skipT = 0;
      // her phone light: cooler and a little weaker than Sam's torch
      saved.color.copy(player.flashlight.color);
      player.flashlight.color.set(0xdde6ff);
      player.battery = 0.85;
      fx.fade = 1;
      fx.fadeTarget = 0;
      ui.chapter('THE NIGHT BEFORE', 'MAYA');
      ui.objective('Find a good spot for the camera. The end of the hall.');
    },
    update(dt) {
      if (state === 'off' || state === 'done') return;
      t += dt;
      // hold Space to skip
      skipT = player.keys.Space ? skipT + dt : 0;
      ui.prompt(skipT > 0 ? `Skipping... ${Math.round((skipT / 1.5) * 100)}%` : t < 12 ? '[Hold Space] Skip' : '');
      if (skipT > 1.5) { finish(false); return; }

      if (state === 'walk') {
        if (t > 2 && !this.l1) { this.l1 = true; say('maya_pro_1', "Okay. Ashgrove Memorial, night one. Nobody's been in here since ninety-seven.", 4.5); }
        if (player.position.distanceTo(CAMERA_SPOT.clone().setY(player.position.y)) < 2.2) {
          state = 'camera';
          t = 0;
          audio.play('keycard_beep', { volume: 0.4 });
          camMesh = new THREE.Group(); // her phone on a little tripod, recording
          const legs = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 3, 1, true), new THREE.MeshLambertMaterial({ color: 0x222222 }));
          legs.position.y = 0.15;
          const ph = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.01), new THREE.MeshBasicMaterial({ color: 0x9fc4ff }));
          ph.position.y = 0.36;
          camMesh.add(legs, ph);
          camMesh.position.copy(CAMERA_SPOT);
          ctx.floor.add(camMesh);
          say('maya_pro_2', 'Perfect. And... rolling.', 2.5);
        }
      } else if (state === 'camera') {
        if (t > 3 && !this.bang) {
          this.bang = true;
          ctx.floor.onSound('door_creak_open', cellPos(36, 5), 1);
          audio.play('metal_shutter_slam', { volume: 0.5, pos: cellPos(38, 5) });
        }
        if (t > 4.5 && !this.hum) {
          this.hum = true;
          hum = audio.loop('monster_humming', 0.5, cellPos(35, 5));
          say('maya_pro_3', '...Hello? Is someone there?', 3);
        }
        if (t > 8) {
          // there: at the far end of the hall, in the edge of her light
          state = 'seen';
          t = 0;
          monster.mode = 'script';
          monster.show(cellPos(34, 5), player.position);
          monster.anim('idle', { fade: 0 });
          ctx.fx.aberration = 0.6;
        }
      } else if (state === 'seen') {
        monster.group.lookAt(player.position.x, 0, player.position.z);
        if (t > 2.2 && !this.run) {
          this.run = true;
          say('maya_pro_4', 'Nope. Nope nope nope.', 2);
          ui.objective('Get out. Back the way you came.');
          monster.anim('walk', { fade: 0.2 });
          audio.play('monster_growl_distant', { volume: 0.8, pos: monster.group.position });
        }
        if (this.run) {
          // it walks after her: it doesn't need to hurry
          const to = player.position.clone().setY(0).sub(monster.group.position.clone().setY(0));
          const d = to.length();
          monster.group.position.addScaledVector(to.normalize(), Math.min(d, 2.0 * dt));
          if (d < 1.2) { finish(true); return; }
          if (inCells(...EXIT)) finish(false);
        }
      }
    },
    stop() {
      if (hum) { hum.stop(0.2); hum = null; }
      if (camMesh && camMesh.parent) camMesh.parent.remove(camMesh);
      state = 'off';
    },
  };
}
