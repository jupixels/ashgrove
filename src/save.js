// Checkpoint saves and settings, kept in this browser (localStorage). Everything is wrapped so the game
// still runs (just without saving) where storage is blocked.
const SAVE_KEY = 'ashgrove.save.v1';
const SETTINGS_KEY = 'ashgrove.settings.v1';

export const DEFAULT_SETTINGS = { sensitivity: 1, volume: 0.9, lessGore: false, reduceFlashing: false, difficulty: 'normal', fov: 70, motionBlur: false, subtitles: 'medium', keys: {} };

function read(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked: no saving */ }
}

export const loadSave = () => read(SAVE_KEY);
export const writeSave = (save) => write(SAVE_KEY, save);
export const clearSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } };

export const loadSettings = () => ({ ...DEFAULT_SETTINGS, ...(read(SETTINGS_KEY) || {}) });
export const writeSettings = (s) => write(SETTINGS_KEY, s);

// A brand new game.
export function newSave() {
  return {
    chapter: 1,
    floor: 'F1',
    checkpoint: 'start',     // an arrival name from floors.js, or { x, z, yaw }
    flags: {},               // power, red, blue, black, consoleDone, mayaFreed, story events...
    taken: [],               // picked-up items, by id
    tapes: [],               // voice names of tapes found
    notesRead: [],           // { title, text } of every note read, for the journal
    seen: {},                // floor key -> ["x,z", ...] cells you've been near, for the journal's map
    deaths: 0,
    startedAt: Date.now(),
  };
}
