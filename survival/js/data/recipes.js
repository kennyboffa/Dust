// recipes.js — Crafting recipes and shelter room definitions
'use strict';

// ── Room Definitions ─────────────────────────────────────────────────────────
const ROOM_DEFS = {
  main:      { id:'main',      name:'Main Room',    col:0, row:0,
    desc:'Your living quarters. Rest and eat here.',
    buildCost: null, buildNoise: 0, buildTime: 0 },

  bedroom:   { id:'bedroom',   name:'Bedroom',      col:1, row:0,
    desc:'Proper beds. Sleep restores tiredness faster.',
    buildCost: { wood:8, cloth:5 }, needsTools:true, buildNoise:14, buildTime:8,
    storageBonus: 0, effect:'betterSleep' },

  storage:   { id:'storage',   name:'Storage Room', col:2, row:0,
    desc:'Adds 40 kg of storage capacity.',
    buildCost: { wood:10, metal:5 }, needsTools:true, buildNoise:14, buildTime:10,
    storageBonus: 40, effect:'moreStorage' },

  workshop:  { id:'workshop',  name:'Workshop',     col:0, row:1,
    desc:'Allows advanced crafting of items and upgrades.',
    buildCost: { wood:6, metal:10 }, needsTools:true, buildNoise:20, buildTime:12,
    effect:'crafting' },

  infirmary: { id:'infirmary', name:'Infirmary',    col:1, row:1,
    desc:'Heals injuries faster. Reduces infection chance.',
    buildCost: { cloth:8, chemicals:4 }, needsTools:true, buildNoise:12, buildTime:8,
    effect:'healing' },

  security:  { id:'security',  name:'Security Room',col:2, row:1,
    desc:'Monitor AI activity. Reduces daily suspicion gain.',
    buildCost: { metal:8, electronics:6 }, needsTools:true, buildNoise:22, buildTime:16,
    effect:'lowSuspicion' },
};

// ── Upgrade Definitions (shelter upgrades beyond rooms) ───────────────────────
const UPGRADES_DB = {
  water_filter: {
    id:'water_filter', name:'Water Filter',
    desc:'Purify dirty water. Essential for clean supply.',
    buildCost: { metal:4, cloth:2, chemicals:3 }, needsTools:true, buildNoise:6,
    buildTime:6, requiresRoom:'workshop', key:'hasWaterFilter',
  },
  campfire: {
    id:'campfire', name:'Campfire / Stove',
    desc:'Cook food and boil water. Reduces depression.',
    buildCost: { metal:3, wood:4 }, needsTools:false, buildNoise:5,
    buildTime:4, requiresRoom:null, key:'campfire',
  },
  generator: {
    id:'generator', name:'Generator',
    desc:'Power and warmth. Increases suspicion slightly each day.',
    buildCost: { metal:8, electronics:5, fuel:4 }, needsTools:true, buildNoise:20,
    buildTime:14, requiresRoom:'workshop', key:'hasGenerator',
  },
  radio_dampener: {
    id:'radio_dampener', name:'Radio Dampener',
    desc:'Suppresses electronic signatures. Reduces daily suspicion.',
    buildCost: { metal:6, electronics:8 }, needsTools:true, buildNoise:8,
    buildTime:10, requiresRoom:'security', key:'hasRadioDampener',
  },
  defense_barrier: {
    id:'defense_barrier', name:'Defense Barrier',
    desc:'Reinforced entrance. Raises shelter defense level.',
    buildCost: { metal:12, wood:6 }, needsTools:true, buildNoise:18,
    buildTime:12, requiresRoom:null, key:null, effect:'defense',
  },
};

// ── Item Crafting Recipes ─────────────────────────────────────────────────────
const RECIPES_DB = [
  // Basic (no workshop needed)
  { id:'r_bandage',   name:'Bandage',        output:'bandage',      qty:2,
    cost:{ cloth:2 },         needsWorkshop:false, desc:'Tear cloth into bandages.' },
  { id:'r_torch',     name:'Torch',          output:'matches',      qty:3,
    cost:{ wood:1, cloth:1 }, needsWorkshop:false, desc:'Improvised torch / matches.' },

  // Workshop recipes
  { id:'r_sbackpack', name:'Small Backpack', output:'small_backpack', qty:1,
    cost:{ cloth:6, rope:2 }, needsWorkshop:true, desc:'Sew a small carrying pack.' },
  { id:'r_backpack',  name:'Backpack',       output:'backpack',     qty:1,
    cost:{ cloth:10, rope:4, metal:2 }, needsWorkshop:true, desc:'Standard backpack.' },
  { id:'r_pipe_wpn',  name:'Metal Pipe',     output:'pipe',         qty:1,
    cost:{ metal:3 }, needsWorkshop:true, desc:'Shape scrap into a pipe weapon.' },
  { id:'r_crowbar',   name:'Crowbar',        output:'crowbar',      qty:1,
    cost:{ metal:5 }, needsWorkshop:true, needsTools:true, desc:'Forge a crowbar.' },
  { id:'r_purify',    name:'Purify Water',   output:'purified_water', qty:2,
    cost:{ dirty_water:2, chemicals:1 }, needsWorkshop:false, requiresUpgrade:'water_filter',
    desc:'Filter dirty water. Requires water filter.' },
  { id:'r_medkit',    name:'First Aid Kit',  output:'medkit',       qty:1,
    cost:{ bandage:4, chemicals:2, cloth:2 }, needsWorkshop:true, desc:'Assemble a medkit.' },
];
