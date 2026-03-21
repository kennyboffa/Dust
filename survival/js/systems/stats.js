// stats.js — Stat decay, healing, and daily tick
'use strict';

// Called every game frame with deltaTime in real seconds
function tickStats(gs, dt) {
  if (gs.paused || gs.screen !== 'shelter' && gs.screen !== 'explore') return;

  const mins = dt * CFG.MINS_PER_REAL_SEC;
  const hrs  = mins / 60;

  // ── Advance time ────────────────────────────────────────────────────────────
  gs.time += mins;
  if (gs.time >= CFG.DAY_END) {
    startDayTransition(gs);
    return;
  }

  // ── Parent ──────────────────────────────────────────────────────────────────
  const p = gs.parent;
  if (!p.isSleeping) {
    p.hunger    = clamp(p.hunger    + CFG.HUNGER_PER_HOUR * hrs, 0, 100);
    p.thirst    = clamp(p.thirst    + CFG.THIRST_PER_HOUR * hrs, 0, 100);
    const tireRate = (p.isExploring || p.isWorking) ? CFG.TIRE_ACTIVE_PER_HOUR : CFG.TIRE_IDLE_PER_HOUR;
    p.tiredness = clamp(p.tiredness + tireRate * hrs, 0, 100);
  } else {
    p.hunger    = clamp(p.hunger    + CFG.HUNGER_PER_HOUR * 0.3 * hrs, 0, 100);
    p.thirst    = clamp(p.thirst    + CFG.THIRST_PER_HOUR * 0.3 * hrs, 0, 100);
    p.tiredness = clamp(p.tiredness + CFG.TIRE_SLEEP_PER_HOUR * hrs, 0, 100);
    if (p.tiredness <= 0) { p.isSleeping = false; p.tiredness = 0; }
  }

  // Depression (ambient rise + child-based effects handled below)
  p.depression = clamp(p.depression + CFG.DEPR_PARENT_IDLE_PER_HOUR * hrs, 0, 100);

  // HP damage from hunger/thirst
  if (p.hunger  >= CFG.HUNGER_DAMAGE)  p.health = Math.max(0, p.health - CFG.HEALTH_DRAIN_PER_HOUR * hrs);
  if (p.thirst  >= CFG.THIRST_DAMAGE)  p.health = Math.max(0, p.health - CFG.HEALTH_DRAIN_PER_HOUR * 1.5 * hrs);

  // Forced sleep if too tired
  if (p.tiredness >= CFG.TIRE_FORCED_SLEEP && !p.isSleeping) {
    p.isSleeping = true;
    notify('Too tired to continue — sleeping.', 'warn');
  }

  // ── Child ───────────────────────────────────────────────────────────────────
  const ch = gs.child;
  ch.hunger  = clamp(ch.hunger  + CFG.HUNGER_PER_HOUR * 0.8 * hrs, 0, 100);
  ch.thirst  = clamp(ch.thirst  + CFG.THIRST_PER_HOUR * 0.8 * hrs, 0, 100);
  ch.tiredness = clamp(ch.tiredness + CFG.TIRE_IDLE_PER_HOUR * 0.6 * hrs, 0, 100);

  if (ch.hunger  >= CFG.HUNGER_DAMAGE)  ch.health = Math.max(0, ch.health - CFG.HEALTH_DRAIN_PER_HOUR * hrs);
  if (ch.thirst  >= CFG.THIRST_DAMAGE)  ch.health = Math.max(0, ch.health - CFG.HEALTH_DRAIN_PER_HOUR * 1.5 * hrs);

  // Child depression: rises when alone, falls when with parent
  ch.isAlone = p.isExploring;
  const childDeprRate = ch.isAlone ? CFG.DEPR_CHILD_ALONE_PER_HOUR : CFG.DEPR_CHILD_PARENT_PER_HOUR;
  ch.depression = clamp(ch.depression + childDeprRate * hrs, 0, 100);

  // Dog bonus
  if (gs.dog && gs.dog.alive) {
    ch.depression = clamp(ch.depression - 1.5 * hrs, 0, 100);
    p.depression  = clamp(p.depression  - 0.6 * hrs, 0, 100);
    gs.dog.hunger = clamp(gs.dog.hunger + 4 * hrs, 0, 100);
    if (gs.dog.hunger >= 90) {
      gs.dog.health = Math.max(0, gs.dog.health - CFG.HEALTH_DRAIN_PER_HOUR * hrs);
      if (gs.dog.health <= 0) {
        gs.dog.alive = false;
        addLog('The dog has died from starvation.', 'danger');
        ch.depression = Math.min(100, ch.depression + 30);
        p.depression  = Math.min(100, p.depression  + 20);
      }
    }
  }

  // ── Survivors ──────────────────────────────────────────────────────────────
  for (const s of gs.survivors) {
    s.hunger    = clamp(s.hunger    + CFG.HUNGER_PER_HOUR * hrs, 0, 100);
    s.thirst    = clamp(s.thirst    + CFG.THIRST_PER_HOUR * hrs, 0, 100);
    s.tiredness = clamp(s.tiredness + (s.isExploring ? CFG.TIRE_ACTIVE_PER_HOUR : CFG.TIRE_IDLE_PER_HOUR) * hrs, 0, 100);
    s.depression = clamp(s.depression + 0.5 * hrs, 0, 100);
    if (s.hunger  >= CFG.HUNGER_DAMAGE) s.health = Math.max(0, s.health - CFG.HEALTH_DRAIN_PER_HOUR * hrs);
    if (s.thirst  >= CFG.THIRST_DAMAGE) s.health = Math.max(0, s.health - CFG.HEALTH_DRAIN_PER_HOUR * 1.5 * hrs);
  }

  // ── AI Suspicion passive tick ───────────────────────────────────────────────
  // Very slow daily drift upward
  const suspRise = 0.15 * hrs;
  const suspReduce = gs.shelter.hasRadioDampener ? 0.12 * hrs : 0;
  const roomBonus  = getRoomUnlocked('security') ? 0.08 * hrs : 0;
  gs.suspicion = clamp(gs.suspicion + suspRise - suspReduce - roomBonus, 0, CFG.SUSPICION_MAX);
  if (gs.shelter.hasGenerator) gs.suspicion = clamp(gs.suspicion + 0.2 * hrs, 0, CFG.SUSPICION_MAX);

  // ── Death check ────────────────────────────────────────────────────────────
  if (p.health  <= 0) triggerGameOver(gs, 'The parent died.');
  if (ch.health <= 0) triggerGameOver(gs, 'Lily did not survive.');
  if (gs.suspicion >= CFG.SUSPICION_MAX) triggerGameOver(gs, 'The AI found the shelter.');

  // ── Task progress ──────────────────────────────────────────────────────────
  tickTasks(gs, hrs);
}

function tickTasks(gs, hrs) {
  // Parent task
  const p = gs.parent;
  if (p.task) {
    p.taskProgress += hrs;
    if (p.taskProgress >= p.taskDuration) {
      finishTask(gs, p, p.task);
      p.task = null; p.taskProgress = 0; p.taskDuration = 0; p.isWorking = false;
    }
  }
  // Survivor tasks
  for (const s of gs.survivors) {
    if (s.task) {
      s.taskProgress += hrs;
      if (s.taskProgress >= s.taskDuration) {
        finishTask(gs, s, s.task);
        s.task = null; s.taskProgress = 0; s.taskDuration = 0;
      }
    }
  }
}

function finishTask(gs, who, task) {
  switch (task.type) {
    case 'sleep':
      who.isSleeping = false;
      notify(`${who.name} woke up.`, 'normal');
      break;
    case 'eat': {
      const def = getItemDef(task.itemId);
      if (!def) break;
      who.hunger    = clamp(who.hunger    + (def.hunger    || 0), 0, 100);
      who.thirst    = clamp(who.thirst    + (def.thirst    || 0), 0, 100);
      who.depression= clamp(who.depression+ (def.depression|| 0), 0, 100);
      who.health    = clamp(who.health    + (def.health    || 0), 0, who.maxHealth);
      if (def.clearsInfection) who.infected = false;
      notify(`${who.name} ate ${def.name}.`, 'good');
      break;
    }
    case 'drink': {
      const def = getItemDef(task.itemId);
      if (!def) break;
      who.thirst = clamp(who.thirst + (def.thirst || 0), 0, 100);
      who.health = clamp(who.health + (def.health || 0), 0, who.maxHealth);
      notify(`${who.name} drank ${def.name}.`, 'good');
      break;
    }
    case 'craft':
      notify('Crafting complete.', 'good');
      break;
    case 'build':
      completeBuildTask(gs, task);
      break;
    case 'play':
      gs.child.depression = clamp(gs.child.depression - 18, 0, 100);
      gs.parent.depression = clamp(gs.parent.depression - 10, 0, 100);
      notify('Lily\'s mood has improved.', 'good');
      break;
    case 'cook':
      finishCooking(gs, task);
      break;
    case 'hunt':
      finishHunt(gs, task);
      break;
  }
}

function completeBuildTask(gs, task) {
  if (task.roomId) {
    const room = getRoom(task.roomId);
    if (room) {
      room.unlocked = true; room.level = 1; room.building = false;
      const def = ROOM_DEFS[room.id];
      if (def && def.storageBonus) gs.shelter.storageMax += def.storageBonus;
      if (def && def.effect === 'moreStorage') notify('Storage room built. +40kg capacity.', 'good');
      else notify(`${def ? def.name : 'Room'} constructed.`, 'good');
      gs.suspicion = clamp(gs.suspicion + (def ? def.buildNoise * 0.3 : 5), 0, CFG.SUSPICION_MAX);
    }
  } else if (task.upgradeId) {
    const upg = UPGRADES_DB[task.upgradeId];
    if (upg && upg.key) gs.shelter[upg.key] = true;
    notify(`${upg ? upg.name : 'Upgrade'} complete.`, 'good');
    gs.suspicion = clamp(gs.suspicion + (upg ? upg.buildNoise * 0.3 : 3), 0, CFG.SUSPICION_MAX);
  }
}

function finishCooking(gs, task) {
  const src  = task.inputId;  // e.g. 'raw_meat' | 'canned_soup'
  const out  = task.outputId; // e.g. 'cooked_meat' | 'heated_soup'
  const qty  = task.qty || 1;
  const storage = gs.shelter.storage;
  if (countInInventory(storage, src) >= qty) {
    removeFromInventory(storage, src, qty);
    addToInventory(storage, out, qty);
    notify(`Cooked ${qty}x ${getItemDef(out).name}.`, 'good');
  }
}

function finishHunt(gs, task) {
  const yield_ = randInt(1, 3);
  addToInventory(gs.shelter.storage, 'raw_meat', yield_);
  addLog(`Hunt successful: found ${yield_} raw meat.`, 'good');
}

// ── Day transition ────────────────────────────────────────────────────────────
function startDayTransition(gs) {
  gs.dayFade.active = true;
  gs.dayFade.phase  = 'out';
  gs.dayFade.alpha  = 0;
  gs.dayFade.timer  = 0;
}

function advanceDay(gs) {
  gs.day++;
  gs.time = CFG.DAY_START;
  gs.parent.isSleeping = false;
  gs.parent.isWorking  = false;
  gs.parent.task       = null;
  gs.parent.taskProgress = 0;
  gs.shelter.noiseToday = 0;

  // Dog availability
  if (gs.day >= 10 && !gs.flags.dogEncountered) gs.flags.dogAvailable = true;

  // Survivor morale gentle recovery
  for (const s of gs.survivors) {
    s.depression = clamp(s.depression - 2, 0, 100);
  }

  notify(`Day ${gs.day}`, 'info');
}

// ── Game over ─────────────────────────────────────────────────────────────────
function triggerGameOver(gs, reason) {
  gs.gameOverReason = reason;
  gs.screen = 'gameOver';
}

// ── Consume item directly ─────────────────────────────────────────────────────
function useItem(who, inv, itemId, gs) {
  const def = getItemDef(itemId);
  if (!def) return false;
  if (countInInventory(inv, itemId) < 1) return false;
  removeFromInventory(inv, itemId, 1);
  who.hunger     = clamp(who.hunger     + (def.hunger     || 0), 0, 100);
  who.thirst     = clamp(who.thirst     + (def.thirst     || 0), 0, 100);
  who.depression = clamp(who.depression + (def.depression  || 0), 0, 100);
  who.health     = clamp(who.health     + (def.health      || 0), 0, who.maxHealth);
  if (def.clearsInfection && who) who.infected = false;
  if (def.childDeprBonus && gs) gs.child.depression = clamp(gs.child.depression + def.childDeprBonus, 0, 100);
  return true;
}
