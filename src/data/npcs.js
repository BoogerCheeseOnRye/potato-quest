// People. Dialogue is state-aware: the quest system passes what it knows.
export const NPCS = {
  marrow: {
    id: 'marrow', name: 'Marrow', title: 'the last one standing', zone: 'wrack_shore', sprite: 'npc_marrow',
    greeting: 'You are the first thing the sea has given back in a year. Sit. Do not touch the leg. Have a spud.',
    idle: 'The wreck is picked clean. Everything else out here is still hungry, and the spuds are the only thing that is not.',
    quests: ['m1_washup', 'm2_salvage', 's_crabcage'],
    shop: [{ id: 'bandage', price: 8 }, { id: 'scrap', price: 5 }, { id: 'seed_potato', price: 9 }, { id: 'baked_potato', price: 6 }],
    train: null,
  },
  tallyman: {
    id: 'tallyman', name: 'The Tallyman', title: 'counts things', zone: 'tidal_flats', sprite: 'npc_tally',
    greeting: 'Debits. Credits. You are a debit so far. Convince me otherwise. I take payment in spuds.',
    idle: 'The tide comes in, the tide goes out. The potatoes come up either way. The numbers do not change.',
    quests: ['m3_flats', 'm4_toll', 's_tidebounty'],
    shop: [{ id: 'raw_fish', price: 6 }, { id: 'fiber', price: 4 }, { id: 'salve', price: 22 }, { id: 'seed_potato', price: 8 }],
    train: 'fishing',
  },
  copper: {
    id: 'copper', name: 'Copper', title: 'smith of the dead line', zone: 'rustfield', sprite: 'npc_copper',
    greeting: 'Mind the floor. It is mostly hot. You want something sharp or something that keeps you sharp? There is stew in the pot.',
    idle: 'All this metal and not one working lathe. Give me a week, a reason, and a potato.',
    quests: ['m5_iron', 'm6_foreman', 's_oldmachine'],
    shop: [{ id: 'scrap', price: 5 }, { id: 'alloy', price: 26 }, { id: 'salve', price: 20 }, { id: 'baked_potato', price: 7 }, { id: 'patchwork_mail', price: 90 }],
    train: 'smithing',
  },
  ivy: {
    id: 'ivy', name: 'Ivy', title: 'grower of stubborn things', zone: 'sporewood', sprite: 'npc_ivy',
    greeting: 'Do not stand in the bed. Yes, that one. Everything here is a bed, and half of it is potatoes.',
    idle: 'The wood gives and gives. Mostly it gives teeth, but it gives spuds too.',
    quests: ['m7_roots', 'm8_harvest', 's_green', 's_gooddog'],
    shop: [{ id: 'seed_potato', price: 7 }, { id: 'seed_grain', price: 10 }, { id: 'seed_berry', price: 16 }, { id: 'herb', price: 6 }, { id: 'spore_tea', price: 34 }],
    train: 'farming',
  },
  archivist: {
    id: 'archivist', name: 'The Archivist', title: 'Havenreach', zone: 'havenreach', sprite: 'npc_archivist',
    greeting: 'You walked here. Through all of it. Sit down before you fall down — then tell me what the grid said. There is potato soup.',
    idle: 'Havenreach is forty thousand people and one working generator. We are careful with both, and we plant potatoes between the walls.',
    quests: ['m10_grid', 'm11_spire', 'm12_haven', 's_palefindings'],
    shop: [{ id: 'tonic', price: 24 }, { id: 'signal_ring', price: 160 }, { id: 'core_shard', price: 80 }, { id: 'seed_potato', price: 6 }],
    train: 'lore',
  },
  vendor: {
    id: 'vendor', name: 'Ossuary', title: 'market', zone: 'havenreach', sprite: 'npc_vendor',
    greeting: 'Scrap, spores, stories, spuds. I take all four. The stories at a discount.',
    idle: 'The market is open until the lamps go out. Or until something comes over the wall. Either way, buy a potato.',
    quests: ['s_market'],
    shop: [
      { id: 'bandage', price: 6 }, { id: 'salve', price: 18 }, { id: 'tonic', price: 22 },
      { id: 'seed_potato', price: 5 }, { id: 'seed_grain', price: 8 }, { id: 'seed_root', price: 9 }, { id: 'seed_berry', price: 14 },
      { id: 'baked_potato', price: 5 }, { id: 'shore_stew', price: 14 },
      { id: 'scrap', price: 4 }, { id: 'alloy', price: 22 }, { id: 'hide', price: 8 },
      { id: 'worn_boots', price: 30 }, { id: 'grip_gauntlets', price: 45 }, { id: 'wreck_hood', price: 55 },
      { id: 'tide_striders', price: 120 }, { id: 'scrap_shield', price: 140 },
    ],
    train: null,
  },
  trainer: {
    id: 'trainer', name: 'Sergeant Vey', title: 'the Yard', zone: 'havenreach', sprite: 'npc_trainer',
    greeting: 'You fight like someone who learned on the way here. That is not a compliment. It is a start.',
    idle: 'Footwork. Breathing. Then, maybe, heroics.',
    quests: [],
    shop: [],
    train: 'combat',
    drills: [
      { id: 'drill_attack', name: 'Weapon drill', cost: 60, xp: 90, desc: 'Train your basic attack rank.' },
      { id: 'drill_body', name: 'Body work', cost: 80, xp: 120, desc: 'Train Athletics and Constitution.' },
      { id: 'drill_mind', name: 'Focus work', cost: 80, xp: 120, desc: 'Train Lore and energy.' },
    ],
  },
};
export const NPC_BY_ID = NPCS;

// Generic lines used when an NPC has nothing quest-shaped to say.
export const AMBIENT_LINES = {
  wrack_shore: ['The gulls have started watching you.', 'Something big moved under the wreck at low tide.'],
  tidal_flats: ['The glass under your boots is a road. It goes somewhere.', 'The tide is out. It will not stay out.'],
  rustfield: ['A machine whines somewhere under the rust.', 'The hounds are made of fence wire and bad temper.'],
  sporewood: ['The spores taste like copper. Do not breathe deep.', 'Something in the canopy is imitating birdsong badly.'],
  ashen_downs: ['No birds. No wind. Just the line humming.', 'The ash is warm. It should not be warm.'],
  dead_grid: ['A voice asks for a password. It has been asking a long time.', 'The cables are still warm.'],
  relay_spire: ['Four notes. Always the same four notes.', 'The Spire is taller than it looks.'],
  havenreach: ['A bell rings somewhere in the town.', 'Someone is selling something fried.'],
};
