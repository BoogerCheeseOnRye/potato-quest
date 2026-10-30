# POTATO QUEST

A low-poly, 2.5D action-RPG that runs in a phone browser on potato hardware.
Every graphic is SVG drawn from primitives — no textures, no spritesheets, no
build step, no engine. The camera projects a flat, metric world into three
dimensions the way a fake-3D scene would.

You wash up on **Spudwrack Shore** in the ruins of a dead empire with the clothes
on your back, one cold potato, and a bedroll. No money. No weapon. The wildlife
scales with you, the world is mostly empty between the things that want you dead,
and the only thing that grows reliably out here is the potato.

## Run it

```sh
cd /root/potato-quest
npm start                 # node tools/serve.mjs 8080
```

Open the printed LAN address on a phone on the same Wi-Fi, or
`http://localhost:8080/`. Saves live in `localStorage` (`potatoquest.save.v1`);
the menu panel can wipe them. Sound is synthesised at runtime and starts muted
until you tap the speaker button.

There is no build step for development. Edit a file, reload the page.

## Controls

| Action | Touch | Mouse + keyboard | Controller |
| --- | --- | --- | --- |
| Move | drag / tap the ground | left click ground, or WASD | left stick |
| Attack | tap enemy, hotbar `⚔` | `J` / `Space` | A |
| Ability | tap hotbar slot | `1`–`5` | face buttons |
| Roll | hotbar `➤` | `6` | LT |
| Heal (bandage → ration) | hotbar slot 7 | `7` | RT |
| Interact / loot | tap prompt | `K` / `E` | X |
| Camera | `◈` view button | `Tab` / `V` | D-pad up/down |
| Panels | `SHEET`, `BAG`, `CAMP`, top icons | `C`, `I`, `F`, `M`, `Q`, `Esc` | Start |
| Sound on/off | `♪` top-right | — | — |

Three cameras cycle in order: **isometric → third person → first person**. The
world is the same in all three; only the projection and yaw change.

## What you are supposed to do

The HUD answers this at all times, in the top-left: a compass needle, the current
quest's name, the single next step, and the distance in metres. A gold diamond
marks the objective in the world. Points of interest (camp, waystones, gates,
caches, farms, vendors, trainers, bosses) float a labelled beacon so the map
explains itself without opening the map.

1. **START** puts you on the shore as a castaway with no path yet.
2. The banner points you at **Marrow**, the only other person on the beach.
   Picking a **path** (Warden, Drifter, Technosavant, Shaman, Tinker) sets your
   class abilities, skills, and stat spread. It does **not** hand you gear: the
   rags, the spud and the bedroll stay yours.
3. Kill scavengers with your fists, gather scrap, and finish *What the Sea Left*.
4. Open **CAMP** to plant potatoes, craft, and — with the bedroll — sleep through
   the night until 06:00 (after dusk, and never with a monster within 12 m).
   Sleeping restores HP/MP, clears debuffs, advances crops, and passes the night.

## The look

- **Faceted low-poly art.** Every sprite is a handful of flat polygons with a
  dark outline, one lit face and one shadow face. No gradients on geometry, no
  textures, cheap to draw on a phone.
- **Real metric scale.** The world is in metres: a person is 1.8 m, a tree about
  8 m, a house 6 m, a pebble 0.15 m. The isometric camera draws 24 px per metre,
  so scale is consistent and readable everywhere. Very small monsters get a
  display-only boost (up to 1.7×) so a 35 cm rat still reads on a phone; their
  collision stays honest.
- **Ground that is not wallpaper.** The ground is a low-contrast faceted plane
  with hundreds of organic polygon patches and ~900 pebbles, tufts and cracks at
  true size, so the eye has scale cues and the tiling never reads as a grid.
- **Water with a shore.** Pools get a damp sand rim, a deep centre and fixed
  ripple arcs instead of a flat cut-out ellipse.
- **Potato layer.** Spudwrack Shore, Spudwood, Spud Gulls, Spud Crabs, Spud
  Boars, Spud Shamblers, Spud Rations, Baked Potatoes, Seed Potatoes. The joke is
  in the names and the props, not in the tone: the late zones stay grim.
- **Ambient sound.** Synthesised wind, water, fire crackle, birds and crickets —
  no audio files. It follows the zone, the time of day and whether you are near
  a camp fire. Mute is persisted.

## Systems

- **Rules** — D&D 3.5 style: six ability scores, BAB, saves, AC, armour caps,
  `1dX` damage, crit ranges and multipliers, skill ranks, use-based training.
- **Progression** — XP levels raise your primary score; abilities and skills
  level by use (RuneScape/Morrowind style), not by spending points alone.
- **Combat** — real-time attacks, abilities on cooldowns, status effects,
  projectiles, pets, turrets, rifts. Wildlife scales with player level; rare,
  elite and legendary named spawns use Diablo-like rates.
- **World** — seeded generation, an eight-zone chain from the shore to
  Havenreach, POIs, a spatial obstacle grid, clustered forests, and a spawn
  director that leaves some zones deliberately quiet.
- **Professions & farming** — gathering nodes, crafting, crop plots that grow in
  game time (1 real second ≈ 1 game minute), watering, seed returns. Potatoes
  are the fast, forgiving crop.
- **Quests** — a twelve-chapter main story plus side quests and generated
  bounties, with quest state, objective counters, rewards, and unlocks.
- **Items** — base types, affixes, rarity tiers (common → legendary), uniques,
  stacks, equipment slots, two-handed rules, selling and dropping.
- **Pets** — tame weakened beasts, set them to follow or stay, level them.

## Starting kit

A new castaway has exactly:

| Item | Slot | Notes |
| --- | --- | --- |
| Castaway Rags | body | AC 0, `armorType: none`; just clothing |
| Spud Ration | — | one meal: heals `1d4`, brief +1 CON |
| Bedroll | — | required to sleep through the night |

`marks: 0`. No weapon, armour, bandages, tools, or seeds. Everything else is
found, grown, crafted, bought, or taken off something.

## Development

```sh
npm test                   # node --test tests/  (40 tests)
node tools/sim.mjs         # stub-DOM smoke run: all zones, combat, rest, save/load
node tools/sim.mjs 40      # longer run (seconds per zone)
```

### The model yard (`dev.html`)

`dev.html` + `src/dev/showcase.js` is a walkable field containing **every prop,
every creature sprite, every NPC and one health bar of each tier**, with labels.
Use it to check art, scale, camera modes and role sprites without playing
through eight zones. Open `http://localhost:8080/dev.html`.

- Walk with WASD / left stick, cycle cameras with the view button.
- Keys `1`–`5` wear each path (Warden, Drifter, Technosavant, Shaman, Tinker).
- *Spawn live crab* drops a real monster to test combat; *Reset yard* rebuilds.
- The dev bar shows FPS, label count and dummy count.
- The showcase never writes to `localStorage`, so it cannot touch a real save.

**It must never ship.** The showcase is deliberately excluded from the
production build:

```sh
node tools/build.mjs          # writes docs/, skipping dev.html and src/dev/
node tools/build.mjs --check  # fails if docs/ contains any dev file or reference
```

`tools/build.mjs` copies only `index.html`, `css/` and `src/` (minus `src/dev/`),
then scans every file it wrote and aborts with a non-zero exit code if
`dev.html`, `src/dev/` or `dev/showcase.js` appears anywhere. If you add more
dev-only files, add them to `SKIP_FILES` / `SKIP_DIRS` in `tools/build.mjs`.

### Visual checks without a browser

```sh
node tools/snapshot.mjs wrack_shore iso   /tmp/shore-iso.png
node tools/snapshot.mjs rustfield   third /tmp/rust-third.png
node tools/snapshot.mjs sporewood   first /tmp/spore-first.png
```

`tools/snapshot.mjs` builds a real zone with the real generator and camera,
writes SVG, and rasterises it with `rsvg-convert` so you can look at the layout.
It mirrors `src/render/scene.js`; keep the two in sync when you change rendering.
Flags: `--seed N`, `--w`, `--h`, `--monsters N`, `--boss`, `--level N`.

## Publishing (GitHub Pages)

`docs/` is the published site. GitHub Pages serves it from the repository:

1. `node tools/build.mjs` — rebuild `docs/` from source, dev excluded.
2. Commit `docs/` along with the source.
3. Repository → Settings → Pages → Source: *Deploy from a branch*, branch
   `main`, folder `/docs`.

`.nojekyll` is written into `docs/` so Pages serves the files as-is. Never edit
`docs/` by hand: it is generated. Never publish the repository root as the Pages
source, or `dev.html` goes live with it.

## Layout

```
index.html              shell, HUD markup, SVG scene root
dev.html                DEV ONLY model yard — excluded from the build
css/style.css           mobile HUD, panels, touch targets
src/main.js             boot: title, HUD, input, scene, audio
src/game.js             game object: loop, lifecycle, travel, save/load, rest
src/core/               seeded RNG, projection + cameras
src/rules/dnd.js        D&D 3.5 tables and dice
src/data/               items, bestiary, zones, quests, professions, abilities, NPCs
src/systems/            sheet, inventory, combat, quests, farming, progression,
                        spawn, guidance
src/world/world.js      seeded zone generation, POIs, spawn director, rifts
src/entities/           player/pet factories
src/render/sprites.js   every SVG model, and spriteTop() for health bars
src/render/scene.js     renderer: terrain, billboards, beacons, weather, tint
src/audio/ambient.js    synthesised wind/water/fire/birds/crickets
src/ui/                 HUD, compass banner, panels
src/input/              keyboard, mouse, touch, gamepad
src/dev/                DEV ONLY showcase — excluded from the build
tools/                  static server, build, headless snapshot, gameplay sim
tests/                  node:test suites
docs/                   generated production site (git-committed for Pages)
```
