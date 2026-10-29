// Everything on screen that isn't the 3D world: HUD, subtitles, menus, notes, keypad, death and ending screens.
const $ = (id) => document.getElementById(id);

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
    cam: $('cam'), camTc: $('camTc'), camStamp: $('camStamp'), camBat: $('camBat'),
  };
  let camOn = false, phoneOn = false, lastTc = -1;
  const camShow = () => el.cam.classList.toggle('on', camOn && !phoneOn);
  const pad = (n) => String(Math.floor(n)).padStart(2, '0');
  const show = (e, on) => e.classList.toggle('on', on);
  let msgTimer = 0, lastPrompt = null;

  const ui = {
    el,
    // ---------------------------------------------------------------- HUD
    hud(on) {
      for (const e of [el.cross, el.keycards]) e.style.display = on ? '' : 'none';
      el.cross.style.display = on ? 'block' : 'none';
      camOn = on;
      camShow();
      if (!on) { ui.prompt(''); el.stamina.style.opacity = 0; el.battery.style.opacity = 0; el.breath.style.opacity = 0; }
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
    battery(v, visible) {
      el.battery.style.opacity = visible ? 1 : 0;
      el.batteryFill.style.width = v * 100 + '%';
      [...el.camBat.children].forEach((bar, i) => bar.classList.toggle('off', v <= i * 0.25 + 0.02));
      el.camBat.classList.toggle('low', v < 0.25);
    },
    // the camcorder's running time, and the clock in the corner (it was 2:14 AM when you went in)
    camTime(seconds) {
      const s = Math.floor(seconds);
      if (s === lastTc) return;
      lastTc = s;
      el.camTc.textContent = `${pad(s / 3600)}:${pad((s / 60) % 60)}:${pad(s % 60)}`;
      const m = 14 + Math.floor(s / 60), h = 2 + Math.floor(m / 60);
      el.camStamp.innerHTML = `OCT.31.1997<br>${((h - 1) % 12) + 1}:${pad(m % 60)} AM`;
    },
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
    locker(on) { el.locker.style.display = on ? 'block' : 'none'; },
    phone(on) { el.phone.style.display = on ? 'block' : 'none'; phoneOn = on; camShow(); },
    chapter(title, sub) {
      el.chapterTitle.textContent = title;
      el.chapterSub.textContent = sub || '';
      el.chapter.style.opacity = 1;
      setTimeout(() => (el.chapter.style.opacity = 0), 3500);
    },

    // ---------------------------------------------------------------- screens
    loading(p) { el.loading.textContent = p >= 1 ? '' : `loading ${Math.round(p * 100)}%`; },
    mainMenu({ canContinue, onNew, onContinue, onSettings, onCredits }) {
      show(el.title, true);
      el.loading.style.display = 'none';
      el.mainMenu.style.display = 'flex';
      $('btnContinue').disabled = !canContinue;
      $('btnContinue').onclick = onContinue;
      $('btnNew').onclick = onNew;
      $('btnSettings').onclick = onSettings;
      $('btnCredits').onclick = onCredits;
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
      sens.value = settings.sensitivity;
      vol.value = settings.volume;
      gore.checked = settings.lessGore;
      flash.checked = settings.reduceFlashing;
      const changed = () => onChange({ sensitivity: +sens.value, volume: +vol.value, lessGore: gore.checked, reduceFlashing: flash.checked });
      sens.oninput = vol.oninput = gore.onchange = flash.onchange = changed;
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
        else if (e.code === 'Escape') close();
      };
      const close = () => { show(el.keypad, false); removeEventListener('keydown', key); onClose(); };
      render();
      show(el.keypad, true);
      addEventListener('keydown', key);
    },
    death(text, onRetry, onMenu) {
      el.deathText.textContent = text;
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
