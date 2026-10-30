# ElevenLabs Sound List

**How to use:** In ElevenLabs, open **Sound Effects**. Paste each prompt, set the duration shown, and
generate 3–4 versions. Keep the scariest one and download it as **MP3**, saved with the exact filename
listed (this matters, because the game code will look for these names).

Put them in these folders:
```
horrorgame/assets/audio/ambience/
horrorgame/assets/audio/sfx/
horrorgame/assets/audio/monster/
horrorgame/assets/audio/scares/
horrorgame/assets/audio/voice/
```

**Tips:**
- Turn **"Prompt influence"** up high (~0.7) for specific sounds and down (~0.3) for ambience.
- For loops, add *"seamless loop"* to the prompt and turn on the **Loop** option if your plan shows it.
- If something sounds too "movie-trailer", add *"realistic, dry, close-mic, no music"*.
- Priority order: ★★★ first (needed for the prototype), then ★★, then ★.

---

## 1. Ambience (loops) → `ambience/`

| ★ | Filename | Duration | Prompt |
|---|----------|----------|--------|
| ✓ | ~~`hospital_drone.mp3`~~ | — | **Not needed:** the game's built-in drone is the one we're keeping. |
| ★★★ | `hallway_room_tone.mp3` | 22s | Empty abandoned hospital hallway room tone, distant wind through broken windows, faint water dripping, subtle building creaks, seamless loop |
| ★★★ | `fluorescent_buzz.mp3` | 10s | Old fluorescent light tube buzzing and humming, electrical whine, occasional flicker crackle, seamless loop |
| ★★ | `morgue_ambience.mp3` | 22s | Cold basement morgue ambience, refrigeration units humming, metal ticking, distant pipe dripping, very quiet and eerie, seamless loop |
| ★★ | `boiler_room.mp3` | 22s | Old industrial boiler room, rumbling furnace, hissing steam pipes, metal clanking, seamless loop |
| ★★ | `rain_outside_muffled.mp3` | 22s | Heavy rain heard from inside a concrete building, muffled, distant thunder, water running down gutters, seamless loop |
| ★★ | `heartbeat_slow.mp3` | 10s | Slow heavy human heartbeat, deep and muffled, as heard from inside the body, seamless loop |
| ★★ | `heartbeat_fast.mp3` | 10s | Fast panicked human heartbeat, pounding and muffled, terrified breathing feel, seamless loop |
| ★ | `pediatrics_ambience.mp3` | 22s | Abandoned children's hospital ward, faint distant child giggle far away, creaking, wind, very eerie and quiet, seamless loop |
| ★ | `chase_tension.mp3` | 22s | Intense horror chase underscore, pounding low percussion, screeching dissonant strings, building panic, seamless loop |

## 2. Player sounds → `sfx/`

| ★ | Filename | Duration | Prompt |
|---|----------|----------|--------|
| ★★★ | `footstep_tile_1.mp3` (make 4: `_1` to `_4`) | 1s | Single sneaker footstep on dirty hospital tile floor with grit and debris, close, realistic |
| ★★★ | `footstep_run.mp3` | 4s | Sneakers running on tile floor in an echoing hallway, panicked pace, realistic |
| ★★★ | `flashlight_click.mp3` | 1s | Plastic flashlight button click on, sharp and close |
| ★★★ | `breathing_scared.mp3` | 8s | Teenager breathing heavily and shakily, scared, trying to stay quiet, close mic |
| ★★★ | `door_creak_open.mp3` | 3s | Old heavy wooden hospital door creaking slowly open, long eerie squeal of hinges |
| ★★ | `door_locked_rattle.mp3` | 2s | Trying to open a locked metal door, handle rattling, latch clunk |
| ★★ | `locker_open.mp3` | 2s | Metal locker door opening with a rusty squeak |
| ★★ | `locker_close_hide.mp3` | 2s | Metal locker door pulled shut quietly from inside, muffled |
| ★★ | `battery_insert.mp3` | 1s | Batteries being pushed into a flashlight, plastic click |
| ★★ | `pickup_paper.mp3` | 1s | Picking up an old crumpled piece of paper, crinkle |
| ★★ | `keycard_beep.mp3` | 1s | Electronic keycard reader beep and door unlock clunk |
| ★★ | `keycard_denied.mp3` | 1s | Electronic keycard reader error buzz, harsh |
| ★★ | `glass_crunch_step.mp3` | 1s | Footstep crunching on broken glass |
| ★★ | `knock_over_tray.mp3` | 2s | Metal surgical tray and tools falling and clattering loudly on a tile floor |
| ★★ | `hold_breath_gasp.mp3` | 2s | Person releasing a held breath with a sharp desperate gasp |
| ★ | `cassette_insert_play.mp3` | 3s | Cassette tape inserted into an old recorder, button clunk, tape hiss starting |
| ★ | `walkie_static.mp3` | 3s | Walkie-talkie static burst, crackle and squelch |
| ★ | `phone_camera_raise.mp3` | 1s | Subtle digital phone camera activation chirp |
| ★ | `elevator_ding_broken.mp3` | 3s | Old elevator arrival ding that is warped and slowed down, doors grinding open |
| ★ | `drawer_morgue_slide.mp3` | 3s | Heavy steel morgue drawer sliding out on metal rollers, cold and loud |

## 3. The Monster ("The Stitched") → `monster/`

| ★ | Filename | Duration | Prompt |
|---|----------|----------|--------|
| ★★★ | `monster_drag_tubes.mp3` | 6s | Something heavy dragging wet rubber tubes and chains slowly across a tile floor, slow uneven steps, creepy |
| ★★★ | `monster_breathing.mp3` | 8s | Monstrous wet rasping breathing through multiple throats at once, gurgling, slow, close and horrifying |
| ★★★ | `monster_scream.mp3` | 3s | Horrifying inhuman scream from several mouths at once, shrieking and gurgling, distorted, extremely loud and aggressive |
| ★★★ | `monster_footstep_heavy.mp3` | 1s | Heavy bare wet footstep on tile, slap with a bony crack |
| ★★ | `monster_growl_distant.mp3` | 5s | Distant inhuman groaning growl echoing down an empty concrete hallway |
| ★★ | `monster_clicking.mp3` | 4s | Rapid wet clicking and clacking sounds from a creature's throat, insect-like, hunting |
| ★★ | `monster_ceiling_crawl.mp3` | 6s | Something large crawling across ceiling tiles above, scraping, tiles shifting, dust falling |
| ★★ | `monster_sniff.mp3` | 3s | Creature sniffing deeply and wetly, searching for prey |
| ★★ | `monster_ceiling_burst.mp3` | 3s | Creature crashing down through ceiling tiles, debris and dust falling, heavy impact |
| ★★ | `kill_grab_gore.mp3` | 4s | Brutal monster attack, wet flesh tearing, bone crunching, gory squelch, victim's choked cry |
| ★ | `monster_humming.mp3` | 8s | Distorted low wordless humming of a lullaby from a deep inhuman throat, very creepy |
| ★ | `stitching_sound.mp3` | 6s | Needle repeatedly piercing flesh and thread pulling tight, wet and slow, close |

## 4. Jumpscare stingers → `scares/`

| ★ | Filename | Duration | Prompt |
|---|----------|----------|--------|
| ★★★ | `jumpscare_sting_1.mp3` | 2s | Loud violent horror jumpscare stinger, sudden screeching dissonant orchestra hit with a distorted scream |
| ★★★ | `jumpscare_sting_2.mp3` | 2s | Sudden extremely loud metallic screech and bass impact, horror jumpscare |
| ★★ | `glass_shatter_grab.mp3` | 2s | Glass window violently shattering right next to you, sharp and loud |
| ★★ | `lights_slam_on.mp3` | 4s | Huge building power surge, many electrical breakers clunking on in sequence, fluorescent lights buzzing to life |
| ★★ | `metal_shutter_slam.mp3` | 3s | Heavy steel security shutter slamming down to the floor, massive echoing metal crash |
| ★★ | `tension_riser.mp3` | 8s | Horror tension riser, slowly rising dissonant strings and noise building to a peak, then cut |
| ★ | `heart_monitor_flatline.mp3` | 5s | Hospital heart monitor beeping then going into a long continuous flatline tone |
| ★ | `heart_monitor_beep.mp3` | 1s | Single hospital heart monitor beep |
| ★ | `music_box_lullaby.mp3` | 15s | Old broken music box playing a slow sad lullaby, slightly out of tune, winding down and slowing |
| ★ | `wheelchair_roll.mp3` | 5s | Old squeaky wheelchair slowly rolling across a tile floor by itself |

## 5. Cutscene sounds → `sfx/`

| ★ | Filename | Duration | Prompt |
|---|----------|----------|--------|
| ★★ | `car_rain_interior.mp3` | 15s | Inside a parked car at night, heavy rain drumming on the roof, windshield wipers slowly swiping |
| ★★ | `car_door.mp3` | 2s | Car door opening and slamming shut in heavy rain at night, muffled thunk |
| ★★ | `fence_rattle.mp3` | 3s | Climbing through a chain link fence, metal rattling and scraping |
| ★★ | `pa_crackle.mp3` | 3s | Old hospital PA speaker system crackling on with feedback hum |
| ★★ | `vent_scrape_drag.mp3` | 4s | Something being dragged quickly up through a metal air vent, scraping and banging |
| ★ | `phone_drop.mp3` | 2s | Smartphone dropping and clattering on a hard tile floor |
| ★ | `dog_bark_distant.mp3` | 4s | Single dog barking far away at night, echoing |

---

## 6. Voice lines → `voice/`

Use **Text to Speech** (not Sound Effects) for these. For the PA, use a calm older voice, then add
"telephone/radio" style if your plan has the **Voice Changer** or effects. Otherwise I'll add the radio filter in code.

**Maya** (teen girl voice, energetic → terrified):
| Filename | Line |
|----------|------|
| `maya_intro.mp3` | "Okay okay, we're live! Say hi to all eleven viewers, Sam." |
| `maya_window.mp3` | "Dude... the fourth floor window. Was that light on a second ago?" |
| `maya_door.mp3` | "Side door's open. Somebody propped it with a brick." |
| `maya_signin.mp3` | "Wait. Look at this sign-in book. The last entry is... tonight's date." |
| `maya_scream.mp3` | (Use Sound Effects): *Teenage girl screaming in terror, being dragged away, scream fading upward* |
| `maya_walkie_1.mp3` | "Sam... Sam, can you hear me? It took me upstairs. It's... it's sewing something. Please. Find the keycards. Get the lockdown off." |
| `maya_walkie_2.mp3` | "Don't let it hear you. It can't see well. It listens." |
| `maya_walkie_3.mp3` | "It's coming back. I can hear the tubes dragging. Please hurry." |
| `maya_fake.mp3` | "Sam! I got free! I'm in the bathroom on one, come get me!" (same voice but slightly *off*: lower the stability slider) |
| `maya_rescued.mp3` | "You came back. You actually came back. Go, GO, it's right behind us!" |

**Sam** (the player, a teen: pick any teen voice you like. Quiet, nervous, trying to sound braver than they are):
| Filename | Line |
|----------|------|
| `sam_hi.mp3` | "...hi. This is a terrible idea." (awkward, half-laughing) |
| `sam_comeback.mp3` | "Maya. Maya, come back." (low, uneasy, almost a whisper) |
| `sam_scream.mp3` | "MAYA!" (screamed, voice cracking; turn stability down) |
| `sam_walkie.mp3` | "Maya?! Maya, where are you?!" (panicked, out of breath, into a walkie-talkie) |

**PA System / Dr. Voss** (calm, warm, older male voice. Creepy because it's kind):
| Filename | Line |
|----------|------|
| `pa_lockdown.mp3` | "Quarantine protocol engaged. All exits are sealed. Please remain calm and return to your rooms." |
| `pa_doctor_call.mp3` | "Doctor Voss to Ward C. Doctor Voss to Ward C." |
| `pa_sam_call.mp3` | "Sam Reyes to Ward C. Sam Reyes, please report to Ward C." |
| `voss_leaving.mp3` | "Leaving so soon? But we've only just admitted you." |
| `voss_tape_1.mp3` | "Continuance Program, entry one. Patient fourteen is responding. The body wants to live. It simply needs... help." |
| `voss_tape_8.mp3` | "If anyone finds this... I didn't run. I'm still here. I'm all of them now. And they're so very hungry." |

---

## 7. Full game: the rest of the story → `voice/`

**Dr. Voss's tapes** (same voice as tapes 1 and 8; calm, tired, recorded on an old cassette):
| Filename | Line |
|----------|------|
| `voss_tape_2.mp3` | "Entry two. We shared tissue between patients nine and eleven. Eleven woke up. Nine did not. Eleven speaks with nine's voice now." |
| `voss_tape_3.mp3` | "The night staff have stopped coming to Ward C. They say the patients hum at night. Patients in comas do not hum." |
| `voss_tape_4.mp3` | "I have joined six of them. They share a heartbeat now. When one sleeps, the others watch. They are never all asleep." |
| `voss_tape_5.mp3` | "It asked for me today. Not by name. It used the voice of a nurse who left us in March. I have not told the board." |
| `voss_tape_6.mp3` | "The children's ward is closed. I won't write down why. If you hear the music box, do not go towards it." |
| `voss_tape_7.mp3` | "The quarantine protocol is ready. If it gets out of Ward C, the building seals itself. Nobody leaves. Not even me." |

**Maya** (endings):
| Filename | Line |
|----------|------|
| `maya_table.mp3` | "Sam?! Sam, get me off this thing! Cut the straps, hurry, it's coming back!" (strapped down, terrified) |
| `maya_left_behind.mp3` | "Why'd you leave me, Sam?" (soft, wrong, from the back seat; lower stability) |
| `maya_together.mp3` | "We're out. We're actually out." (exhausted, crying-laughing, at dawn) |

**Sam**:
| Filename | Line |
|----------|------|
| `sam_found_maya.mp3` | "Maya! I'm here, I've got you. Hold still." (whispered, urgent) |
| `sam_run.mp3` | "RUN! Up the stairs, GO!" (screamed) |

## 8. New lines to record (subtitled in the game until you add them) → `voice/`

Use the same voices you used for Maya and Dr. Voss. Drop the files into `assets/audio/voice/` with these names and tell me, and I'll level them.

**The prologue: Maya alone, the night before** (her phone light, whispering to her camera, nervous but excited)

| File | Line |
|---|---|
| `maya_pro_1.mp3` | "Okay. Ashgrove Memorial, night one. Nobody's been in here since ninety-seven." (quiet, vlogging to her phone) |
| `maya_pro_2.mp3` | "Perfect. And... rolling." (setting the camera down, pleased) |
| `maya_pro_3.mp3` | "...Hello? Is someone there?" (frightened, small voice, echoing hallway) |
| `maya_pro_4.mp3` | "Nope. Nope nope nope." (backing away, panicked whisper) |

**The ringing phone** (could be Maya, could be the monster mimicking her: over a bad phone line)

| File | Line |
|---|---|
| `phone_whisper.mp3` | "...Sam?... ...it's so cold up here..." (weak, whispered, phone-line crackle) |

**The hidden ending: Dr. Voss's final entry** (calm, tired, an old man confessing into a tape recorder)

| File | Line |
|---|---|
| `voss_final.mp3` | "Final entry. Whoever has collected these: you deserve to know what I did. My daughter died on the fourth floor in 1989. Her heart stopped, and I could not start it again. So I built a body that cannot stop. I called it the Continuance. It does not die. It only grows. It doesn't kill the people it takes. It keeps them. I'm in there too. Some nights I can still hear her music box." |
