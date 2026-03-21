// locations.js — Exploration locations
'use strict';

// Each location: rooms (zones), loot tables, enemies, atmosphere
const LOCATIONS_DB = [
  {
    id: 'supermarket',
    name: 'Abandoned Supermarket',
    desc: 'A gutted store. Most shelves are bare but hidden corners might hold something.',
    difficulty: 1,
    bgTheme: 'urban',
    zones: [
      { id: 'exterior', name: 'Parking Lot',   x: 0,    w: 500, bgColor: '#0d0d0a', lootTable: 'urban_light', enemyChance: 15 },
      { id: 'entrance', name: 'Store Entrance', x: 500,  w: 300, bgColor: '#111108', lootTable: 'food_light',  enemyChance: 10 },
      { id: 'interior', name: 'Store Interior', x: 800,  w: 600, bgColor: '#0e0e06', lootTable: 'food_heavy',  enemyChance: 20 },
      { id: 'storage',  name: 'Back Storage',   x: 1400, w: 400, bgColor: '#0a0a05', lootTable: 'food_rare',   enemyChance: 30 },
      { id: 'office',   name: 'Manager Office', x: 1800, w: 400, bgColor: '#0c0c08', lootTable: 'mixed_rare',  enemyChance: 25, requiresLockpick: true },
    ],
    ambientDesc: 'Broken glass crunches underfoot. The smell of rot and dust.',
  },
  {
    id: 'hospital',
    name: 'City Hospital',
    desc: 'High value medical supplies — and high danger. The AI uses hospitals as patrol hubs.',
    difficulty: 3,
    bgTheme: 'urban_dark',
    zones: [
      { id: 'lot',      name: 'Ambulance Bay',    x: 0,    w: 400, bgColor: '#0c0c0f', lootTable: 'medical_light', enemyChance: 20 },
      { id: 'lobby',    name: 'Main Lobby',        x: 400,  w: 400, bgColor: '#0d0d12', lootTable: 'mixed_light',    enemyChance: 25 },
      { id: 'wards',    name: 'Patient Wards',     x: 800,  w: 500, bgColor: '#0a0a0e', lootTable: 'medical_heavy',  enemyChance: 35 },
      { id: 'pharmacy', name: 'Pharmacy',          x: 1300, w: 400, bgColor: '#080810', lootTable: 'medicine_rare',  enemyChance: 40, requiresLockpick: true },
      { id: 'lab',      name: 'Research Lab',      x: 1700, w: 500, bgColor: '#06060e', lootTable: 'electronics',    enemyChance: 50 },
    ],
    ambientDesc: 'Flickering emergency lights. Distant mechanical sounds.',
  },
  {
    id: 'suburb',
    name: 'Suburban Ruins',
    desc: 'Rows of collapsed houses. Personal belongings scattered everywhere.',
    difficulty: 2,
    bgTheme: 'suburb',
    zones: [
      { id: 'street',  name: 'Main Street',   x: 0,    w: 500, bgColor: '#0d0d0a', lootTable: 'home_light',   enemyChance: 18 },
      { id: 'homes1',  name: 'Row Houses',    x: 500,  w: 600, bgColor: '#0c0c08', lootTable: 'home_medium',  enemyChance: 22 },
      { id: 'homes2',  name: 'Back Gardens',  x: 1100, w: 500, bgColor: '#0a0c06', lootTable: 'food_light',   enemyChance: 15 },
      { id: 'school',  name: 'Old School',    x: 1600, w: 600, bgColor: '#0c0c0a', lootTable: 'mixed_medium', enemyChance: 28, requiresLockpick: false },
    ],
    ambientDesc: 'Overgrown paths. Crumbling fences. A child\'s swing still moves in the wind.',
  },
  {
    id: 'factory',
    name: 'Industrial Complex',
    desc: 'Heavy materials. The AI patrols here regularly — it uses the plant for manufacturing.',
    difficulty: 4,
    bgTheme: 'industrial',
    zones: [
      { id: 'yard',     name: 'Yard',          x: 0,    w: 400, bgColor: '#0c0d0f', lootTable: 'materials',   enemyChance: 30 },
      { id: 'floor',    name: 'Factory Floor', x: 400,  w: 700, bgColor: '#0a0b0e', lootTable: 'heavy_mat',   enemyChance: 45 },
      { id: 'stores',   name: 'Store Rooms',   x: 1100, w: 500, bgColor: '#090a0d', lootTable: 'materials_r', enemyChance: 40 },
      { id: 'control',  name: 'Control Room',  x: 1600, w: 600, bgColor: '#07080c', lootTable: 'electronics', enemyChance: 55, requiresLockpick: true },
    ],
    ambientDesc: 'The hiss of automated systems. Metal on metal. The AI is active here.',
  },
  {
    id: 'forest',
    name: 'Outer Forest',
    desc: 'Trees, silence, and game. The AI rarely patrols here — but feral predators do.',
    difficulty: 2,
    bgTheme: 'forest',
    canHunt: true,
    zones: [
      { id: 'edge',     name: 'Forest Edge',   x: 0,    w: 500, bgColor: '#090e07', lootTable: 'nature_light', enemyChance: 12, huntChance: 20 },
      { id: 'deep',     name: 'Deep Forest',   x: 500,  w: 700, bgColor: '#060c04', lootTable: 'nature_heavy', enemyChance: 8,  huntChance: 35 },
      { id: 'clearing', name: 'Clearing',      x: 1200, w: 500, bgColor: '#080e06', lootTable: 'nature_rare',  enemyChance: 15, huntChance: 40 },
      { id: 'stream',   name: 'Stream',        x: 1700, w: 500, bgColor: '#060c08', lootTable: 'water_heavy',  enemyChance: 10, huntChance: 15 },
    ],
    ambientDesc: 'Birdsong. The smell of damp earth. Almost peaceful.',
  },
];

// ── Loot Tables ──────────────────────────────────────────────────────────────
const LOOT_TABLES = {
  urban_light:     [['wood',1,3],['metal',1,2],['cloth',1,2],['rope',1,1]],
  food_light:      [['canned_beans',1,2],['canned_soup',1,2],['energy_bar',1,1]],
  food_heavy:      [['canned_beans',1,4],['canned_soup',1,3],['canned_meat',1,3],['canned_fruit',1,2]],
  food_rare:       [['canned_meat',2,4],['energy_bar',2,3],['canned_fruit',1,3]],
  mixed_rare:      [['electronics',1,2],['chemicals',1,2],['bandage',1,3],['pistol_ammo',4,10]],
  medical_light:   [['bandage',1,3],['painkiller',1,2]],
  medical_heavy:   [['bandage',2,4],['medkit',1,1],['painkiller',1,3],['antibiotics',0,1]],
  medicine_rare:   [['medkit',1,2],['antibiotics',1,2],['chemicals',2,4]],
  mixed_light:     [['cloth',1,3],['rope',1,2],['batteries',1,2],['matches',1,3]],
  mixed_medium:    [['electronics',1,2],['batteries',1,3],['tools',0,1],['rope',1,3]],
  home_light:      [['cloth',1,4],['book',1,2],['matches',1,2],['toy',0,1],['canned_beans',1,2]],
  home_medium:     [['cloth',2,5],['wood',1,3],['book',1,2],['toy',0,1],['bandage',1,2]],
  materials:       [['metal',2,5],['wood',1,4],['rope',1,3],['tools',0,1]],
  heavy_mat:       [['metal',3,8],['tools',0,1],['electronics',1,3],['fuel',1,3]],
  materials_r:     [['metal',4,8],['electronics',2,4],['chemicals',1,3],['tools',1,1]],
  electronics:     [['electronics',2,5],['batteries',2,4],['chemicals',1,2]],
  nature_light:    [['wood',1,4],['rope',1,2]],
  nature_heavy:    [['wood',2,5],['raw_meat',1,2]],
  nature_rare:     [['raw_meat',1,3],['rope',2,3],['chemicals',1,1]],
  water_heavy:     [['dirty_water',2,4],['raw_meat',0,2]],
};

// ── Enemy Templates ───────────────────────────────────────────────────────────
const ENEMY_TEMPLATES = {
  scout_drone: {
    id:'scout_drone', name:'Scout Drone', type:'machine',
    hp:35, maxHp:35, armor:5, accuracy:60,
    damage:[8,16], apCost:2, reward:{ suspicion:-3 },
    desc:'A small flying surveillance drone. Fast, weak, dangerous in groups.',
    sprite:'drone', drops:[['electronics',1,2],['batteries',1,2]],
  },
  patrol_robot: {
    id:'patrol_robot', name:'Patrol Robot', type:'machine',
    hp:80, maxHp:80, armor:15, accuracy:68,
    damage:[14,26], apCost:3, reward:{ suspicion:-5 },
    desc:'Bipedal security robot. Slow but tough.',
    sprite:'robot', drops:[['metal',2,4],['electronics',1,2]],
  },
  hunter_drone: {
    id:'hunter_drone', name:'Hunter Drone', type:'machine',
    hp:55, maxHp:55, armor:8, accuracy:72,
    damage:[18,30], apCost:2, reward:{ suspicion:-8 },
    desc:'Combat model. Targets biological life.',
    sprite:'drone_heavy', drops:[['electronics',2,3],['pistol_ammo',4,8]],
  },
  raider: {
    id:'raider', name:'Raider', type:'human',
    hp:60, maxHp:60, armor:5, accuracy:65,
    damage:[12,22], apCost:2, reward:{},
    desc:'Desperate and dangerous. Attacks on sight.',
    sprite:'human_hostile', drops:[['canned_beans',0,2],['cloth',1,3],['knife',0,1]],
  },
  raider_armed: {
    id:'raider_armed', name:'Armed Raider', type:'human',
    hp:70, maxHp:70, armor:8, accuracy:70,
    damage:[16,28], isRanged:true, apCost:2, reward:{},
    desc:'Has a firearm. Take cover.',
    sprite:'human_hostile', drops:[['pistol_ammo',4,10],['pistol',0,1],['canned_meat',0,2]],
  },
  wolf: {
    id:'wolf', name:'Feral Wolf', type:'animal',
    hp:45, maxHp:45, armor:0, accuracy:75,
    damage:[14,22], apCost:2, reward:{},
    desc:'Starving and aggressive.',
    sprite:'wolf', drops:[['raw_meat',2,4]],
  },
};

// Enemy groups per difficulty
const ENCOUNTER_GROUPS = {
  1: [['scout_drone',1,1]],
  2: [['scout_drone',1,2],['raider',1,1]],
  3: [['patrol_robot',1,1],['scout_drone',1,1],['raider_armed',1,1]],
  4: [['hunter_drone',1,2],['patrol_robot',1,1],['raider_armed',1,2]],
  forest: [['wolf',1,2],['scout_drone',0,1]],
};

function rollLoot(tableId) {
  const table = LOOT_TABLES[tableId];
  if (!table) return [];
  const result = [];
  for (const [id, min, max] of table) {
    const qty = randInt(min, max);
    if (qty > 0) result.push({ id, qty });
  }
  return result;
}

function buildEncounter(locationDifficulty, zone) {
  const key = zone.canHunt ? 'forest' : Math.min(4, locationDifficulty);
  const group = ENCOUNTER_GROUPS[key];
  const enemies = [];
  for (const [templateId, min, max] of group) {
    const count = randInt(min, max);
    for (let i = 0; i < count; i++) {
      const t = ENEMY_TEMPLATES[templateId];
      if (t) enemies.push(deepClone(t));
    }
  }
  return enemies;
}
