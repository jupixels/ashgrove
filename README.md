# ASHGROVE

A first-person horror game in the abandoned Ashgrove Memorial Hospital. You went in to film a livestream with
your best friend Maya. Now the building is sealed, Maya is gone, and something is walking the halls. Get out.

**Play:** https://jupixels.github.io/ashgrove/ (keyboard and mouse, headphones recommended)

Built with [Three.js](https://threejs.org); runs in the browser from GitHub Pages, no install.

## Controls

WASD move · Mouse look · Shift run · C crouch · F flashlight · E use / hide in lockers ·
Space hold your breath (while hidden) · Right-click or Q phone camera · Esc pause

## The game

Six chapters across five floors and the roof:

1. **Admitted** (ground floor): the lockdown console is dead
2. **Cold Storage** (basement): restore power, the red keycard, drawer 13
3. **Lullaby** (pediatrics): the music box, the blue keycard, what the phone camera sees
4. **One Heartbeat** (surgery & ICU): Dr. Voss's office, the black keycard, the elevator
5. **Leaving So Soon** (ground floor): lift the lockdown, and find out the doors are welded
6. **Ward C**: free Maya (or don't), then the roof

The monster patrols, follows noise (running, trays, broken glass, the breaker lever), chases you when it
sees you, and searches when it loses you. Hide in lockers and hold your breath. Light in its face makes it flinch.
Payphones save your progress. Two endings plus a secret one for finding all eight of Dr. Voss's tapes.

## Play locally

```bash
python -m http.server 8123
```

Then open http://localhost:8123. Add `?debug` for the debug hooks (`window.game`), `?debug&nointro` to skip the cutscene.

## Project layout

- `index.html`: page, menus, HUD
- `src/main.js`: boot, menus, loading floors, checkpoints, the frame loop
- `src/engine.js`: renderer and the PS1-style look (low-res target, vertex snapping, dithering, grain)
- `src/floors.js`: the six maps, notes, tapes and chapter list
- `src/world.js`: builds a floor: walls, props, lights, doors, lockers, pickups, special objects, paths, line of sight
- `src/player.js`: movement, flashlight, stamina, noise, hiding and breath, phone camera, using things
- `src/monster.js`: the monster and its AI (patrol, investigate, chase, search, flinch)
- `src/story.js`: chapters, objectives, scripted scares, Maya, endings
- `src/cutscene.js`: the found-footage opening
- `src/ui.js`, `src/save.js`, `src/maya.js`, `src/audio.js`, `src/assets.js`, `src/textures.js`
- `tools/convert_mixamo.py`: Blender script that turns Mixamo FBX files into `assets/models/monster.glb` and `maya.glb`
  (`blender --background --python tools/convert_mixamo.py -- monster` or `-- maya`)
- `tools/clean_sound.py`, `tools/split_steps.py`: tidy ElevenLabs sounds (trim silence, match loudness)
- `docs/`: design doc, sound prompts, asset list

## Credits

Hospital models: Atomic Realm · Medical props: Retro Assets Library · Textures: Screaming Brain Studios (CC0) ·
Characters & animation: Mixamo · Voices & sound: ElevenLabs · Engine: three.js
