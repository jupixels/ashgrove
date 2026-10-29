# Free Assets + Your To-Do List

Everything here is **free**. A few need a free account. Download each pack and drop the **zip
(unzipped is fine too)** into the folder listed. I'll handle converting, cleaning, and wiring them
into the game.

```
horrorgame/assets/raw/models/
horrorgame/assets/raw/textures/
horrorgame/assets/raw/characters/
horrorgame/assets/audio/...        (see SOUND_PROMPTS.md)
```

---

## ✅ Must-have downloads

### 1. Hospital Assets by Atomic Realm: rooms, beds, machines
**https://atomicrealm.itch.io/hospital-assets**
- Free ("name your price", type **0**). 18 low-poly models: beds, medical machines, trays, cupboards,
  ceiling light, floor, and wall/door/window pieces for building rooms. Includes `.gltf` (perfect for the web).
- License: free for games, **credit required** (I'll add it to the credits screen).
- → save to `assets/raw/models/atomic_hospital/`

### 2. PSX Med Pack by Retro Assets Library: pickups and props
**https://retroassetslibrary.itch.io/psx-med-pack**
- Free. 20 PS1-style medical items: syringe, **blood pack**, pills, bandages, med kits. Has `.glb`.
- License: free for games, no credit needed (I'll credit them anyway).
- → save to `assets/raw/models/psx_med/`

### 3. 300 Free Horror Textures by Screaming Brain Studios
**https://screamingbrainstudios.itch.io/horror-texture-pack**
- Free, **CC0** (do anything). Grungy walls, floors, metal, plus **blood/grime stain overlays**.
  Already low-res, which suits our PSX look.
- → save to `assets/raw/textures/screaming_brain/`

### 4. Mixamo (Adobe): the monster's body and ALL animations
**https://www.mixamo.com**
- Free with a free Adobe account. Royalty-free for games.
- This is how we get a fully animated monster for $0. I'll distort and re-texture it into The Stitched.
- **What to download** (format: **FBX Binary**, "With Skin", 30 fps):
  1. Search characters for **"Mutant"**, click it to select it, then download it with no animation (T-pose). Save as `mutant.fbx`.
  2. With the Mutant still selected, go to **Animations**, search each name below, and download each one
     (choose **"Without Skin"** after the first to keep files small):
     - `Mutant Walking` → `walk.fbx`
     - `Mutant Run` → `run.fbx`
     - `Mutant Roaring` → `roar.fbx`
     - `Mutant Idle` → `idle.fbx`
     - `Zombie Attack` or `Mutant Swiping` → `attack.fbx`
     - `Crawl` or `Zombie Crawl` → `crawl.fbx`
     - `Sniff` or `Looking Around` → `search.fbx`
  3. Optional for cutscenes: choose a teen girl character for **Maya** (e.g. search "girl" or "Kate") with
     `Walking`, `Looking Around`, and `Being Dragged`/`Falling` animations.
- → save to `assets/raw/characters/mixamo/`
- If a name isn't found exactly, grab whatever looks closest and tell me what you picked.

---

## 👍 Nice-to-have

### 5. Poly Haven: high-quality textures (CC0)
**https://polyhaven.com/textures**
Search and download at **1K** resolution (the "1K" option, JPG):
- "concrete floor worn", "rusty metal", "dirty tiles" / "tiles", "plaster wall", "painted metal"
- → `assets/raw/textures/polyhaven/`

### 6. ambientCG: more textures (CC0)
**https://ambientcg.com**
Search: `Tiles` (white/green hospital-ish), `PaintedPlaster`, `Rust`, `Concrete`, and download **1K-JPG**.
- → `assets/raw/textures/ambientcg/`

### 7. Phenebub: a horror creature (CC BY, credit required)
**https://sketchfab.com/3d-models/phenebub-free-horror-creature-e18dbcb6300b4421aac2bb51cc060aed**
- Free Sketchfab account needed. Not rigged, so I'd use it as a **static horror prop**: something inside the
  breathing morgue drawer, or a "previous patient" in the operating theater. Download **glTF**.
- → `assets/raw/models/phenebub/`

### 8. Sketchfab gurney/stretcher (check the license first)
- https://sketchfab.com/3d-models/gurney-medevac-patient-stretcher-rescue-litter-40c85d5457a144d3b5dc1b328a2425a3
- https://sketchfab.com/3d-models/stretcher-bd69f5a963714cb2b2c08ee098a03aab
- **Only download if the license says CC BY or CC0** (it's shown under the Download button).
  If it says anything else (e.g. "NonCommercial" or "Standard"), skip it.
- **Browse more:** on Sketchfab search "hospital", "wheelchair", "IV stand", "operating table",
  "morgue", and turn on the **Downloadable** filter. Grab anything CC BY / CC0 that looks good and low-poly
  (under ~20k triangles).

### 9. Font: Special Elite (typewriter look for notes and the title)
**https://fonts.google.com/specimen/Special+Elite**: nothing to download, I'll load it directly.

---

## 📝 Your to-do list

1. ☐ **Make free accounts:** [itch.io](https://itch.io), [Adobe/Mixamo](https://www.mixamo.com),
   and (optional) [Sketchfab](https://sketchfab.com).
2. ☐ **Download assets 1–4** above into the folders listed.
3. ☐ **Generate the ★★★ sounds** from `SOUND_PROMPTS.md` in ElevenLabs (about 15 sounds) to start.
   The rest can come later.
4. ☐ **Install Blender (free):** https://www.blender.org/download/. Use the default install location.
   I'll run it from scripts to convert the Mixamo FBX files into web-ready `.glb`, merge animations,
   and model custom pieces (the monster's tubes and stitches, the reception desk, morgue drawers).
5. ☐ **Make a GitHub account** if you don't have one, and tell me your username. When we're ready
   to publish, I'll set up the repo and GitHub Pages. You'll just need to approve it.
6. ☐ **Read `DESIGN.md`** and tell me what you'd change about the story, monster, or names.

> ⚠️ Don't commit raw downloads to the public repo blindly. Some licenses (Atomic Realm, Mixamo) say you can
> use the assets *in* your game but not redistribute the raw files. I'll only publish the converted,
> game-ready versions, which is the normal way games ship.

---

## Credits (will appear in-game)
- Hospital models: Atomic Realm (https://atomicrealm.itch.io/)
- Medical props: Retro Assets Library
- Horror textures: Screaming Brain Studios (CC0)
- Characters & animation: Mixamo / Adobe
- Textures: Poly Haven, ambientCG (CC0)
- Creature: "Phenebub" by Jorma Rysky (CC BY 4.0), if used
- Sound: generated with ElevenLabs
