// The journal (J): what you're carrying and which keycards you have, notes you can reread, tapes you can replay,
// and a map that draws itself from the rooms you've walked through.
const $ = (id) => document.getElementById(id);
const FLOOR_NAMES = { B1: 'Basement', F1: 'Ground', F2: '2F', F3: '3F', F4: '4F' };

// cells you've seen, drawn like a hand-sketched floor plan: floor, walls round it, doors, stairs, and you
export function drawMap(canvas, def, seen, here) {
  const map = def.map, H = map.length, W = map[0].length, S = 10;
  canvas.width = W * S;
  canvas.height = H * S;
  const g = canvas.getContext('2d');
  g.fillStyle = '#0c0c0b';
  g.fillRect(0, 0, canvas.width, canvas.height);
  const at = (x, z) => (map[z] && map[z][x]) || '#';
  const walk = (x, z) => !'# '.includes(at(x, z));
  const known = (x, z) => seen.has(`${x},${z}`);
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    if (!walk(x, z) || !known(x, z)) continue;
    const ch = at(x, z);
    g.fillStyle = ch === 'D' ? '#5a3e28' : '#3a3833';
    g.fillRect(x * S, z * S, S, S);
    g.fillStyle = '#c8c0a8';
    // walls: a line on every side that meets a wall
    if (!walk(x, z - 1)) g.fillRect(x * S, z * S, S, 1);
    if (!walk(x, z + 1)) g.fillRect(x * S, z * S + S - 1, S, 1);
    if (!walk(x - 1, z)) g.fillRect(x * S, z * S, 1, S);
    if (!walk(x + 1, z)) g.fillRect(x * S + S - 1, z * S, 1, S);
    const mark = { '^': '▲', v: '▼', Q: '☎', H: '▮' }[ch];
    if (mark) {
      g.fillStyle = ch === 'Q' ? '#9fd09f' : ch === 'H' ? '#6a7a70' : '#e8e0cc';
      g.font = `${S - 2}px sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(mark, x * S + S / 2, z * S + S / 2 + 1);
    }
  }
  if (here) { // you: a red arrow
    const cx = here.x / 2 * S, cz = here.z / 2 * S;
    g.save();
    g.translate(cx, cz);
    g.rotate(-here.yaw);
    g.fillStyle = '#e02020';
    g.beginPath();
    g.moveTo(0, -S * 0.7); g.lineTo(S * 0.45, S * 0.45); g.lineTo(-S * 0.45, S * 0.45);
    g.fill();
    g.restore();
  }
}

// data: { flags, carry, notes: [{ title, text }], tapes: [name], tapeLines, maps: { key: { def, seen } }, floor, here }
export function openJournal(data, { onTape, onClose }) {
  const root = $('journal'), page = $('journalPage');
  let tab = 'items', mapFloor = data.floor;
  const render = () => {
    root.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    page.innerHTML = '';
    if (tab === 'items') {
      const cards = ['red', 'blue', 'black'].map((k) => `<div class="item" style="cursor:default">${data.flags[k] ? '■' : '□'} ${k.toUpperCase()} keycard<small>${data.flags[k] ? 'found' : 'missing'}</small></div>`).join('');
      const n = (k) => data.carry.filter((x) => x === k).length;
      const carry = data.carry.length ? `<div class="item" style="cursor:default">Carrying: ${[n('bottle') && `bottle ×${n('bottle')}`, n('brick') && `brick ×${n('brick')}`].filter(Boolean).join(', ')}<small>throw with G / left-click</small></div>` : '';
      page.innerHTML = cards + carry + `<div class="item" style="cursor:default">Tapes found: ${data.tapes.length}/${Object.keys(data.tapeLines).length}</div>`;
    } else if (tab === 'notes') {
      if (!data.notes.length) { page.innerHTML = '<div class="empty">No notes read yet.</div>'; return; }
      data.notes.forEach((n) => {
        const d = document.createElement('div');
        d.className = 'item';
        d.innerHTML = `${n.title}<small>click to read</small>`;
        d.onclick = () => { d.innerHTML = `<b>${n.title}</b><div style="white-space:pre-line;margin-top:6px;color:#bdb6a2">${n.text}</div>`; };
        page.appendChild(d);
      });
    } else if (tab === 'tapes') {
      if (!data.tapes.length) { page.innerHTML = '<div class="empty">No tapes found yet.</div>'; return; }
      data.tapes.forEach((name, i) => {
        const d = document.createElement('div');
        d.className = 'item';
        d.innerHTML = `Tape ${i + 1}<small>click to play</small><div style="color:#bdb6a2;margin-top:4px;font-size:15px">${data.tapeLines[name] || ''}</div>`;
        d.onclick = () => onTape(name);
        page.appendChild(d);
      });
    } else if (tab === 'map') {
      const keys = Object.keys(data.maps).filter((k) => data.maps[k].seen.size);
      if (!keys.includes(mapFloor)) mapFloor = keys[0];
      const bar = document.createElement('div');
      bar.className = 'floors';
      keys.forEach((k) => {
        const b = document.createElement('button');
        b.textContent = FLOOR_NAMES[k] || k;
        b.className = k === mapFloor ? 'on' : '';
        b.onclick = () => { mapFloor = k; render(); };
        bar.appendChild(b);
      });
      page.appendChild(bar);
      if (!mapFloor) { page.innerHTML += '<div class="empty">Nothing mapped yet.</div>'; return; }
      const c = document.createElement('canvas');
      page.appendChild(c);
      drawMap(c, data.maps[mapFloor].def, data.maps[mapFloor].seen, mapFloor === data.floor ? data.here : null);
    }
  };
  root.querySelectorAll('.tabs button').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; render(); }; });
  render();
  root.classList.add('on');
  const close = () => {
    root.classList.remove('on');
    removeEventListener('keydown', key);
    onClose();
  };
  const key = (e) => { if (e.code === 'Escape' || e.code === 'KeyJ') { e.preventDefault(); close(); } };
  setTimeout(() => addEventListener('keydown', key), 150);
}
