// combat.js — Turn-based combat system
'use strict';

// Build combat state from exploration encounter
function startCombat(gs, enemies) {
  // Build player combatant
  const p = gs.parent;
  const playerCombatant = {
    isPlayer: true,
    name: p.name,
    hp: p.health, maxHp: p.maxHealth,
    armor: 0,
    accuracy: CFG.BASE_HIT_CHANCE + p.skills.melee * 2,
    ap: 4, maxAp: 4,
    weapon: p.equipped.weapon,
    dead: false,
    // Reload state
    magazine: 0, magazineSize: 0, ammoType: null,
  };

  // Equip weapon stats
  if (p.equipped.weapon) {
    const wd = getItemDef(p.equipped.weapon);
    if (wd) {
      if (wd.weaponType === 'firearm') {
        playerCombatant.magazine     = p.loaded[wd.ammoType] || 0;
        playerCombatant.magazineSize = wd.magazineSize || 8;
        playerCombatant.ammoType     = wd.ammoType;
        playerCombatant.accuracy     = CFG.BASE_HIT_CHANCE + p.skills.firearms * 3;
      } else {
        playerCombatant.accuracy = CFG.BASE_HIT_CHANCE + p.skills.melee * 3;
      }
    }
  }

  // Build enemy combatants
  const enemyCombatants = enemies.map((e, i) => ({
    ...e,
    isPlayer: false,
    index: i,
    dead: false,
    // AI: picks target (player)
    aiTimer: randInt(0, 2),
  }));

  gs.combat = {
    player: playerCombatant,
    enemies: enemyCombatants,
    turn: 'player',   // 'player' | 'enemy'
    log: [],
    phase: 'action',  // 'action' | 'result' | 'flee' | 'victory' | 'defeat'
    selectedAction: null,  // 'attack' | 'item' | 'flee' | 'reload'
    targetIdx: 0,
    resultText: '',
    resultTimer: 0,
    fleeAttempted: false,
    victoryLoot: [],
  };

  combatLog(gs, 'Combat started!', 'warn');
}

function combatLog(gs, text, type) {
  if (!gs.combat) return;
  gs.combat.log.unshift({ text, type: type || 'normal' });
  if (gs.combat.log.length > 8) gs.combat.log.pop();
}

// ── Player actions ────────────────────────────────────────────────────────────

function playerAttack(gs, targetIdx) {
  const c  = gs.combat;
  const p  = gs.parent;
  const target = c.enemies[targetIdx];
  if (!target || target.dead) return;

  const weapDef = p.equipped.weapon ? getItemDef(p.equipped.weapon) : null;
  let dmgMin = 4, dmgMax = 9, hit = c.player.accuracy;

  if (weapDef) {
    dmgMin = weapDef.damage[0];
    dmgMax = weapDef.damage[1];
    hit    = weapDef.accuracy + (weapDef.weaponType === 'firearm'
               ? p.skills.firearms * 3 : p.skills.melee * 3);

    // Firearm: check ammo
    if (weapDef.weaponType === 'firearm') {
      if (c.player.magazine <= 0) {
        combatLog(gs, 'Need to reload!', 'warn');
        return;
      }
      c.player.magazine--;
      p.loaded[weapDef.ammoType] = c.player.magazine;
    }
  } else {
    // Unarmed — base on strength + melee skill
    dmgMin = 2 + Math.floor(p.strength / 2);
    dmgMax = 6 + p.strength;
    hit    = CFG.BASE_HIT_CHANCE + p.skills.melee * 4;
  }

  // Agility bonus to hit
  hit += p.agility * 1.5;
  hit = clamp(hit, 10, 96);

  if (chance(hit)) {
    const raw    = randInt(dmgMin, dmgMax);
    const damage = Math.max(1, raw - (target.armor || 0));
    target.hp   -= damage;
    combatLog(gs, `${p.name} hits ${target.name} for ${damage} dmg.`, 'good');
    if (target.hp <= 0) {
      target.dead = true;
      combatLog(gs, `${target.name} destroyed.`, 'good');
      collectLoot(gs, target);
    }
  } else {
    combatLog(gs, `${p.name} misses ${target.name}.`, 'normal');
  }

  // Check win
  if (checkCombatVictory(gs)) return;

  // End player turn
  c.turn = 'enemy';
  setTimeout(() => enemyTurn(gs), 700);
}

function playerReload(gs) {
  const c = gs.combat;
  const p = gs.parent;
  const wd = p.equipped.weapon ? getItemDef(p.equipped.weapon) : null;
  if (!wd || wd.weaponType !== 'firearm') {
    combatLog(gs, 'Nothing to reload.', 'warn');
    return;
  }
  const spares = p.ammo[wd.ammoType] || 0;
  if (spares <= 0) {
    combatLog(gs, 'No spare ammo!', 'danger');
    c.turn = 'enemy';
    setTimeout(() => enemyTurn(gs), 700);
    return;
  }
  const needed = c.player.magazineSize - c.player.magazine;
  const loaded = Math.min(needed, spares);
  c.player.magazine    += loaded;
  p.loaded[wd.ammoType] = c.player.magazine;
  p.ammo[wd.ammoType]  -= loaded;
  combatLog(gs, `Reloaded (${c.player.magazine}/${c.player.magazineSize}).`, 'good');

  c.turn = 'enemy';
  setTimeout(() => enemyTurn(gs), 700);
}

function playerUseItem(gs, itemId) {
  const c = gs.combat;
  const p = gs.parent;
  const inv = p.inventory;
  if (countInInventory(inv, itemId) < 1) {
    combatLog(gs, 'Item not found.', 'warn');
    return;
  }
  const def = getItemDef(itemId);
  useItem(p, inv, itemId, gs);
  combatLog(gs, `Used ${def.name}.`, 'good');
  // Sync HP
  c.player.hp = clamp(p.health, 0, p.maxHealth);

  c.turn = 'enemy';
  setTimeout(() => enemyTurn(gs), 700);
}

function playerFlee(gs) {
  const c = gs.combat;
  const p = gs.parent;
  const fleeChance = 30 + p.agility * 6 + p.skills.stealth * 4;
  if (chance(fleeChance)) {
    combatLog(gs, 'Escaped!', 'good');
    c.phase = 'fled';
    setTimeout(() => endCombat(gs, 'fled'), 1200);
  } else {
    combatLog(gs, 'Couldn\'t escape!', 'danger');
    c.turn = 'enemy';
    setTimeout(() => enemyTurn(gs), 700);
  }
}

// ── Enemy turn ────────────────────────────────────────────────────────────────

function enemyTurn(gs) {
  const c = gs.combat;
  if (c.phase !== 'action') return;

  for (const enemy of c.enemies) {
    if (enemy.dead) continue;
    const hit = clamp((enemy.accuracy || 60), 10, 90);
    if (chance(hit)) {
      const dmg  = randInt(enemy.damage[0], enemy.damage[1]);
      const dealt = Math.max(1, dmg - 0);   // player has no armor by default
      c.player.hp -= dealt;
      gs.parent.health = Math.max(0, gs.parent.health - dealt);
      combatLog(gs, `${enemy.name} hits ${gs.parent.name} for ${dealt} dmg.`, 'danger');
      if (c.player.hp <= 0) {
        c.phase = 'defeat';
        combatLog(gs, `${gs.parent.name} has fallen.`, 'danger');
        setTimeout(() => endCombat(gs, 'defeat'), 1500);
        return;
      }
    } else {
      combatLog(gs, `${enemy.name} misses.`, 'normal');
    }
  }

  c.turn = 'player';
}

// ── Loot & end ────────────────────────────────────────────────────────────────

function collectLoot(gs, enemy) {
  if (!enemy.drops) return;
  for (const [id, min, max] of enemy.drops) {
    const qty = randInt(min, max);
    if (qty > 0) {
      gs.combat.victoryLoot.push({ id, qty });
    }
  }
}

function checkCombatVictory(gs) {
  const c = gs.combat;
  if (c.enemies.every(e => e.dead)) {
    c.phase = 'victory';
    // Apply loot to parent inventory
    for (const item of c.victoryLoot) {
      addToInventory(gs.parent.inventory, item.id, item.qty);
      combatLog(gs, `Found: ${item.qty}x ${getItemDef(item.id)?.name || item.id}`, 'good');
    }
    // Suspicion: destroying AI units
    const aiKills = c.enemies.filter(e => e.type === 'machine' && e.dead);
    for (const e of aiKills) {
      if (e.reward && e.reward.suspicion) {
        gs.suspicion = clamp(gs.suspicion + e.reward.suspicion, 0, CFG.SUSPICION_MAX);
      }
    }
    combatLog(gs, 'Victory!', 'good');
    setTimeout(() => endCombat(gs, 'victory'), 1500);
    return true;
  }
  return false;
}

function endCombat(gs, result) {
  const c = gs.combat;
  // Sync parent HP
  gs.parent.health  = Math.max(0, c.player.hp);
  gs.parent.tiredness = clamp(gs.parent.tiredness + 15, 0, 100);

  if (result === 'defeat') {
    triggerGameOver(gs, `${gs.parent.name} was killed in combat.`);
    return;
  }
  gs.combat = null;
  gs.screen  = 'explore';
}
