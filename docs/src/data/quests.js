// Quests. Objectives are checked against the event log the game feeds in
// (systems/quests.js). `main: true` chains gate zone progress.
export const QUESTS = {
  // ---------------- main line ----------------
  m1_washup: {
    id: 'm1_washup', main: true, act: 1, name: 'What the Sea Left', giver: 'marrow', zone: 'wrack_shore',
    desc: 'You are alive, which is more than the ship managed. Find your feet, pick a path, and find the only other person on this shore.',
    objectives: [
      { type: 'role', target: 'any', count: 1, label: 'Choose a path' },
      { type: 'talk', target: 'marrow', count: 1, label: 'Speak to Marrow' },
    ],
    rewards: { xp: 120, marks: 15, items: [{ id: 'bandage', qty: 3 }] },
    next: 'm2_salvage',
  },
  m2_salvage: {
    id: 'm2_salvage', main: true, act: 1, name: 'Spud Rights', giver: 'marrow', zone: 'wrack_shore',
    desc: 'Marrow says the scavengers have been stripping the wreck for weeks — and eating the spuds that grow in the shingle. What they took, you need. What they are, you can probably kill.',
    objectives: [
      { type: 'kill', target: 'wreck_scavenger', count: 4, label: 'Kill Wreck Scavengers' },
      { type: 'collect', target: 'scrap', count: 3, label: 'Gather Scrap' },
    ],
    rewards: { xp: 260, marks: 30, items: [{ id: 'rusted_blade', qty: 1 }, { id: 'salve', qty: 2 }], unlock: ['campfire'] },
    next: 'm3_flats',
  },
  m3_flats: {
    id: 'm3_flats', main: true, act: 1, name: 'The Flats Are Listening', giver: 'marrow', zone: 'tidal_flats',
    desc: 'North of the wreck the shingle gives way to glass flats, and someone has planted potatoes along the old road. A man called the Tallyman counts things out there. He counts people too.',
    objectives: [
      { type: 'reach', target: 'tidal_flats', count: 1, label: 'Cross into the Tidal Flats' },
      { type: 'talk', target: 'tallyman', count: 1, label: 'Find the Tallyman' },
    ],
    rewards: { xp: 340, marks: 40, items: [{ id: 'raw_fish', qty: 3 }], unlock: ['fishing'] },
    next: 'm4_toll',
  },
  m4_toll: {
    id: 'm4_toll', main: true, act: 1, name: 'Toll Due', giver: 'tallyman', zone: 'tidal_flats',
    desc: 'The old tollbooth still stands, and something inside it has been charging a price in salt and blood. The Tallyman wants the ledger.',
    objectives: [
      { type: 'kill', target: 'salt_wraith', count: 3, label: 'Put down Salt Wraiths' },
      { type: 'reach', target: 'ruin_tidal', count: 1, label: 'Enter the Sunken Tollbooth' },
      { type: 'collect', target: 'core_shard', count: 1, label: 'Recover a Core Shard' },
    ],
    rewards: { xp: 520, marks: 60, items: [{ id: 'seed_pouch', qty: 1 }, { id: 'seed_potato', qty: 6 }], unlock: ['farming'] },
    next: 'm5_iron',
  },
  m5_iron: {
    id: 'm5_iron', main: true, act: 2, name: 'Iron in the Rust', giver: 'copper', zone: 'rustfield',
    desc: 'Copper keeps a forge in the corpse of a factory. She will teach you to work metal if you bring her enough of it — and thin out the hounds.',
    objectives: [
      { type: 'kill', target: 'rust_hound', count: 5, label: 'Kill Rust Hounds' },
      { type: 'collect', target: 'alloy', count: 2, label: 'Bring Salvaged Alloy' },
      { type: 'craft', target: 'any', count: 1, label: 'Forge something at an anvil' },
    ],
    rewards: { xp: 780, marks: 90, items: [{ id: 'alloy', qty: 2 }, { id: 'toolkit', qty: 1 }], unlock: ['smithing', 'anvil'] },
    next: 'm6_foreman',
  },
  m6_foreman: {
    id: 'm6_foreman', main: true, act: 2, name: 'The Foreman', giver: 'copper', zone: 'rustfield',
    desc: 'Something on the assembly line still thinks the shift is running. Nine-Fingers has been clocking in for four hundred years. Clock it out.',
    objectives: [
      { type: 'named', target: 'foreman', count: 1, label: 'Destroy Foreman Nine-Fingers' },
    ],
    rewards: { xp: 1100, marks: 140, items: [{ id: 'copper_ring', qty: 1 }, { id: 'salve', qty: 3 }] },
    next: 'm7_roots',
  },
  m7_roots: {
    id: 'm7_roots', main: true, act: 2, name: 'Spuds and Ruin', giver: 'ivy', zone: 'sporewood',
    desc: 'Ivy grows potatoes in a forest that eats people. She wants to know whether the beasts can be reasoned with, and whether the fungus has a heart.',
    objectives: [
      { type: 'tame', target: 'any', count: 1, label: 'Tame a wild creature' },
      { type: 'collect', target: 'spore', count: 5, label: 'Gather Glow Spores' },
    ],
    rewards: { xp: 1400, marks: 160, items: [{ id: 'seed_potato', qty: 6 }, { id: 'feral_cloak', qty: 1 }] },
    next: 'm8_harvest',
  },
  m8_harvest: {
    id: 'm8_harvest', main: true, act: 2, name: 'The Last Field', giver: 'ivy', zone: 'sporewood',
    desc: 'Deep in the wood a shambler tends a field of potatoes that used to be people. Ivy says it is the only farmer left who never stops. Stop it.',
    objectives: [
      { type: 'named', target: 'last_harvest_npc', count: 1, label: 'Put down The Last Harvest' },
    ],
    rewards: { xp: 1900, marks: 220, items: [{ id: 'spore', qty: 6 }, { id: 'salve', qty: 4 }] },
    next: 'm9_ash',
  },
  m9_ash: {
    id: 'm9_ash', main: true, act: 3, name: 'Across the Ash', giver: 'ivy', zone: 'ashen_downs',
    desc: 'Nothing lives in the Downs. The thing that walks the old power line is not living either. Cross it, and see what is on the other side.',
    objectives: [
      { type: 'reach', target: 'ashen_downs', count: 1, label: 'Cross the Ashen Downs' },
      { type: 'named', target: 'pale_circuit_npc', count: 1, label: 'End the Pale Circuit' },
    ],
    rewards: { xp: 2600, marks: 300, items: [{ id: 'core_shard', qty: 3 }] },
    next: 'm10_grid',
  },
  m10_grid: {
    id: 'm10_grid', main: true, act: 3, name: 'Ghosts in the Grid', giver: 'signal', zone: 'dead_grid',
    desc: 'A voice on a dead band: the Archivist of Havenreach. She wants a memory core from Substation Theta. Do not listen to it for too long.',
    objectives: [
      { type: 'reach', target: 'ruin_grid', count: 1, label: 'Reach Substation Theta' },
      { type: 'killfamily', target: 'construct', count: 6, label: 'Destroy grid constructs' },
      { type: 'collect', target: 'core_shard', count: 3, label: 'Recover memory cores' },
    ],
    rewards: { xp: 3400, marks: 380, items: [{ id: 'signal_ring', qty: 1 }, { id: 'tonic', qty: 4 }] },
    next: 'm11_spire',
  },
  m11_spire: {
    id: 'm11_spire', main: true, act: 3, name: 'The Ninth Relay', giver: 'signal', zone: 'relay_spire',
    desc: 'The Spire has been calling the same four notes for four hundred years. The Warden of the Ninth Relay will not let anyone answer.',
    objectives: [
      { type: 'named', target: 'ninth_relay', count: 1, label: 'Defeat the Warden of the Ninth Relay' },
      { type: 'collect', target: 'alloy', count: 4, label: 'Salvage spire alloy' },
    ],
    rewards: { xp: 4600, marks: 520, items: [{ id: 'antenna_crown', qty: 1 }] },
    next: 'm12_haven',
  },
  m12_haven: {
    id: 'm12_haven', main: true, act: 4, name: 'Havenreach', giver: 'archivist', zone: 'havenreach',
    desc: 'Walls, lamps, a market that takes scrap, stories and spuds. The Archivist is waiting. So is the rest of the world.',
    objectives: [
      { type: 'talk', target: 'archivist', count: 1, label: 'Meet the Archivist' },
    ],
    rewards: { xp: 6000, marks: 800, items: [{ id: 'alloy', qty: 5 }, { id: 'salve', qty: 5 }], unlock: ['haven'] },
    next: null,
  },

  // ---------------- side quests ----------------
  s_crabcage: {
    id: 's_crabcage', side: true, name: 'Crab Cage', giver: 'marrow', zone: 'wrack_shore',
    desc: 'Marrow wants the big spud crabs off the rocks before they take a finger. Six should do.',
    objectives: [{ type: 'kill', target: 'rock_crab', count: 6, label: 'Kill Spud Crabs' }],
    rewards: { xp: 160, marks: 25, items: [{ id: 'bandage', qty: 4 }, { id: 'baked_potato', qty: 2 }] },
  },
  s_tidebounty: {
    id: 's_tidebounty', side: true, name: "Tide's Bounty", giver: 'tallyman', zone: 'tidal_flats',
    desc: 'The Tallyman does not eat fish. He counts them. Bring him three and he will count them into your favour.',
    objectives: [{ type: 'collect', target: 'raw_fish', count: 3, label: 'Catch Raw Fish' }],
    rewards: { xp: 240, marks: 40, items: [{ id: 'tonic', qty: 2 }] },
  },
  s_green: {
    id: 's_green', side: true, name: 'Green Thumb', giver: 'ivy', zone: 'sporewood',
    desc: 'Plant a potato. Wait for it. Eat it. Ivy says that is the whole trick of civilisation.',
    objectives: [
      { type: 'plant', target: 'any', count: 1, label: 'Plant a seed at a plot' },
      { type: 'harvest', target: 'any', count: 1, label: 'Harvest a crop' },
    ],
    rewards: { xp: 300, marks: 45, items: [{ id: 'seed_potato', qty: 6 }, { id: 'seed_grain', qty: 2 }] },
  },
  s_gooddog: {
    id: 's_gooddog', side: true, name: 'Good Animal', giver: 'ivy', zone: 'sporewood',
    desc: 'Two companions is a pack. A pack is a family. Ivy is sentimental about this.',
    objectives: [{ type: 'tame', target: 'any', count: 2, label: 'Tame wild creatures' }],
    rewards: { xp: 420, marks: 70, items: [{ id: 'hide', qty: 3 }] },
  },
  s_palefindings: {
    id: 's_palefindings', side: true, name: 'Pale Findings', giver: 'signal', zone: 'dead_grid',
    desc: 'The Archivist collects the old world the way other people collect shells. Bring her three caches of memory.',
    objectives: [{ type: 'cache', target: 'any', count: 3, label: 'Open lore caches' }],
    rewards: { xp: 800, marks: 120, items: [{ id: 'core_shard', qty: 2 }] },
  },
  s_oldmachine: {
    id: 's_oldmachine', side: true, name: 'The Old Machine', giver: 'copper', zone: 'rustfield',
    desc: 'Copper wants to see whether you can take a thing apart without breaking it. Ten scrap into one alloy, no waste.',
    objectives: [{ type: 'craft', target: 'alloy', count: 2, label: 'Refine Salvaged Alloy' }],
    rewards: { xp: 460, marks: 80, items: [{ id: 'alloy', qty: 2 }] },
  },
  s_market: {
    id: 's_market', side: true, name: 'Market Day', giver: 'vendor', zone: 'havenreach',
    desc: 'The market runs on barter. Alloy, spores, fish: whatever is not nailed down.',
    objectives: [
      { type: 'collect', target: 'alloy', count: 2, label: 'Alloy for the smiths' },
      { type: 'collect', target: 'spore', count: 2, label: 'Spores for the apothecary' },
      { type: 'collect', target: 'raw_fish', count: 2, label: 'Fish for the cook' },
    ],
    rewards: { xp: 900, marks: 200, items: [{ id: 'salve', qty: 3 }] },
  },
};
export const QUEST_LIST = Object.values(QUESTS);
// Story order: act first, then the numeric chapter (m1 … m12), never alphabetical.
const mainOrder = (q) => (q.act ?? 1) * 1000 + (parseInt(String(q.id).replace(/\D/g, ''), 10) || 0);
export const MAIN_QUESTS = QUEST_LIST.filter(q => q.main).sort((a, b) => mainOrder(a) - mainOrder(b));

export function questById(id) { return QUESTS[id] ?? null; }

// Objective counters keyed "questId/objectiveIndex".
export function objectiveKey(questId, i) { return questId + '/' + i; }

export function objectiveLabel(obj, have = 0) {
  return `${obj.label} ${Math.min(have, obj.count)}/${obj.count}`;
}

// Bounty generator for the Havenreach board.
const BOUNTY_TARGETS = ['wreck_scavenger', 'rust_hound', 'spore_boar', 'cap_wolf', 'cinder_jackal', 'arc_mite', 'sentinel'];
export function makeBounty(rng, playerLevel) {
  const target = rng.pick(BOUNTY_TARGETS);
  const count = rng.int(6, 12);
  const lvl = Math.max(3, playerLevel + rng.int(-1, 2));
  return {
    id: 'bounty_' + Math.floor(rng.next() * 1e9).toString(36), side: true, bounty: true, name: 'Bounty: ' + target.replace(/_/g, ' '), zone: 'havenreach',
    desc: 'The board wants a road cleared. It does not ask why.',
    objectives: [{ type: 'kill', target, count, label: 'Kill ' + count + ' ' + target.replace(/_/g, ' ') }],
    rewards: { xp: 180 + lvl * 40, marks: 40 + lvl * 12, items: [] },
  };
}
