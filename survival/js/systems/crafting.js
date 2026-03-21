// crafting.js — Crafting system
'use strict';

// Check if all ingredients exist in storage or parent inventory
function canAfford(costObj, gs, useParentInv) {
  const storageInv = gs.shelter.storage;
  const parentInv  = gs.parent.inventory;
  for (const [id, qty] of Object.entries(costObj)) {
    const have = countInInventory(storageInv, id)
               + (useParentInv ? countInInventory(parentInv, id) : 0);
    if (have < qty) return false;
  }
  return true;
}

// Deduct ingredients (from storage first, then parent)
function deductCost(costObj, gs, useParentInv) {
  for (const [id, qty] of Object.entries(costObj)) {
    let remaining = qty;
    // Take from storage first
    const fromStorage = Math.min(remaining, countInInventory(gs.shelter.storage, id));
    if (fromStorage > 0) { removeFromInventory(gs.shelter.storage, id, fromStorage); remaining -= fromStorage; }
    // Then parent inventory
    if (remaining > 0 && useParentInv) {
      removeFromInventory(gs.parent.inventory, id, remaining);
    }
  }
}

// Build a shelter room
function buildRoom(gs, roomId) {
  const room = getRoom(roomId);
  if (!room || room.unlocked) return { ok: false, msg: 'Already built.' };

  const def = ROOM_DEFS[roomId];
  if (!def || !def.buildCost) return { ok: false, msg: 'No build data.' };
  if (def.needsTools && countInInventory(gs.shelter.storage,'tools') < 1
                      && countInInventory(gs.parent.inventory,'tools') < 1) {
    return { ok: false, msg: 'Requires Tools.' };
  }
  if (!canAfford(def.buildCost, gs, true)) {
    return { ok: false, msg: 'Not enough materials.' };
  }

  deductCost(def.buildCost, gs, true);
  if (def.needsTools) useToolCharge(gs);

  room.building = true;
  room.buildProgress = 0;
  const p = gs.parent;
  p.task = { type:'build', roomId };
  p.taskDuration = def.buildTime || 8;
  p.taskProgress = 0;
  p.isWorking    = true;

  // Noise → suspicion
  const noiseAdd = def.buildNoise || 10;
  gs.shelter.noiseToday = clamp(gs.shelter.noiseToday + noiseAdd, 0, 999);
  gs.suspicion = clamp(gs.suspicion + noiseAdd * 0.4, 0, CFG.SUSPICION_MAX);

  addLog(`Building ${def.name}. Noise generated.`, 'warn');
  return { ok: true, msg: `Building ${def.name}...` };
}

// Build a shelter upgrade
function buildUpgrade(gs, upgradeId) {
  const upg = UPGRADES_DB[upgradeId];
  if (!upg) return { ok: false, msg: 'Unknown upgrade.' };
  if (upg.key && gs.shelter[upg.key]) return { ok: false, msg: 'Already built.' };
  if (upg.requiresRoom && !getRoomUnlocked(upg.requiresRoom)) {
    return { ok: false, msg: `Requires ${ROOM_DEFS[upg.requiresRoom]?.name || upg.requiresRoom}.` };
  }
  if (upg.needsTools && countInInventory(gs.shelter.storage,'tools') < 1
                      && countInInventory(gs.parent.inventory,'tools') < 1) {
    return { ok: false, msg: 'Requires Tools.' };
  }
  if (!canAfford(upg.buildCost, gs, true)) {
    return { ok: false, msg: 'Not enough materials.' };
  }

  deductCost(upg.buildCost, gs, true);
  if (upg.needsTools) useToolCharge(gs);

  const p = gs.parent;
  p.task = { type:'build', upgradeId };
  p.taskDuration = upg.buildTime || 6;
  p.taskProgress = 0;
  p.isWorking    = true;

  gs.suspicion = clamp(gs.suspicion + (upg.buildNoise || 5) * 0.4, 0, CFG.SUSPICION_MAX);
  gs.shelter.noiseToday += upg.buildNoise || 5;

  addLog(`Building ${upg.name}...`, 'warn');
  return { ok: true, msg: `Building ${upg.name}...` };
}

// Craft an item from RECIPES_DB
function craftItem(gs, recipeId) {
  const recipe = RECIPES_DB.find(r => r.id === recipeId);
  if (!recipe) return { ok: false, msg: 'Unknown recipe.' };
  if (recipe.needsWorkshop && !getRoomUnlocked('workshop')) {
    return { ok: false, msg: 'Requires Workshop.' };
  }
  if (recipe.requiresUpgrade && !gs.shelter[UPGRADES_DB[recipe.requiresUpgrade]?.key]) {
    return { ok: false, msg: `Requires ${UPGRADES_DB[recipe.requiresUpgrade]?.name || recipe.requiresUpgrade}.` };
  }
  if (recipe.needsTools && countInInventory(gs.shelter.storage,'tools') < 1) {
    return { ok: false, msg: 'Requires Tools.' };
  }
  if (!canAfford(recipe.cost, gs, true)) {
    return { ok: false, msg: 'Not enough materials.' };
  }

  deductCost(recipe.cost, gs, true);
  if (recipe.needsTools) useToolCharge(gs);

  addToInventory(gs.shelter.storage, recipe.output, recipe.qty || 1);
  gs.parent.tiredness = clamp(gs.parent.tiredness + 6, 0, 100);
  addLog(`Crafted ${recipe.qty || 1}x ${getItemDef(recipe.output)?.name || recipe.output}.`, 'good');
  return { ok: true };
}

// Use one charge of tools
function useToolCharge(gs) {
  const findTools = (inv) => inv.find(s => s.id === 'tools');
  const t = findTools(gs.shelter.storage) || findTools(gs.parent.inventory);
  if (t) {
    t.usesLeft = (t.usesLeft || 5) - 1;
    if (t.usesLeft <= 0) {
      const inv = findTools(gs.shelter.storage) ? gs.shelter.storage : gs.parent.inventory;
      removeFromInventory(inv, 'tools', 1);
      notify('Tools worn out.', 'warn');
    }
  }
}

// Cook food on campfire (source → output mapping)
const COOK_MAP = {
  raw_meat: 'cooked_meat', canned_soup: 'heated_soup', canned_beans: 'heated_beans',
};
function cookFood(gs, srcId, qty) {
  if (!gs.shelter.campfire) return { ok: false, msg: 'No campfire or stove.' };
  if (countInInventory(gs.shelter.storage, srcId) < qty) return { ok: false, msg: 'Not enough in storage.' };
  const outId = COOK_MAP[srcId];
  if (!outId) return { ok: false, msg: 'Cannot cook that.' };

  const p = gs.parent;
  p.task = { type:'cook', inputId: srcId, outputId: outId, qty };
  p.taskDuration = 1.5; // 1.5 game hours
  p.taskProgress = 0;
  p.isWorking    = true;
  return { ok: true };
}

// Feed a person from shelter storage
function feedFromStorage(gs, who, itemId) {
  if (countInInventory(gs.shelter.storage, itemId) < 1) return false;
  removeFromInventory(gs.shelter.storage, itemId, 1);
  return useItem(who, gs.shelter.storage, itemId, gs) || (() => {
    // already removed, apply manually
    const def = getItemDef(itemId);
    if (def) {
      who.hunger     = clamp(who.hunger     + (def.hunger     || 0), 0, 100);
      who.thirst     = clamp(who.thirst     + (def.thirst     || 0), 0, 100);
      who.depression = clamp(who.depression + (def.depression  || 0), 0, 100);
      who.health     = clamp(who.health     + (def.health      || 0), 0, who.maxHealth);
    }
    return true;
  })();
}

// Transfer item from parent inventory to storage
function storeItem(gs, itemId, qty) {
  const avail = countInInventory(gs.parent.inventory, itemId);
  if (avail < qty) return false;
  const def = getItemDef(itemId);
  const weightAdd = def ? def.weight * qty : 0;
  if (shelterStorageWeight() + weightAdd > gs.shelter.storageMax) {
    notify('Storage is full.', 'warn');
    return false;
  }
  removeFromInventory(gs.parent.inventory, itemId, qty);
  addToInventory(gs.shelter.storage, itemId, qty);
  return true;
}
