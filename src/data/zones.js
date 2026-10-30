// The world corridor. Each zone is a large seeded map with gates at its edges;
// progression is a chain, but you can walk back. Density is wildlife abundance:
// some places are almost empty on purpose.
//
// Potato Quest: the potato is the one crop that survived the collapse. It grows
// in ash, in salt, in the shells of dead machines. Every settlement is built on
// it, every road is a spud road, and the currency is still counted in marks but
// everyone calls them spuds.
const S = 260; // default zone size in metres

export const ZONES = [
  {
    id: 'wrack_shore', name: 'Spudwrack Shore', band: [1, 3], habitat: ['shore'], density: 0.30,
    size: S, water: 0.30, obstacles: 0.10, ground: 'shingle',
    palette: { ground: '#3b4348', ground2: '#4a555a', wet: '#2b373c', water: '#1d4a52', accent: '#6f9a9c', fog: '#16232a', sky: '#24363f', night: '#070c10' },
    props: ['rock', 'driftwood', 'wreck', 'kelp', 'puddle', 'shell', 'potato_plant', 'potato_pile'],
    spawnMs: [7000, 15000], maxAlive: 7,
    entry: { x: 76, y: 70 }, camp: true,
    lore: 'The sea gave you back. It kept everything else — except the spuds, which grow in the shingle like they own it.',
    pois: [
      { id: 'camp', kind: 'camp', x: 70, y: 62, r: 9, name: 'Spudwrack Camp' },
      { id: 'waystone_wrack', kind: 'waystone', x: 120, y: 92, r: 3, name: 'Spudwrack Waystone', toZone: 'wrack_shore' },
      { id: 'rift_wrack', kind: 'rift', x: 190, y: 70, r: 4, name: 'Salt & Peel Rift' },
      { id: 'cache_wrack', kind: 'cache', x: 150, y: 190, r: 3, name: "Drowned Spud Cellar" },
      { id: 'npc_stranded', kind: 'npc', x: 90, y: 120, r: 3, name: 'Marrow', npc: 'marrow' },
      { id: 'gate_north', kind: 'gate', x: 130, y: 250, r: 5, name: 'To the Starch Flats', toZone: 'tidal_flats' },
    ],
  },
  {
    id: 'tidal_flats', name: 'Starch Flats', band: [3, 6], habitat: ['tidal'], density: 0.17,
    size: S, water: 0.45, obstacles: 0.05, ground: 'mud',
    palette: { ground: '#4a4f45', ground2: '#5a6154', wet: '#39443a', water: '#2a4f4b', accent: '#8fae9a', fog: '#1d2a26', sky: '#2d403e', night: '#070d0c' },
    props: ['pool', 'shell', 'grass', 'mast', 'stone', 'potato_plant', 'potato_sack'],
    spawnMs: [9000, 18000], maxAlive: 5,
    entry: { x: 130, y: 20 },
    lore: 'When the tide pulls out you can see the old roads under the glass, and the potato rows someone planted along them.',
    pois: [
      { id: 'gate_south', kind: 'gate', x: 130, y: 10, r: 5, name: 'Back to the Wreck', toZone: 'wrack_shore' },
      { id: 'waystone_tidal', kind: 'waystone', x: 130, y: 128, r: 3, name: 'Starch Flats Waystone' },
      { id: 'npc_hermit', kind: 'npc', x: 62, y: 150, r: 3, name: 'The Tallyman', npc: 'tallyman' },
      { id: 'ruin_tidal', kind: 'ruin', x: 190, y: 180, r: 7, name: 'Sunken Tollbooth' },
      { id: 'gate_east', kind: 'gate', x: 250, y: 200, r: 5, name: 'To Fryfield', toZone: 'rustfield' },
    ],
  },
  {
    id: 'rustfield', name: 'Fryfield', band: [6, 9], habitat: ['ruins'], density: 0.34,
    size: S, water: 0.06, obstacles: 0.2, ground: 'rust',
    palette: { ground: '#4a3a2a', ground2: '#5c4833', wet: '#3a2d20', water: '#2e3a32', accent: '#c07a3a', fog: '#241a10', sky: '#3a2a1c', night: '#0d0904' },
    props: ['hull', 'pipe', 'crate', 'scrap', 'tower', 'bone', 'potato_crate', 'potato_pile'],
    spawnMs: [6000, 13000], maxAlive: 9,
    lore: 'Ten thousand machines died here and nobody turned them off. The fryers still work. Nobody knows why.',
    pois: [
      { id: 'gate_west', kind: 'gate', x: 10, y: 200, r: 5, name: 'Back to the Flats', toZone: 'tidal_flats' },
      { id: 'waystone_rust', kind: 'waystone', x: 100, y: 80, r: 3, name: 'Fryfield Waystone' },
      { id: 'boss_rust', kind: 'boss', x: 200, y: 90, r: 8, name: 'The Assembly Line', boss: 'foreman' },
      { id: 'rift_rust', kind: 'rift', x: 70, y: 200, r: 4, name: 'Slag Rift' },
      { id: 'npc_smith', kind: 'npc', x: 130, y: 140, r: 3, name: 'Copper', npc: 'copper' },
      { id: 'gate_north', kind: 'gate', x: 220, y: 250, r: 5, name: 'To the Spudwood', toZone: 'sporewood' },
    ],
  },
  {
    id: 'sporewood', name: 'Spudwood', band: [9, 12], habitat: ['forest'], density: 0.55,
    size: S, water: 0.12, obstacles: 0.3, ground: 'moss',
    palette: { ground: '#2e3d2c', ground2: '#3d5038', wet: '#243428', water: '#1e4038', accent: '#8fd06a', fog: '#14241a', sky: '#263a28', night: '#060c07' },
    props: ['tree', 'mushroom', 'fern', 'log', 'stump', 'glow', 'potato_plant', 'potato_pile', 'scarecrow'],
    spawnMs: [4000, 9000], maxAlive: 12,
    lore: 'The forest grew back wrong: it remembers the network, and it grows potatoes in the shapes of the dead.',
    pois: [
      { id: 'gate_south', kind: 'gate', x: 220, y: 250, r: 5, name: 'Back to Fryfield', toZone: 'rustfield' },
      { id: 'waystone_spore', kind: 'waystone', x: 120, y: 120, r: 3, name: 'Spudwood Waystone' },
      { id: 'npc_grower', kind: 'npc', x: 80, y: 160, r: 3, name: 'Ivy', npc: 'ivy' },
      { id: 'boss_spore', kind: 'boss', x: 190, y: 80, r: 9, name: 'The Last Field', boss: 'last_harvest_npc' },
      { id: 'cache_spore', kind: 'cache', x: 60, y: 70, r: 3, name: 'Root Cellar' },
      { id: 'gate_north', kind: 'gate', x: 30, y: 30, r: 5, name: 'To the Ashen Downs', toZone: 'ashen_downs' },
    ],
  },
  {
    id: 'ashen_downs', name: 'Ashen Downs', band: [12, 15], habitat: ['ash'], density: 0.07,
    size: 300, water: 0.02, obstacles: 0.06, ground: 'ash',
    palette: { ground: '#3a3631', ground2: '#4a453e', wet: '#312e2a', water: '#2b3436', accent: '#a89a88', fog: '#211f1b', sky: '#443e36', night: '#0b0a09' },
    props: ['stump', 'bone', 'stone', 'monolith', 'ashpile', 'potato_pile', 'scarecrow'],
    spawnMs: [16000, 30000], maxAlive: 3,
    lore: 'Nothing lives here. That is what the thing under the ash wants you to think. The potatoes know better.',
    pois: [
      { id: 'gate_south', kind: 'gate', x: 30, y: 30, r: 5, name: 'Back to Spudwood', toZone: 'sporewood' },
      { id: 'waystone_ash', kind: 'waystone', x: 150, y: 150, r: 3, name: 'Ashen Waystone' },
      { id: 'boss_ash', kind: 'boss', x: 230, y: 90, r: 10, name: 'The Walking Line', boss: 'pale_circuit_npc' },
      { id: 'cache_ash', kind: 'cache', x: 90, y: 230, r: 3, name: 'Survey Post 12' },
      { id: 'gate_east', kind: 'gate', x: 290, y: 160, r: 5, name: 'To the Dead Grid', toZone: 'dead_grid' },
    ],
  },
  {
    id: 'dead_grid', name: 'The Dead Grid', band: [15, 18], habitat: ['grid'], density: 0.22,
    size: 280, water: 0.04, obstacles: 0.26, ground: 'grid',
    palette: { ground: '#2a353b', ground2: '#38474f', wet: '#233037', water: '#1e3238', accent: '#4fc0b2', fog: '#0f1c22', sky: '#1e3038', night: '#050a0c' },
    props: ['pylon', 'cable', 'server', 'glass', 'conduit', 'potato_crate'],
    spawnMs: [8000, 17000], maxAlive: 7,
    lore: 'The grid is still on. Nobody is paying the bill. Something is growing potatoes in the server racks.',
    pois: [
      { id: 'gate_west', kind: 'gate', x: 10, y: 160, r: 5, name: 'Back to the Downs', toZone: 'ashen_downs' },
      { id: 'waystone_grid', kind: 'waystone', x: 140, y: 140, r: 3, name: 'Grid Waystone' },
      { id: 'ruin_grid', kind: 'ruin', x: 200, y: 200, r: 9, name: 'Substation Theta' },
      { id: 'rift_grid', kind: 'rift', x: 80, y: 80, r: 4, name: 'Null Rift' },
      { id: 'gate_north', kind: 'gate', x: 140, y: 270, r: 5, name: 'To the Relay Spire', toZone: 'relay_spire' },
    ],
  },
  {
    id: 'relay_spire', name: 'Relay Spire', band: [18, 21], habitat: ['spire'], density: 0.33,
    size: 240, water: 0.03, obstacles: 0.22, ground: 'spire',
    palette: { ground: '#313a45', ground2: '#414d5a', wet: '#27313b', water: '#1f2d38', accent: '#7fa8e8', fog: '#111c26', sky: '#26344a', night: '#06090e' },
    props: ['spire', 'pylon', 'glass', 'conduit', 'cable', 'potato_pile'],
    spawnMs: [6000, 12000], maxAlive: 9,
    lore: 'The Spire was a lighthouse for data. It is still calling something home, and the fields at its foot are the only green for miles.',
    pois: [
      { id: 'gate_south', kind: 'gate', x: 140, y: 230, r: 5, name: 'Back to the Grid', toZone: 'dead_grid' },
      { id: 'waystone_spire', kind: 'waystone', x: 120, y: 120, r: 3, name: 'Spire Waystone' },
      { id: 'boss_spire', kind: 'boss', x: 120, y: 60, r: 12, name: 'Ninth Relay', boss: 'ninth_relay' },
      { id: 'cache_spire', kind: 'cache', x: 60, y: 190, r: 3, name: 'Password Room' },
      { id: 'gate_east', kind: 'gate', x: 230, y: 140, r: 5, name: 'To Havenreach', toZone: 'havenreach' },
    ],
  },
  {
    id: 'havenreach', name: 'Havenreach', band: [20, 24], habitat: ['town'], density: 0.04,
    size: 240, water: 0.10, obstacles: 0.14, ground: 'town',
    palette: { ground: '#3d3e36', ground2: '#4e4f43', wet: '#33352d', water: '#24403f', accent: '#e8b455', fog: '#1c2119', sky: '#3a4030', night: '#0a0c08' },
    props: ['building', 'lamp', 'cart', 'tree', 'banner', 'well', 'potato_crate', 'potato_sack', 'potato_plant'],
    spawnMs: [25000, 40000], maxAlive: 2, safe: true,
    lore: 'People. Walls. A market that takes scrap, spuds and stories. It is not much, but it is alive.',
    pois: [
      { id: 'gate_west', kind: 'gate', x: 10, y: 140, r: 5, name: 'Back to the Spire', toZone: 'relay_spire' },
      { id: 'waystone_haven', kind: 'waystone', x: 120, y: 120, r: 3, name: 'Havenreach Waystone' },
      { id: 'npc_archivist', kind: 'npc', x: 120, y: 150, r: 3, name: 'The Archivist', npc: 'archivist' },
      { id: 'vendor_haven', kind: 'vendor', x: 155, y: 150, r: 3, name: 'Ossuary Market', npc: 'vendor' },
      { id: 'trainer_haven', kind: 'trainer', x: 90, y: 150, r: 3, name: 'The Yard', npc: 'trainer' },
      { id: 'farm_haven', kind: 'farm', x: 80, y: 190, r: 8, name: 'Haven Spud Fields' },
      { id: 'board_haven', kind: 'board', x: 150, y: 120, r: 3, name: 'Bounty Board' },
    ],
  },
];
export const ZONE_BY_ID = Object.fromEntries(ZONES.map(z => [z.id, z]));

export const ZONE_ORDER = ZONES.map(z => z.id);

export function nextZone(id) {
  const i = ZONE_ORDER.indexOf(id);
  return i >= 0 && i < ZONE_ORDER.length - 1 ? ZONE_ORDER[i + 1] : null;
}

// Ambient descriptor used by the renderer and the zone info line.
export function zoneMood(zone) {
  if (zone.safe) return 'settled';
  if (zone.density < 0.1) return 'desolate';
  if (zone.density < 0.2) return 'quiet';
  if (zone.density < 0.4) return 'wild';
  return 'teeming';
}

export const WEATHER = [
  { id: 'clear', name: 'clear', tint: 0, particle: null },
  { id: 'mist', name: 'mist', tint: 0.18, particle: 'fog' },
  { id: 'rain', name: 'rain', tint: 0.1, particle: 'rain' },
  { id: 'ashfall', name: 'ashfall', tint: 0.14, particle: 'ash' },
  { id: 'spores', name: 'spores', tint: 0.08, particle: 'spore' },
  { id: 'static', name: 'static', tint: 0.12, particle: 'spark' },
];
