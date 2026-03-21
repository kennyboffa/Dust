// items.js — Item definitions
'use strict';

const ITEMS_DB = {

  // ── FOOD ──────────────────────────────────────────────────────────────────
  canned_beans:  { id:'canned_beans',  name:'Canned Beans',   type:'food', weight:0.5, value:12,
    hunger:-22, thirst:4,  depression:2, desc:'Cold beans. Not great.',  stackable:true },
  canned_soup:   { id:'canned_soup',   name:'Canned Soup',    type:'food', weight:0.4, value:10,
    hunger:-18, thirst:-4, depression:2, desc:'Vegetable soup in a can.',stackable:true },
  canned_meat:   { id:'canned_meat',   name:'Canned Meat',    type:'food', weight:0.4, value:16,
    hunger:-28, thirst:3,  depression:2, desc:'Mystery meat in a tin.',  stackable:true },
  canned_fruit:  { id:'canned_fruit',  name:'Canned Fruit',   type:'food', weight:0.4, value:18,
    hunger:-15, thirst:-8, depression:-5, desc:'Sweet relief.',          stackable:true },
  energy_bar:    { id:'energy_bar',    name:'Energy Bar',     type:'food', weight:0.1, value:20,
    hunger:-20, thirst:2, desc:'Pre-collapse protein bar.', stackable:true },
  raw_meat:      { id:'raw_meat',      name:'Raw Meat',       type:'food', weight:0.6, value:4,
    hunger:-18, thirst:0, depression:4, health:-8, needsCooking:true,
    desc:'Must be cooked first. Dangerous raw.', stackable:true },
  cooked_meat:   { id:'cooked_meat',   name:'Cooked Meat',    type:'food', weight:0.5, value:8,
    hunger:-32, thirst:4, depression:-6, desc:'Hot meat. A real meal.',  stackable:true },
  cooked_soup:   { id:'cooked_soup',   name:'Hot Soup',       type:'food', weight:0.4, value:12,
    hunger:-22, thirst:-14, depression:-9, desc:'Warm soup. Simple joy.',stackable:true },
  heated_beans:  { id:'heated_beans',  name:'Hot Beans',      type:'food', weight:0.5, value:14,
    hunger:-24, thirst:2,  depression:-4, desc:'Heated canned beans.',   stackable:true },
  heated_soup:   { id:'heated_soup',   name:'Heated Soup',    type:'food', weight:0.4, value:12,
    hunger:-20, thirst:-8, depression:-6, desc:'Hot soup from a can.',   stackable:true },

  // ── WATER ─────────────────────────────────────────────────────────────────
  water_bottle:  { id:'water_bottle',  name:'Water Bottle',   type:'water', weight:0.5, value:18,
    thirst:-28, desc:'Filtered water.', stackable:true },
  dirty_water:   { id:'dirty_water',   name:'Dirty Water',    type:'water', weight:0.5, value:4,
    thirst:-16, health:-6, desc:'Unsafe. Better than nothing.', stackable:true },
  purified_water:{ id:'purified_water',name:'Purified Water', type:'water', weight:0.5, value:28,
    thirst:-38, depression:-2, desc:'Clean filtered water.', stackable:true },

  // ── MEDICINE ──────────────────────────────────────────────────────────────
  bandage:       { id:'bandage',       name:'Bandage',        type:'medicine', weight:0.1, value:14,
    health:18, desc:'Treats minor wounds.', stackable:true },
  medkit:        { id:'medkit',        name:'First Aid Kit',  type:'medicine', weight:0.8, value:55,
    health:45, desc:'Comprehensive wound care.', stackable:false },
  painkiller:    { id:'painkiller',    name:'Painkillers',    type:'medicine', weight:0.1, value:22,
    health:8, depression:-10, desc:'Dulls pain. Lifts mood slightly.', stackable:true },
  antibiotics:   { id:'antibiotics',  name:'Antibiotics',    type:'medicine', weight:0.1, value:80,
    health:25, clearsInfection:true, desc:'Rare. Treats infection.', stackable:true },

  // ── MELEE WEAPONS ─────────────────────────────────────────────────────────
  knife:         { id:'knife',         name:'Hunting Knife',  type:'weapon', weaponType:'melee',
    weight:0.3, value:25, damage:[5,12],  accuracy:90, apCost:2, desc:'Sharp survival knife.' },
  machete:       { id:'machete',       name:'Machete',        type:'weapon', weaponType:'melee',
    weight:0.6, value:38, damage:[8,18],  accuracy:80, apCost:3, desc:'Heavy blade, good reach.' },
  crowbar:       { id:'crowbar',       name:'Crowbar',        type:'weapon', weaponType:'melee',
    weight:1.0, value:18, damage:[10,20], accuracy:70, apCost:3, desc:'Useful for many things.' },
  pipe:          { id:'pipe',          name:'Metal Pipe',     type:'weapon', weaponType:'melee',
    weight:1.2, value:10, damage:[8,16],  accuracy:72, apCost:3, desc:'Heavy steel pipe.' },
  bat:           { id:'bat',           name:'Baseball Bat',   type:'weapon', weaponType:'melee',
    weight:0.9, value:28, damage:[12,22], accuracy:74, apCost:3, desc:'Classic. Hard swing.' },

  // ── FIREARMS ─────────────────────────────────────────────────────────────
  pistol:        { id:'pistol',        name:'Pistol',         type:'weapon', weaponType:'firearm',
    ammoType:'pistol', weight:0.8, value:95,  damage:[14,24], accuracy:74, magazineSize:8,  apCost:2, desc:'9mm handgun.' },
  rifle:         { id:'rifle',         name:'Bolt Rifle',     type:'weapon', weaponType:'firearm',
    ammoType:'rifle',  weight:3.0, value:190, damage:[26,46], accuracy:86, magazineSize:5,  apCost:3, desc:'Accurate at distance.' },
  shotgun:       { id:'shotgun',       name:'Shotgun',        type:'weapon', weaponType:'firearm',
    ammoType:'shotgun',weight:2.5, value:145, damage:[20,38], accuracy:64, magazineSize:2,  apCost:3, desc:'Devastating up close.' },

  // ── AMMO ──────────────────────────────────────────────────────────────────
  pistol_ammo:   { id:'pistol_ammo',   name:'9mm Ammo',       type:'ammo', ammoType:'pistol',
    weight:0.05, value:3, desc:'Handgun rounds.',  stackable:true },
  rifle_ammo:    { id:'rifle_ammo',    name:'.308 Rounds',    type:'ammo', ammoType:'rifle',
    weight:0.10, value:8, desc:'Rifle cartridges.',stackable:true },
  shotgun_ammo:  { id:'shotgun_ammo',  name:'12ga Shells',    type:'ammo', ammoType:'shotgun',
    weight:0.15, value:5, desc:'Shotgun shells.',  stackable:true },

  // ── MATERIALS ─────────────────────────────────────────────────────────────
  wood:          { id:'wood',          name:'Wood',           type:'material', weight:1.0, value:5,  desc:'Salvaged lumber.', stackable:true },
  metal:         { id:'metal',         name:'Scrap Metal',    type:'material', weight:1.5, value:8,  desc:'Twisted metal.', stackable:true },
  cloth:         { id:'cloth',         name:'Cloth',          type:'material', weight:0.3, value:4,  desc:'Rags and fabric.', stackable:true },
  electronics:   { id:'electronics',  name:'Electronics',    type:'material', weight:0.5, value:20, desc:'Circuit boards.', stackable:true },
  chemicals:     { id:'chemicals',     name:'Chemicals',      type:'material', weight:0.6, value:15, desc:'Various compounds.', stackable:true },
  tools:         { id:'tools',         name:'Tools',          type:'material', weight:2.0, value:40, desc:'Hammer, wrench, etc.', stackable:false, uses:5 },
  rope:          { id:'rope',          name:'Rope',           type:'material', weight:0.5, value:10, desc:'Nylon rope.', stackable:true },
  fuel:          { id:'fuel',          name:'Fuel',           type:'material', weight:1.0, value:12, desc:'Diesel or petrol.', stackable:true },

  // ── BACKPACKS ─────────────────────────────────────────────────────────────
  small_backpack:{ id:'small_backpack',name:'Small Pack',     type:'backpack', weight:0.5, value:28, carryBonus:5,  desc:'A worn daypack.' },
  backpack:      { id:'backpack',      name:'Backpack',       type:'backpack', weight:1.0, value:58, carryBonus:12, desc:'Standard hiking pack.' },
  mil_backpack:  { id:'mil_backpack',  name:'Military Pack',  type:'backpack', weight:1.5, value:110,carryBonus:20, desc:'Large military-grade pack.' },

  // ── MISC / MORALE ─────────────────────────────────────────────────────────
  book:          { id:'book',          name:'Old Book',       type:'misc', weight:0.4, value:8,
    depression:-6, desc:'Something to read.', stackable:true },
  toy:           { id:'toy',           name:"Child's Toy",    type:'misc', weight:0.2, value:5,
    childDeprBonus:-12, desc:'For Lily.', stackable:true },
  photograph:    { id:'photograph',    name:'Photograph',     type:'misc', weight:0.05, value:2,
    depression:-4, desc:'A memory.', stackable:true },
  matches:       { id:'matches',       name:'Matches',        type:'misc', weight:0.05, value:5,
    desc:'For fire.', stackable:true },
  batteries:     { id:'batteries',     name:'Batteries',      type:'misc', weight:0.1, value:10,
    desc:'AA batteries.', stackable:true },
  dog_food:      { id:'dog_food',      name:'Dog Food',       type:'misc', weight:0.8, value:5,
    desc:'For the dog.', stackable:true },
};

function getItemDef(id) { return ITEMS_DB[id] || null; }

// Create a new item stack instance
function makeItem(id, qty) {
  const def = ITEMS_DB[id];
  if (!def) { console.warn('makeItem: unknown id', id); return null; }
  const inst = { iid: uid(), id, qty: qty || 1 };
  if (def.uses  !== undefined)        inst.usesLeft = def.uses;
  if (def.magazineSize !== undefined) inst.loaded   = 0;
  return inst;
}

// Merge qty into existing stack or push new
function addToInventory(inv, id, qty) {
  const def = getItemDef(id);
  if (!def) return;
  if (def.stackable) {
    const existing = inv.find(s => s.id === id);
    if (existing) { existing.qty += qty; return; }
  }
  const inst = makeItem(id, qty);
  if (inst) inv.push(inst);
}

// Remove qty from inventory (stackable). Returns amount actually removed.
function removeFromInventory(inv, id, qty) {
  qty = qty || 1;
  let remaining = qty;
  for (let i = inv.length - 1; i >= 0 && remaining > 0; i--) {
    if (inv[i].id === id) {
      const take = Math.min(inv[i].qty, remaining);
      inv[i].qty -= take;
      remaining  -= take;
      if (inv[i].qty <= 0) inv.splice(i, 1);
    }
  }
  return qty - remaining;
}

// Count how many of an item are in inventory
function countInInventory(inv, id) {
  return inv.filter(s => s.id === id).reduce((n, s) => n + s.qty, 0);
}
