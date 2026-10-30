# ASHGROVE — Game Design Document (Phase 1)

> Working title: **ASHGROVE** (alt: *Lights Out at Ashgrove*, *The Stitched Ward*)
> Platform: Web browser (GitHub Pages) · First-person 3D · ~30–45 min playtime
> Tech: **Three.js** (WebGL) — no install for players, runs from a static site.

---

## 1. The Vibe

- **Look:** Lo-fi "PSX" horror. Low-poly models, crunchy low-res textures, vertex wobble, film grain,
  chromatic aberration, VHS scanlines. This style is *scarier* than realistic graphics (your brain fills in
  the gaps), runs fast in a browser, and matches the free assets we found.
- **Light:** Almost everything is dark. Your **flashlight** is your main light. Flickering fluorescent tubes,
  red emergency lights, exit signs. Darkness is the enemy.
- **Sound:** 50% of the fear. Constant low drone, distant hospital sounds that shouldn't exist (a heart monitor
  beeping in an empty room, a PA that crackles on), and the monster's sounds that tell you where it is.
- **Pacing rule:** *Tension → fake-out → release → real scare when they relax.* Never two big jumpscares in a row.

---

## 2. Story

### Backstory (what the player slowly discovers through notes, tapes, and files)

**Ashgrove Memorial Hospital** shut down in 1997. Officially: budget cuts. Unofficially: 14 long-term coma
patients on the 4th floor "Ward C" vanished in one night, along with **Dr. Elias Voss**, head of the
experimental *Continuance Program*.

Voss believed he could keep the dying alive forever by "sharing" living tissue between patients. He stitched
them together, keeping them alive past the point anyone should be. The thing that came out of Ward C
isn't one person anymore. Staff called it **THE STITCHED**.

When the patients disappeared, the hospital's **quarantine lockdown** was triggered. The building was sealed,
then abandoned. The power was cut and everyone pretended it never happened.

Rumors say if you go inside at night, the lights come back on.

### The Characters

- **Sam Reyes (16), the player.** Quiet, curious, runs a tiny urban-exploration YouTube channel with 300 subscribers.
  Mostly seen through their own phone camera and seen in reflections.
- **Maya Okafor (16), Sam's best friend.** Bold, funny, the one who dared Sam to do this. She has the camera rig.
  Taken early. Nobody knows if she's alive: the not-knowing keeps the player going (and the monster uses it).
- **THE STITCHED, the monster.** Seven feet tall, hunched, wearing a dozen torn hospital gowns sewn together.
  Its face is a surgical mask stitched into the skin. More than one mouth. Too many fingers. IV lines and
  tubes trail behind it and **drag on the floor, so you hear it coming**. Hunts by **sound**. It is fast, but
  it hates light shining directly in its face.
- **Dr. Elias Voss (heard only).** His voice is on cassette tapes and the hospital PA, calm and
  grandfatherly, which makes it worse.

---

## 3. Opening Cutscene: "Livestream" (~2.5 min)

Shot as **found footage**: Sam's phone camera with a REC dot, a battery icon, and a live chat scrolling
on the side, until the camera drops and it becomes cinematic.

| # | Shot | What happens | Audio |
|---|------|--------------|-------|
| 1 | Black screen | Text types out: *"On October 31st, 2026, two teenagers entered Ashgrove Memorial Hospital. This footage was recovered from inside."* | Low drone, a single heartbeat |
| 2 | Car interior, night, rain | Maya films Sam in the passenger seat. "Say hi to all eleven viewers." Sam laughs nervously. The hospital looms through the windshield. | Rain on the car roof, wipers |
| 3 | Chain-link fence | They squeeze through a cut in the fence. A **CONDEMNED: KEEP OUT** sign. Maya: "Dude, the 4th floor window. Was that light on?" Camera pans up and it's dark. | Fence rattle, wind, distant dog |
| 4 | Front doors | The doors are chained, but a side ambulance-bay door is propped open with a brick. *Too convenient.* | Door creak |
| 5 | Lobby, flashlight | Wheelchairs, leaves, graffiti ("SHE STILL SINGS", "DON'T GO TO C"). The chat gets excited. Maya reads a reception sign-in book; the last entry is dated **tonight**. | Footsteps echo, dripping |
| 6 | Hallway | Maya walks ahead filming. Sam's phone glitches. In one frame a tall figure stands at the end of the hall. Next frame it's gone. Only Sam's camera caught it. Sam: "Maya. Maya, come back." | Glitch hiss, then silence |
| 7 | **THE LIGHTS** | Every fluorescent light in the building slams on at once, then dies. A PA crackles: *"Quarantine protocol engaged. All exits sealed. Please remain calm."* Steel shutters slam down over the ambulance bay behind them. | Electric THUNK chain, PA, metal slam |
| 8 | Darkness | Maya screams, very close and then far away, like something dragged her *up* through the ceiling tiles. Her camera drops through a vent and lands at Sam's feet, still recording. | Scream, scrape, dragging tubes |
| 9 | Close-up | Sam shouts for Maya. Nothing answers. Somewhere far above, something hums. | Silence, distant hum |
| 10 | Title card | **ASHGROVE** in cracked white typewriter text. Controls fade in. Player gets control. | Sting + drone |

---

## 4. Goal & Structure

**Main goal:** Get out. The lockdown can only be lifted from the **Security Office**, which needs
**3 Director keycards** (red, blue, black). Optional goal: **save Maya** (changes the ending).

### Chapters / Map

```
 ROOF (finale)
 4F  Ward C ─── Voss's Operating Theater (Maya is here)
 3F  Surgery & ICU            (black keycard)
 2F  Pediatrics & Patient Wards (blue keycard)
 1F  Lobby · Security Office · Cafeteria   (hub)
 B1  Morgue & Boiler Room     (red keycard + restore power)
```

| Ch. | Area | Objective | Signature Moment |
|-----|------|-----------|------------------|
| 1 | Lobby / 1F | Find the flashlight and batteries, reach the Security Office, learn about the keycards | First sight of The Stitched through a frosted window, walking past *slowly*. Pure dread, no attack |
| 2 | B1 Morgue | Restore emergency power at the boiler, get the **red keycard** off a body | Morgue drawers open on their own one by one. The last one has something *inside, breathing* |
| 3 | 2F Pediatrics | Get the **blue keycard** from the nurse station | A music box plays a lullaby. Kids' drawings show the monster. First full **chase** sequence |
| 4 | 3F Surgery/ICU | Get the **black keycard** from Voss's office, using the heart-monitor puzzle | Every heart monitor in the ICU flatlines at once, then they all beep in rhythm *with your footsteps* |
| 5 | 1F return | Insert keycards. Lockdown lifts, **but the main door is welded**. The only way out is the roof helipad's fire escape | PA: Voss's voice says, "Leaving so soon?" Every light goes red |
| 6 | 4F Ward C → Roof | Optional: free Maya from the operating table. Final chase up the stairwell | The Stitched comes through the ceiling right in front of you |

---

## 5. Core Mechanics

- **Flashlight + battery.** Drains over time. Batteries are scarce. Shining it in The Stitched's face makes it
  flinch for 2 seconds, which is your only defense. Also attracts it if left on near it.
- **Sound stealth.** Walking = quiet, sprinting = loud, knocking things over = very loud. A small "noise ring"
  indicator (optional/accessibility). The monster investigates the last loud noise.
- **Hiding.** Lockers, under beds, inside laundry carts. While hiding, **hold your breath** (hold a key)
  when it's close. Your stamina for breath drains; if you gasp, it finds you.
- **Phone camera.** Sam can raise the phone (right-click). Through the camera you see things the naked eye
  can't: writing in blood on walls, footprints, the monster when it's "invisible" on the ceiling.
  This is the core creepy mechanic: *you'll be afraid to look through it, and afraid not to.*
- **Walkie-talkie.** Maya guides you (and sometimes... it isn't Maya).
- **Collectibles.** Voss's cassette tapes (8), patient files, Polaroids. These tell the backstory.
- **No combat.** You cannot fight. Running and hiding only. That's what makes it scary.
- **Death.** The Stitched grabs you, there's a gory kill animation (screen goes red, wet sounds), then
  restart at the last checkpoint (a working payphone).

---

## 6. Jumpscare & Scare Plan

Rule: **real** jumpscares (loud sound + sudden image) are rare, about **6 in the whole game**, so they land.
Everything else is dread and fake-outs.

**Real jumpscares (the screamers):**
1. **Ch.1, the Vending Machine.** You crouch to grab a battery from under it; the glass above shatters and a
   gowned arm grabs at you. (It's a corpse rigged on a wire. The monster was never there. Your heart doesn't know that.)
2. **Ch.2, Drawer 13.** The breathing drawer. You open it. Empty. You turn around and The Stitched's face is
   *right there*, inches away, screaming with every mouth. Then it walks away. (It lets you live. Why?)
3. **Ch.3, Phone Camera Reveal.** Looking through the phone at a "safe" room shows the monster standing in the
   corner it's been in the whole time. Lower the phone and it's gone. Raise it again and it's in your face.
4. **Ch.4, Elevator.** The doors open on the wrong floor. Lights cut. When they come back, it's in the
   elevator with you. Doors close. Cut to black, then you wake up on the floor of 4F.
5. **Ch.5, the Fake Maya.** The walkie says "Sam, I'm in the bathroom, I got free!" You open the stall. It's a
   puppet made of Maya's jacket stretched over... something. The real monster drops from the ceiling behind you.
6. **Finale, the Ceiling Drop.** On the stairs to the roof it bursts through the ceiling directly in front of
   you. Run *through* it as it lands (slow-mo for 1 second).

**Dread events (between scares):**
- Wheelchair slowly rolls across a hallway on its own.
- Footsteps above you that stop when you stop.
- A PA call: *"Dr. Voss to Ward C. Dr. Voss to Ward C."*, then it says *"Sam Reyes to Ward C."*
- Blood slowly drips from a ceiling tile and the drip speeds up.
- A hospital bed you passed is now in the hallway behind you.
- Your own name written on a whiteboard patient list. Status: **"ADMITTED."**
- Hide in a locker and see eyes through the slats of the locker across the hall.

**Gore (bloody but tasteful-scary, not cartoony):**
- The morgue: bodies with Y-incisions, sewn hands.
- Operating theater: a blood-soaked table, surgical tools, buckets.
- Blood trails that lead somewhere you'll have to follow.
- Death screen: wet red vignette, jittering, text: **YOU HAVE BEEN ADMITTED.**

**Accessibility:** a "Less Gore" toggle and a "Photosensitivity" toggle for flashing lights.

---

## 7. Endings

- **ESCAPED (bad-ish):** You leave Maya. You climb down the fire escape at dawn. Back in the car, the dashcam
  turns on by itself. Maya's voice in the back seat: *"Why'd you leave me?"* Smash cut to black.
- **TOGETHER (good):** You free Maya. Chase to the roof. You both climb down as the sun rises, and The Stitched
  stops at the edge of the sunlight, unable to follow. Final shot: Maya's camera, still recording, shows one
  more figure in a 4th-floor window... waving.
- **Secret:** Collect all 8 tapes. Voss's last tape reveals *he's the one who was stitched*, and he's been
  talking to you through the PA from inside it the whole time.

---

## 8. UI / Art Direction

- **Font:** "Special Elite" (typewriter, free on Google Fonts) for notes and titles.
- **HUD:** Minimal. Battery bar in the corner only when the flashlight is low. Nothing else on screen.
- **Main menu:** The hospital at night from the car's view, rain on the windshield, wipers moving.
  Menu items written like a patient intake form.
- **Palette:** Sick fluorescent green, rust brown, bone white, deep red only for blood and emergency lights.
- **Post-processing:** Pixelation (render at ~480p and upscale), film grain, vignette, slight fisheye,
  chromatic aberration that gets worse when the monster is near.

---

## 9. Build Phases

1. **Phase 1 (now): Design and art.** This doc, asset collection, sound list.
2. **Phase 2: Prototype.** Three.js setup, first-person controller, flashlight, one test hallway, PSX shaders.
3. **Phase 3: Level building.** Lobby, B1, the floors. Doors, keycards, hiding.
4. **Phase 4: The monster.** AI (patrol, hear, chase, search), animations, kill sequence.
5. **Phase 5: Cutscenes and scares.** Opening cutscene, scripted jumpscares, endings.
6. **Phase 6: Polish and ship.** Menu, settings, loading screens, GitHub Pages deploy.
