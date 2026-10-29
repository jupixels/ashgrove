// Audio: plays the ElevenLabs files from assets/audio if they exist, otherwise a synthesized placeholder.

// footstep_tile_1..8 are loaded separately: any that exist get used (see tools/split_steps.py).
const FOOTSTEPS = 8;

const FILES = {
  hospital_drone: 'ambience/hospital_drone.mp3',
  hallway_room_tone: 'ambience/hallway_room_tone.mp3',
  heartbeat_fast: 'ambience/heartbeat_fast.mp3',
  flashlight_click: 'sfx/flashlight_click.mp3',
  breathing_scared: 'sfx/breathing_scared.mp3',
  battery_insert: 'sfx/battery_insert.mp3',
  keycard_beep: 'sfx/keycard_beep.mp3',
  monster_breathing: 'monster/monster_breathing.mp3',
  monster_drag_tubes: 'monster/monster_drag_tubes.mp3',
  door_creak_open: 'sfx/door_creak_open.mp3',
  monster_scream: 'monster/monster_scream.mp3',
  monster_growl_distant: 'monster/monster_growl_distant.mp3',
  jumpscare_sting_1: 'scares/jumpscare_sting_1.mp3',
  lights_slam_on: 'scares/lights_slam_on.mp3',
};

export class GameAudio {
  async init() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.buffers = {};
    this.noiseBuf = this.makeNoise();
    const steps = Array.from({ length: FOOTSTEPS }, (_, i) => ['footstep_tile_' + (i + 1), `sfx/footstep_tile_${i + 1}.mp3`]);
    await Promise.all([...Object.entries(FILES), ...steps].map(([name, path]) => this.tryLoad(name, 'assets/audio/' + path)));
    this.steps = steps.map(([name]) => name).filter((name) => this.buffers[name]);
    this.lastStep = -1;
  }

  async tryLoad(name, path) {
    try {
      const res = await fetch(path);
      if (!res.ok) return;
      this.buffers[name] = await this.ctx.decodeAudioData(await res.arrayBuffer());
    } catch (e) { /* missing file: use synth fallback */ }
  }

  makeNoise() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // brownish
      d[i] = white * 0.5 + last * 3;
    }
    return buf;
  }

  // Play a sound by name. Returns { stop() } for loops.
  play(name, { volume = 1, rate = 1, loop = false } = {}) {
    const buf = this.buffers[name];
    if (buf) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = loop;
      src.playbackRate.value = rate;
      const g = this.ctx.createGain();
      g.gain.value = volume;
      src.connect(g).connect(this.master);
      src.start();
      return { stop: () => src.stop(), gain: g };
    }
    const synth = this.synth[name];
    return synth ? synth.call(this, volume) : null;
  }

  // pace: 'sneak' (crouched), 'walk' or 'run'
  footstep(pace) {
    const running = pace === 'run';
    const level = { sneak: 0.12, walk: 0.3, run: 0.55 }[pace];
    if (!this.steps.length) return this.play('footstep', { volume: level * 1.7 });
    // never the same clip twice in a row, plus slight pitch/volume variation so it doesn't sound looped
    let i = Math.floor(Math.random() * this.steps.length);
    if (i === this.lastStep && this.steps.length > 1) i = (i + 1) % this.steps.length;
    this.lastStep = i;
    const volume = level * (0.85 + Math.random() * 0.3);
    this.play(this.steps[i], { volume, rate: (running ? 1.05 : 0.95) + Math.random() * 0.1 });
  }

  // --- helpers for synth fallbacks ---
  env(node, t0, peak, attack, decay) {
    node.gain.setValueAtTime(0.0001, t0);
    node.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  noiseBurst(volume, freq, q, attack, decay, type = 'bandpass') {
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    this.env(g, t, volume, attack, decay);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + attack + decay + 0.05);
  }

  tone(type, f0, f1, volume, dur) {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain();
    this.env(g, t, volume, 0.01, dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  synth = {
    footstep(v) { this.noiseBurst(v * 0.6, 900, 0.8, 0.005, 0.09); this.tone('sine', 90, 50, v * 0.25, 0.08); },
    flashlight_click(v) { this.noiseBurst(v * 0.5, 3500, 3, 0.001, 0.03); },
    battery_insert(v) { this.noiseBurst(v * 0.5, 2500, 4, 0.001, 0.04); setTimeout(() => this.noiseBurst(v * 0.5, 2000, 4, 0.001, 0.05), 120); },
    keycard_beep(v) { this.tone('square', 1200, 1200, v * 0.15, 0.12); },
    flicker(v) { this.noiseBurst(v * 0.35, 4000, 1, 0.002, 0.06, 'highpass'); },
    heartbeat(v) { this.tone('sine', 70, 40, v * 0.9, 0.15); setTimeout(() => this.tone('sine', 60, 35, v * 0.6, 0.15), 180); },
    monster_growl_distant(v) {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(55, t);
      o.frequency.linearRampToValueAtTime(38, t + 2.5);
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 300;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v * 0.35, t + 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
      o.connect(f).connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 3);
      this.noiseBurst(v * 0.3, 200, 2, 0.5, 2.2);
    },
    jumpscare_sting_1(v) {
      this.noiseBurst(v * 1.2, 2500, 0.5, 0.005, 1.2);
      [311, 330, 466, 622, 740].forEach((f) => this.tone('sawtooth', f * (1 + Math.random() * 0.03), f * 0.5, v * 0.18, 1.4));
      this.tone('sine', 80, 30, v * 1.0, 1.0);
    },
    monster_scream(v) {
      [400, 520, 690].forEach((f) => this.tone('sawtooth', f, f * 1.6, v * 0.15, 1.2));
      this.noiseBurst(v, 1800, 1, 0.01, 1.3);
    },
    lights_slam_on(v) { for (let i = 0; i < 4; i++) setTimeout(() => this.tone('square', 60, 40, v * 0.4, 0.2), i * 140); },
  };

  // Low dread drone that runs the whole game.
  startAmbience() {
    if (this.buffers.hospital_drone) this.play('hospital_drone', { volume: 0.6, loop: true });
    if (this.buffers.hallway_room_tone) this.play('hallway_room_tone', { volume: 0.5, loop: true });
    if (this.buffers.hospital_drone) return;
    const t = this.ctx.currentTime;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 180;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 4);
    f.connect(g).connect(this.master);
    [41.2, 41.7, 61.7].forEach((freq) => {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.connect(f);
      o.start();
    });
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 80;
    lfo.connect(lfoGain).connect(f.frequency);
    lfo.start();
    const air = this.ctx.createBufferSource();
    air.buffer = this.noiseBuf;
    air.loop = true;
    const af = this.ctx.createBiquadFilter();
    af.type = 'bandpass';
    af.frequency.value = 400;
    af.Q.value = 0.4;
    const ag = this.ctx.createGain();
    ag.gain.value = 0.025;
    air.connect(af).connect(ag).connect(this.master);
    air.start();
  }
}
