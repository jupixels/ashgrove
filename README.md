# ASHGROVE

A first-person browser horror game set in the abandoned Ashgrove Memorial Hospital.
Built with [Three.js](https://threejs.org). No install needed, it runs from GitHub Pages.

## Play locally

Browsers block the game from loading files when opened straight from disk, so serve the folder:

```bash
python -m http.server 8123
```

Then open http://localhost:8123.

## Controls

WASD move · Mouse look · Shift run · C crouch · F flashlight · E interact · Esc pause

## Project layout

- `index.html`: page, title screen, HUD
- `src/main.js`: level, player, flashlight, monster, scares, PSX post-processing
- `src/assets.js`: loads models (`assets/models`) and textures (`assets/textures`)
- `src/textures.js`: procedural textures (ceiling, blood writing)
- `tools/convert_mixamo.py`: Blender script that turns Mixamo FBX files into `assets/models/monster.glb` and `maya.glb`
  (`blender --background --python tools/convert_mixamo.py -- monster` or `-- maya`)
- `src/audio.js`: loads `assets/audio/**` (ElevenLabs sounds), falls back to synthesized sounds
- `docs/`: design doc, sound prompts, asset list
