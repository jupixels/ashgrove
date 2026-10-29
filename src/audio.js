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
  monster_clicking: 'monster/monster_clicking.mp3',
  monster_sniff: 'monster/monster_sniff.mp3',
  monster_humming: 'monster/monster_humming.mp3',
  monster_ceiling_crawl: 'monster/monster_ceiling_crawl.mp3',
  monster_ceiling_burst: 'monster/monster_ceiling_burst.mp3',
  kill_grab_gore: 'monster/kill_grab_gore.mp3',
  stitching_sound: 'monster/stitching_sound.mp3',
  jumpscare_sting_2: 'scares/jumpscare_sting_2.mp3',
  glass_shatter_grab: 'scares/glass_shatter_grab.mp3',
  jumpscare_sting_1: 'scares/jumpscare_sting_1.mp3',
  lights_slam_on: 'scares/lights_slam_on.mp3',
  // gameplay
  locker_open: 'sfx/locker_open.mp3',
  locker_close_hide: 'sfx/locker_close_hide.mp3',
  hold_breath_gasp: 'sfx/hold_breath_gasp.mp3',
  knock_over_tray: 'sfx/knock_over_tray.mp3',
  glass_crunch_step: 'sfx/glass_crunch_step.mp3',
  pickup_paper: 'sfx/pickup_paper.mp3',
  cassette_insert_play: 'sfx/cassette_insert_play.mp3',
  keycard_denied: 'sfx/keycard_denied.mp3',
  door_locked_rattle: 'sfx/door_locked_rattle.mp3',
  phone_camera_raise: 'sfx/phone_camera_raise.mp3',
  elevator_ding_broken: 'sfx/elevator_ding_broken.mp3',
  drawer_morgue_slide: 'sfx/drawer_morgue_slide.mp3',
  monster_footstep_heavy: 'monster/monster_footstep_heavy.mp3',
  heart_monitor_beep: 'scares/heart_monitor_beep.mp3',
  heart_monitor_flatline: 'scares/heart_monitor_flatline.mp3',
  heartbeat_slow: 'ambience/heartbeat_slow.mp3',
  // floor ambiences and music
  morgue_ambience: 'ambience/morgue_ambience.mp3',
  boiler_room: 'ambience/boiler_room.mp3',
  pediatrics_ambience: 'ambience/pediatrics_ambience.mp3',
  fluorescent_buzz: 'ambience/fluorescent_buzz.mp3',
  rain_outside_muffled: 'ambience/rain_outside_muffled.mp3',
  chase_tension: 'ambience/chase_tension.mp3',
  // story voices
  voss_tape_1: 'voice/voss_tape_1.mp3',
  voss_tape_2: 'voice/voss_tape_2.mp3',
  voss_tape_3: 'voice/voss_tape_3.mp3',
  voss_tape_4: 'voice/voss_tape_4.mp3',
  voss_tape_5: 'voice/voss_tape_5.mp3',
  voss_tape_6: 'voice/voss_tape_6.mp3',
  voss_tape_7: 'voice/voss_tape_7.mp3',
  voss_tape_8: 'voice/voss_tape_8.mp3',
  voss_leaving: 'voice/voss_leaving.mp3',
  pa_doctor_call: 'voice/pa_doctor_call.mp3',
  pa_sam_call: 'voice/pa_sam_call.mp3',
  maya_walkie_2: 'voice/maya_walkie_2.mp3',
  maya_walkie_3: 'voice/maya_walkie_3.mp3',
  maya_fake: 'voice/maya_fake.mp3',
  maya_rescued: 'voice/maya_rescued.mp3',
  maya_table: 'voice/maya_table.mp3',
  maya_left_behind: 'voice/maya_left_behind.mp3',
  maya_together: 'voice/maya_together.mp3',
  sam_found_maya: 'voice/sam_found_maya.mp3',
  sam_run: 'voice/sam_run.mp3',
  // opening cutscene
  car_rain_interior: 'sfx/car_rain_interior.mp3',
  car_door: 'sfx/car_door.mp3',
  dog_bark_distant: 'sfx/dog_bark_distant.mp3',
  tension_riser: 'scares/tension_riser.mp3',
  music_box_lullaby: 'scares/music_box_lullaby.mp3',
  wheelchair_roll: 'scares/wheelchair_roll.mp3',
  fence_rattle: 'sfx/fence_rattle.mp3',
  pa_crackle: 'sfx/pa_crackle.mp3',
  vent_scrape_drag: 'sfx/vent_scrape_drag.mp3',
  phone_drop: 'sfx/phone_drop.mp3',
  walkie_static: 'sfx/walkie_static.mp3',
  metal_shutter_slam: 'scares/metal_shutter_slam.mp3',
  maya_intro: 'voice/maya_intro.mp3',
  maya_window: 'voice/maya_window.mp3',
  maya_signin: 'voice/maya_signin.mp3',
  maya_door: 'voice/maya_door.mp3',
  maya_scream: 'voice/maya_scream.mp3',
  maya_walkie_1: 'voice/maya_walkie_1.mp3',
  sam_hi: 'voice/sam_hi.mp3',
  sam_comeback: 'voice/sam_comeback.mp3',
  sam_scream: 'voice/sam_scream.mp3',
  sam_walkie: 'voice/sam_walkie.mp3',
  pa_lockdown: 'voice/pa_lockdown.mp3',
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

  // A looping sound with a fade-out stop. Falls back to filtered noise (rain/hiss) if the file is missing.
  loop(name, volume = 1) {
    const g = this.ctx.createGain();
    g.gain.value = volume;
    g.connect(this.master);
    let src;
    if (this.buffers[name]) {
      src = this.ctx.createBufferSource();
      src.buffer = this.buffers[name];
      src.loop = true;
      src.connect(g);
    } else {
      src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 400;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3500;
      g.gain.value = volume * 0.18;
      src.connect(hp).connect(lp).connect(g);
    }
    src.start();
    return {
      gain: g,
      stop: (fade = 0.8) => {
        const t = this.ctx.currentTime;
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(0, t + fade);
        src.stop(t + fade + 0.05);
      },
    };
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
    locker_open(v) { this.noiseBurst(v * 0.5, 1400, 3, 0.01, 0.25); this.tone('square', 220, 160, v * 0.05, 0.2); },
    locker_close_hide(v) { this.noiseBurst(v * 0.4, 600, 1, 0.003, 0.12); },
    hold_breath_gasp(v) { this.noiseBurst(v * 0.7, 1800, 0.8, 0.02, 0.5); },
    knock_over_tray(v) { for (let i = 0; i < 7; i++) setTimeout(() => this.noiseBurst(v * 0.8, 3000 + Math.random() * 3000, 8, 0.002, 0.15), i * 60 + Math.random() * 60); },
    glass_crunch_step(v) { this.noiseBurst(v * 0.6, 5000, 2, 0.002, 0.08); setTimeout(() => this.noiseBurst(v * 0.4, 6500, 3, 0.002, 0.06), 40); },
    keycard_denied(v) { this.tone('square', 160, 160, v * 0.12, 0.35); },
    door_locked_rattle(v) { for (let i = 0; i < 4; i++) setTimeout(() => this.noiseBurst(v * 0.4, 900, 4, 0.002, 0.07), i * 90); },
    monster_footstep_heavy(v) { this.tone('sine', 70, 35, v * 0.7, 0.18); this.noiseBurst(v * 0.3, 300, 1, 0.005, 0.12); },
    drawer_morgue_slide(v) { this.noiseBurst(v * 0.5, 700, 2, 0.1, 0.8); },
    elevator_ding_broken(v) { this.tone('sine', 880, 820, v * 0.25, 1.2); setTimeout(() => this.noiseBurst(v * 0.5, 400, 1, 0.2, 1.2), 600); },
    cassette_insert_play(v) { this.noiseBurst(v * 0.4, 2500, 3, 0.002, 0.06); setTimeout(() => this.noiseBurst(v * 0.15, 3000, 0.5, 0.05, 0.6), 200); },
    pickup_paper(v) { this.noiseBurst(v * 0.25, 4000, 1, 0.02, 0.15); },
    phone_camera_raise(v) { this.tone('sine', 1500, 1800, v * 0.06, 0.08); },
    heart_monitor_beep(v) { this.tone('sine', 1000, 1000, v * 0.15, 0.12); },
    heart_monitor_flatline(v) { this.tone('sine', 1000, 1000, v * 0.15, 4); },
    car_door(v) { this.noiseBurst(v * 0.5, 900, 1, 0.003, 0.15); this.tone('sine', 90, 50, v * 0.5, 0.2); },
    fence_rattle(v) { for (let i = 0; i < 6; i++) setTimeout(() => this.noiseBurst(v * 0.4, 2500 + Math.random() * 1500, 6, 0.002, 0.08), i * 70); },
    metal_shutter_slam(v) { this.noiseBurst(v * 1.2, 300, 0.7, 0.003, 1.4); this.tone('sawtooth', 70, 30, v * 0.6, 1.2); },
    pa_crackle(v) { this.noiseBurst(v * 0.35, 1800, 2, 0.05, 0.8); this.tone('sine', 60, 60, v * 0.15, 1.0); },
    phone_drop(v) { this.noiseBurst(v * 0.6, 3000, 4, 0.001, 0.05); setTimeout(() => this.noiseBurst(v * 0.35, 3500, 4, 0.001, 0.04), 110); },
    vent_scrape_drag(v) { for (let i = 0; i < 5; i++) setTimeout(() => this.noiseBurst(v * 0.5, 600 + i * 250, 3, 0.05, 0.35), i * 260); },
    walkie_static(v) { this.noiseBurst(v * 0.5, 2200, 0.6, 0.01, 0.7, 'bandpass'); },
    maya_scream(v) {
      // placeholder only: a rising, falling shriek (the ElevenLabs scream replaces it)
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(700, t);
      o.frequency.linearRampToValueAtTime(1100, t + 0.4);
      o.frequency.exponentialRampToValueAtTime(500, t + 1.6);
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1200;
      const g = this.ctx.createGain();
      this.env(g, t, v * 0.25, 0.05, 1.6);
      o.connect(f).connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 1.8);
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
  }
}
