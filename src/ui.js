// Everything on screen that isn't the 3D world: HUD, subtitles, menus, notes, keypad, death and ending screens.
import { DEFAULT_KEYS } from './player.js';
const $ = (id) => document.getElementById(id);

// tips for the loading screen and the death screen
const TIPS = [
  'It hunts by sound. Walking is quieter than running, and crouching is quieter still.',
  'Hold your breath (Space) when it comes close to where you are hiding. Not for too long.',
  'If it watches you climb into a locker, it knows where you are.',
  'Throw a bottle or a brick (G or left-click) to send it somewhere else.',
  'Lean round corners with Q and E before you step out.',
  'Broken glass crunches. Trays clatter. Watch where you step.',
  'Payphones save your progress. Something is always breathing on the line.',
  'Your phone camera (R) sees things your eyes do not.',
  'There are eight of Dr. Voss\'s tapes. Find them all.',
  'Under a bed, you can see its feet coming. It can see your light.',
  'Your journal (J) has a map of everywhere you have been.',
];
export const randomTip = () => TIPS[Math.floor(Math.random() * TIPS.length)];
const KEY_LABELS = {
  forward: 'Move forward', back: 'Move back', left: 'Move left', right: 'Move right', run: 'Run', crouch: 'Crouch',
  leanLeft: 'Lean left', leanRight: 'Lean right', use: 'Use / hide', flashlight: 'Flashlight', phone: 'Phone camera',
  throw: 'Throw', breath: 'Hold breath', journal: 'Journal', controls: 'Controls',
};
export const keyName = (code) => (code || '?').replace(/^Key/, '').replace(/^Digit/, '').replace(/Left$|Right$/, '').replace('Arrow', '↑→↓←'.includes(code) ? '' : 'Arrow ');

export function createUI() {
  const el = {
    title: $('title'), loading: $('loading'), mainMenu: $('mainMenu'),
    pause: $('pause'), pauseStats: $('pauseStats'), settings: $('settings'),
    note: $('note'), noteTitle: $('noteTitle'), noteText: $('noteText'),
    keypad: $('keypad'), keypadLabel: $('keypadLabel'), keypadDisplay: $('keypadDisplay'), keypadPad: $('keypadPad'),
    death: $('death'), deathText: $('deathText'), ending: $('ending'), endingText: $('endingText'),
    credits: $('credits'), creditsRoll: $('creditsRoll'), mobile: $('mobile'),
    objective: $('objective'), prompt: $('prompt'), message: $('message'), cross: $('crosshair'),
    battery: $('battery'), batteryFill: $('batteryFill'), stamina: $('stamina'), staminaFill: $('staminaFill'),
    breath: $('breath'), breathFill: $('breathFill'), hold: $('hold'), holdFill: $('holdFill'),
    kc: { red: $('kcRed'), blue: $('kcBlue'), black: $('kcBlack') }, keycards: $('keycards'),
    chapter: $('chapter'), chapterTitle: $('chapterTitle'), chapterSub: $('chapterSub'),
    locker: $('locker'), phone: $('phone'),
  };
  // showing or hiding a menu screen tears the picture like a VHS tape for a moment
  const show = (e, on) => {
    if (e.classList.contains('screen') && e.classList.contains('on') !== on) ui.glitch();
    e.classList.toggle('on', on);
  };
  let msgTimer = 0, lastPrompt = null;

  const ui = {
    el,
    // ---------------------------------------------------------------- HUD
    hud(on) {
      for (const e of [el.cross, el.keycards]) e.style.display = on ? '' : 'none';
      el.objective.classList.toggle('hidden', !on); // the objective stays up while you play
      el.cross.style.display = on ? 'block' : 'none';
      if (!on) { ui.controls(false); ui.prompt(''); el.stamina.style.opacity = 0; el.battery.style.opacity = 0; el.breath.style.opacity = 0; }
    },
    prompt(text) { if (text !== lastPrompt) { el.prompt.textContent = text || ''; lastPrompt = text; } },
    objective(text) {
      el.objective.textContent = text;
      el.objective.classList.remove('show');
      void el.objective.offsetWidth;
      el.objective.classList.add('show');
    },
    // a subtitle line: who says it (optional), held for ms
    say(who, text, ms = 3500, cls = '') {
      el.message.innerHTML = (who ? `<span class="who">${who}:</span> ` : '') + `<span class="${cls}">${text}</span>`;
      el.message.style.opacity = 1;
      clearTimeout(msgTimer);
      msgTimer = setTimeout(() => (el.message.style.opacity = 0), ms);
    },
    message(text, ms = 3000) { ui.say('', text, ms); },
    battery(v, visible) { el.battery.style.opacity = visible ? 1 : 0; el.batteryFill.style.width = v * 100 + '%'; },
    stamina(v, winded) {
      el.stamina.style.opacity = v < 0.999 ? 1 : 0;
      el.staminaFill.style.width = v * 100 + '%';
      el.stamina.classList.toggle('tired', winded);
    },
    breath(v, visible, held) {
      el.breath.style.opacity = visible ? 1 : 0;
      el.breathFill.style.width = v * 100 + '%';
      el.breath.classList.toggle('held', !!held);
    },
    hold(p) { el.hold.style.opacity = p > 0 ? 1 : 0; el.holdFill.style.width = Math.min(1, p) * 100 + '%'; },
    keycards(flags) { for (const k in el.kc) el.kc[k].classList.toggle('got', !!flags[k]); },
    locker(on) { ui.hideView(on ? 'locker' : null); },
    // what you see from a hiding place: 'locker', 'bed', or null
    hideView(kind) { el.locker.style.display = kind === 'locker' ? 'block' : 'none'; $('bedview').style.display = kind === 'bed' ? 'block' : 'none'; },
    // bottles and bricks you're carrying
    carry(list) {
      const c = $('carry');
      const n = (k) => list.filter((x) => x === k).length;
      const parts = [n('bottle') && `Bottle ×${n('bottle')}`, n('brick') && `Brick ×${n('brick')}`].filter(Boolean);
      c.innerHTML = parts.length ? `${parts.join('   ')}<small>[G / Left-click] throw</small>` : '';
      c.classList.toggle('on', parts.length > 0);
    },
    controls(on) { $('controlsCard').classList.toggle('on', on); if (on) $('controlsTip').classList.remove('on'); },
    controlsTip(ms = 7000) {
      const tip = $('controlsTip');
      tip.classList.add('on');
      clearTimeout(ui._tipT);
      ui._tipT = setTimeout(() => tip.classList.remove('on'), ms);
    },
    phone(on) { el.phone.style.display = on ? 'block' : 'none'; },
    chapter(title, sub) {
      el.chapterTitle.textContent = title;
      el.chapterSub.textContent = sub || '';
      el.chapter.style.opacity = 1;
      setTimeout(() => (el.chapter.style.opacity = 0), 3500);
    },

    // ---------------------------------------------------------------- screens
    loading(p) {
      el.loading.textContent = p >= 1 ? '' : `loading ${Math.round(p * 100)}%`;
      const tip = $('tip');
      if (p < 1 && !ui._tipTimer) {
        tip.textContent = randomTip();
        ui._tipTimer = setInterval(() => { tip.style.opacity = 0; setTimeout(() => { tip.textContent = randomTip(); tip.style.opacity = 1; }, 600); }, 4500);
      }
      if (p >= 1) { clearInterval(ui._tipTimer); tip.textContent = ''; }
    },
    glitch() {
      document.body.classList.add('glitching');
      $('vhs').classList.add('on');
      clearTimeout(ui._glitchT);
      ui._glitchT = setTimeout(() => { document.body.classList.remove('glitching'); $('vhs').classList.remove('on'); }, 460);
      if (ui.onGlitch) ui.onGlitch();
    },
    // New Game: choose how hard it is
    difficultyMenu(last, onPick, onBack) {
      const LEVELS = [
        { id: 'easy', name: 'EASY', text: 'A slower monster that hears and sees less. For the story.' },
        { id: 'normal', name: 'NORMAL', text: 'The way it was meant to be played.' },
        { id: 'nightmare', name: 'NIGHTMARE', text: 'Faster, sharper, darker. No saving mid-floor.' },
      ];
      const list = $('diffList');
      list.innerHTML = '';
      for (const l of LEVELS) {
        const b = document.createElement('button');
        b.className = l.id === last ? 'last' : '';
        b.innerHTML = `<h4>${l.name}</h4><p>${l.text}</p>`;
        b.onclick = () => { show($('difficulty'), false); onPick(l.id); };
        list.appendChild(b);
      }
      show($('difficulty'), true);
      $('btnDiffBack').onclick = () => { show($('difficulty'), false); onBack(); };
    },
    // which endings you've found: locked ones show a hint, the secret one tells you what it takes
    endingsMenu(found, onBack) {
      const ENDINGS = [
        { id: 'together', name: 'TOGETHER', text: 'You got Maya out. You climbed down together as the sun came up.', hint: 'Some people are worth going back for.' },
        { id: 'escaped', name: 'ESCAPED', text: 'You got out alone. You did not look back. It followed you anyway.', hint: 'Not everyone makes it to the roof.' },
        { id: 'continuance', name: 'CONTINUANCE', secret: true, text: 'Dr. Voss\'s last entry: what he built on the fourth floor, and why it keeps the people it takes.', hint: 'Find all 8 of Dr. Voss\'s tapes, then escape.' },
      ];
      const list = $('endingsList');
      list.innerHTML = '';
      for (const e of ENDINGS) {
        const got = found.includes(e.id);
        const d = document.createElement('div');
        d.className = `card${got ? '' : ' locked'}${e.secret ? ' secret' : ''}`;
        d.innerHTML = `${e.secret ? '<div class="tag">SECRET ENDING</div>' : ''}<h4>${got ? e.name : '???'}</h4><p>${got ? e.text : e.hint}</p>`;
        list.appendChild(d);
      }
      $('endingsCount').textContent = `${found.length} of ${ENDINGS.length} found`;
      show($('endings'), true);
      $('btnEndingsBack').onclick = () => { show($('endings'), false); onBack(); };
    },
    mainMenu({ canContinue, onNew, onContinue, onSettings, onCredits, onEndings }) {
      show(el.title, true);
      el.loading.style.display = 'none';
      el.mainMenu.style.display = 'flex';
      $('btnContinue').disabled = !canContinue;
      $('btnContinue').onclick = onContinue;
      $('btnNew').onclick = onNew;
      $('btnSettings').onclick = onSettings;
      $('btnCredits').onclick = onCredits;
      $('btnEndings').onclick = onEndings;
    },
    hideMainMenu() { show(el.title, false); },
    pauseMenu(on, { stats, onResume, onSettings, onQuit } = {}) {
      show(el.pause, on);
      if (!on) return;
      el.pauseStats.textContent = stats || '';
      $('btnResume').onclick = onResume;
      $('btnPauseSettings').onclick = onSettings;
      $('btnQuit').onclick = onQuit;
    },
    settingsMenu(settings, onChange, onBack) {
      show(el.settings, true);
      const sens = $('setSens'), vol = $('setVol'), gore = $('setGore'), flash = $('setFlash');
      const fov = $('setFov'), blur = $('setBlur'), subs = $('setSubs');
      fov.value = settings.fov || 70;
      blur.checked = !!settings.motionBlur;
      subs.value = settings.subtitles || 'medium';
      let keys = { ...DEFAULT_KEYS, ...(settings.keys || {}) };
      sens.value = settings.sensitivity;
      vol.value = settings.volume;
      gore.checked = settings.lessGore;
      flash.checked = settings.reduceFlashing;
      const changed = () => {
        onChange({
          sensitivity: +sens.value, volume: +vol.value, lessGore: gore.checked, reduceFlashing: flash.checked,
          fov: +fov.value, motionBlur: blur.checked, subtitles: subs.value, keys,
        });
      };
      sens.oninput = vol.oninput = gore.onchange = flash.onchange = fov.oninput = blur.onchange = subs.onchange = changed;
      // key rebinding: click an action, press the new key (Esc cancels)
      const drawKeys = () => {
        const box = $('keys');
        box.innerHTML = '';
        for (const action of Object.keys(KEY_LABELS)) {
          const label = document.createElement('span');
          label.textContent = KEY_LABELS[action];
          const b = document.createElement('button');
          b.textContent = keyName(keys[action]);
          b.onclick = () => {
            b.textContent = 'press a key...';
            b.classList.add('wait');
            const grab = (e) => {
              e.preventDefault();
              e.stopPropagation();
              removeEventListener('keydown', grab, true);
              if (e.code !== 'Escape') { keys = { ...keys, [action]: e.code }; changed(); }
              drawKeys();
            };
            addEventListener('keydown', grab, true);
          };
          box.append(label, b);
        }
      };
      drawKeys();
      $('btnKeysReset').onclick = () => { keys = { ...DEFAULT_KEYS }; changed(); drawKeys(); };
      $('btnSettingsBack').onclick = () => { show(el.settings, false); onBack(); };
    },
    note(title, text, onClose) {
      el.noteTitle.textContent = title;
      el.noteText.textContent = text;
      show(el.note, true);
      const close = () => {
        show(el.note, false);
        removeEventListener('keydown', key);
        el.note.onclick = null;
        onClose();
      };
      const key = (e) => { if (e.code === 'KeyE' || e.code === 'Escape') close(); };
      setTimeout(() => { addEventListener('keydown', key); el.note.onclick = close; }, 250);
    },
    keypad(label, onSubmit, onClose) {
      let code = '';
      const render = () => (el.keypadDisplay.textContent = (code + '____').slice(0, 4));
      el.keypadLabel.textContent = label;
      el.keypadPad.innerHTML = '';
      const press = (k) => {
        if (k === 'C') code = '';
        else if (k === 'OK') { submit(); return; }
        else if (code.length < 4) code += k;
        render();
      };
      const submit = () => {
        const ok = onSubmit(code);
        if (ok) close();
        else { code = ''; el.keypadDisplay.textContent = 'ERR '; setTimeout(render, 600); }
      };
      for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK']) {
        const b = document.createElement('button');
        b.textContent = k;
        b.onclick = () => press(k);
        el.keypadPad.appendChild(b);
      }
      const key = (e) => {
        if (/^Digit\d$/.test(e.code)) press(e.code.slice(5));
        else if (e.code === 'Enter') submit();
        else if (e.code === 'Backspace') { code = code.slice(0, -1); render(); }
        else if (e.code === 'KeyE' && !e.repeat && Date.now() - opened > 300) close(); // (not the same E press that opened it)
      };
      const close = () => { show(el.keypad, false); removeEventListener('keydown', key); $('btnKeypadAway').onclick = null; onClose(); };
      $('btnKeypadAway').onclick = close;
      render();
      show(el.keypad, true);
      const opened = Date.now();
      addEventListener('keydown', key);
    },
    death(text, onRetry, onMenu, nightmare) {
      el.deathText.textContent = `${text}\n\nTip: ${randomTip()}`;
      el.deathText.style.whiteSpace = 'pre-line';
      $('btnRetry').textContent = nightmare ? 'Wake up where this floor began' : 'Wake up at the last checkpoint';
      show(el.death, true);
      $('btnRetry').onclick = () => { show(el.death, false); onRetry(); };
      $('btnDeathMenu').onclick = () => { show(el.death, false); onMenu(); };
    },
    // an ending: a sequence of [text, seconds] cards on black, then done()
    ending(cards, done) {
      show(el.ending, true);
      let i = 0;
      const next = () => {
        if (i >= cards.length) { el.endingText.style.opacity = 0; setTimeout(() => { show(el.ending, false); done(); }, 1500); return; }
        const [text, secs, onShow] = cards[i++];
        el.endingText.style.opacity = 0;
        setTimeout(() => {
          el.endingText.textContent = text;
          el.endingText.style.opacity = 1;
          if (onShow) onShow();
          setTimeout(next, secs * 1000);
        }, 900);
      };
      next();
    },
    credits(text, done) {
      show(el.credits, true);
      el.creditsRoll.textContent = text;
      el.creditsRoll.style.transition = 'none';
      el.creditsRoll.style.transform = 'translateY(0)';
      void el.creditsRoll.offsetWidth;
      const h = el.creditsRoll.offsetHeight + innerHeight;
      const secs = Math.max(20, h / 45);
      el.creditsRoll.style.transition = `transform ${secs}s linear`;
      el.creditsRoll.style.transform = `translateY(-${h}px)`;
      let finished = false;
      const end = () => { if (finished) return; finished = true; show(el.credits, false); el.credits.onclick = null; done(); };
      setTimeout(end, secs * 1000);
      setTimeout(() => (el.credits.onclick = end), 1500);
    },
    mobile() { show(el.mobile, true); show(el.title, false); },
  };
  return ui;
}
