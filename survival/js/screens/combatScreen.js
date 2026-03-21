// combatScreen.js — Turn-based combat rendering and input
'use strict';

const COMBAT_PLAYER_X  = 110;
const COMBAT_ENEMY_X   = 460;
const COMBAT_GROUND_Y  = 230;
const COMBAT_LOG_X     = 10;
const COMBAT_LOG_Y     = 270;
const COMBAT_LOG_W     = CFG.W - CFG.PANEL_W - 20;
const COMBAT_LOG_H     = 82;
const ACTION_BAR_Y     = CFG.H - 38;

function renderCombat(ctx, gs) {
  if (!gs.combat) return;
  const c = gs.combat;

  // Background — dark, ominous
  fillRect(ctx, 0, 0, CFG.W - CFG.PANEL_W, CFG.H, '#06060c');
  // Ground
  fillRect(ctx, 0, COMBAT_GROUND_Y, CFG.W - CFG.PANEL_W, 4, C.dirt);

  // Distant bg elements
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#14141e';
  ctx.fillRect(50, 80, 80, 130);
  ctx.fillRect(200, 60, 60, 150);
  ctx.fillRect(310, 90, 100, 120);
  ctx.globalAlpha = 1;

  // ── Draw player ────────────────────────────────────────────────────────────
  const pHpPct = c.player.hp / c.player.maxHp;
  drawParent(ctx, COMBAT_PLAYER_X, COMBAT_GROUND_Y, 3, 1, Math.floor(Date.now()/200) % 2, gs.parent.gender);

  // Player HP bar
  drawStatBar(ctx, COMBAT_PLAYER_X - 40, COMBAT_GROUND_Y - 55, 80, 8,
    c.player.hp, c.player.maxHp, pHpPct > 0.4 ? C.hp : '#cc2020');
  drawText(ctx, gs.parent.name, COMBAT_PLAYER_X, COMBAT_GROUND_Y - 62, C.textBright, 8, 'center');
  drawText(ctx, `${Math.max(0,Math.round(c.player.hp))}/${c.player.maxHp}`,
    COMBAT_PLAYER_X, COMBAT_GROUND_Y - 44, C.textDim, 7, 'center');

  // Firearm magazine
  if (c.player.magazineSize > 0) {
    const ammoStr = `[${c.player.magazine}/${c.player.magazineSize}]`;
    drawText(ctx, ammoStr, COMBAT_PLAYER_X, COMBAT_GROUND_Y - 36, C.textDim, 7, 'center');
  }

  // ── Draw enemies ───────────────────────────────────────────────────────────
  const aliveEnemies = c.enemies.filter(e => !e.dead);
  const spacing = aliveEnemies.length > 1 ? 70 : 0;
  let ex = COMBAT_ENEMY_X - spacing * (aliveEnemies.length - 1) / 2;

  for (let i = 0; i < c.enemies.length; i++) {
    const en = c.enemies[i];
    if (en.dead) {
      // Dead enemy — faded
      ctx.globalAlpha = 0.25;
      drawEnemySprite(ctx, ex, COMBAT_GROUND_Y, en);
      ctx.globalAlpha = 1;
      ex += 70;
      continue;
    }

    const eHpPct = en.hp / en.maxHp;
    drawEnemySprite(ctx, ex, COMBAT_GROUND_Y, en);

    drawStatBar(ctx, ex - 40, COMBAT_GROUND_Y - 48, 80, 7,
      en.hp, en.maxHp, eHpPct > 0.5 ? '#aa2222' : '#dd1010');
    drawText(ctx, en.name, ex, COMBAT_GROUND_Y - 56, C.textDanger, 7, 'center');
    drawText(ctx, `${Math.max(0,Math.round(en.hp))}/${en.maxHp}`, ex, COMBAT_GROUND_Y - 38, C.textDim, 7, 'center');

    // Target indicator
    if (c.targetIdx === i && c.turn === 'player') {
      ctx.strokeStyle = '#cc443322';
      ctx.lineWidth = 2;
      ctx.strokeRect(ex - 20, COMBAT_GROUND_Y - 90, 40, 100);
      ctx.lineWidth = 1;
    }

    ex += 70;
  }

  // ── Combat log ─────────────────────────────────────────────────────────────
  fillRect(ctx, COMBAT_LOG_X, COMBAT_LOG_Y, COMBAT_LOG_W, COMBAT_LOG_H, C.panelBg, 0.9);
  strokeRect(ctx, COMBAT_LOG_X, COMBAT_LOG_Y, COMBAT_LOG_W, COMBAT_LOG_H, C.border);
  const maxLogLines = 6;
  let ly = COMBAT_LOG_Y + 10;
  for (let i = 0; i < Math.min(c.log.length, maxLogLines); i++) {
    const entry = c.log[i];
    const col = entry.type === 'good'   ? C.textGood
              : entry.type === 'danger' ? C.textDanger
              : entry.type === 'warn'   ? C.textWarn
              : C.textDim;
    drawText(ctx, entry.text, COMBAT_LOG_X + 6, ly, col, 8);
    ly += 11;
  }

  // ── Action bar ─────────────────────────────────────────────────────────────
  const mx = gs.mouse.x, my = gs.mouse.y;
  drawCombatActionBar(ctx, gs, c, mx, my);

  // ── Phase overlays ─────────────────────────────────────────────────────────
  if (c.phase === 'victory' || c.phase === 'defeat' || c.phase === 'fled') {
    const msg = c.phase === 'victory' ? 'VICTORY' : c.phase === 'fled' ? 'ESCAPED' : 'DEFEATED';
    const col = c.phase === 'victory' || c.phase === 'fled' ? C.textGood : C.textDanger;
    drawFade(ctx, 0.5);
    drawTextShadow(ctx, msg, CFG.W / 2, 150, col, '#000000', 28, 'center');
  }

  // Turn indicator
  const turnMsg = c.turn === 'player' ? 'Your Turn' : 'Enemy Turn...';
  const turnCol = c.turn === 'player' ? C.textBright : C.textDanger;
  drawText(ctx, turnMsg, 10, 14, turnCol, 9, 'left', c.turn === 'player');

  // Right stats panel
  drawStatsPanel(ctx, gs);
  drawNotifications(ctx, gs);
}

function drawEnemySprite(ctx, x, y, enemy) {
  const frame = Math.floor(Date.now() / 300) % 2;
  switch (enemy.sprite) {
    case 'drone':
    case 'drone_heavy':
      drawDroneSprite(ctx, x, y - 30, 3, frame);
      break;
    case 'robot':
      drawRobotSprite(ctx, x, y, 3, -1);
      break;
    case 'human_hostile':
      drawHumanEnemy(ctx, x, y, 3, -1, frame);
      break;
    case 'wolf':
      drawDog(ctx, x, y, 3, -1, frame);
      break;
    default:
      // Generic box
      fillRect(ctx, x - 15, y - 30, 30, 30, '#2a1010');
      drawText(ctx, enemy.name.slice(0,6), x, y - 10, C.textDanger, 7, 'center');
  }
}

function drawCombatActionBar(ctx, gs, c, mx, my) {
  if (c.turn !== 'player' || c.phase !== 'action') return;

  fillRect(ctx, 0, ACTION_BAR_Y - 6, CFG.W - CFG.PANEL_W, 44, C.panelBg);
  drawDivider(ctx, 0, ACTION_BAR_Y - 6, CFG.W - CFG.PANEL_W, C.border2);

  // Weapons
  const wd = gs.parent.equipped.weapon ? getItemDef(gs.parent.equipped.weapon) : null;
  const isFirearm = wd && wd.weaponType === 'firearm';
  const isEmpty   = isFirearm && c.player.magazine <= 0;

  let bx = 10;

  // Attack button
  drawButton(ctx, bx, ACTION_BAR_Y, 70, 24,
    wd ? (isEmpty ? '⚠ EMPTY' : `Attack`) : 'Punch',
    hitTest(mx, my, bx, ACTION_BAR_Y, 70, 24), false, isEmpty);
  if (wd) drawText(ctx, wd.name.slice(0,9), bx + 35, ACTION_BAR_Y - 2, C.textDim, 7, 'center');
  bx += 76;

  // Reload button (firearms only)
  if (isFirearm) {
    drawButton(ctx, bx, ACTION_BAR_Y, 60, 24, 'Reload',
      hitTest(mx, my, bx, ACTION_BAR_Y, 60, 24), false,
      !isEmpty || (gs.parent.ammo[wd.ammoType] || 0) <= 0);
    bx += 66;
  }

  // Target selector (if multiple enemies)
  const alive = c.enemies.filter(e => !e.dead);
  if (alive.length > 1) {
    drawButton(ctx, bx, ACTION_BAR_Y, 60, 24, `Target ${c.targetIdx+1}/${alive.length}`,
      hitTest(mx, my, bx, ACTION_BAR_Y, 60, 24));
    bx += 66;
  }

  // Use item
  const hasUsable = gs.parent.inventory.some(s => {
    const d = getItemDef(s.id);
    return d && (d.health || d.hunger || d.thirst);
  });
  drawButton(ctx, bx, ACTION_BAR_Y, 56, 24, 'Item',
    hitTest(mx, my, bx, ACTION_BAR_Y, 56, 24), false, !hasUsable);
  bx += 62;

  // Flee
  drawButton(ctx, bx, ACTION_BAR_Y, 48, 24, 'Flee',
    hitTest(mx, my, bx, ACTION_BAR_Y, 48, 24));
}

// ── Combat click handler ──────────────────────────────────────────────────────

function combatClick(mx, my, gs) {
  if (!gs.combat) return;
  const c = gs.combat;
  if (c.turn !== 'player' || c.phase !== 'action') return;

  const wd = gs.parent.equipped.weapon ? getItemDef(gs.parent.equipped.weapon) : null;
  const isFirearm = wd && wd.weaponType === 'firearm';
  const isEmpty   = isFirearm && c.player.magazine <= 0;

  let bx = 10;

  // Attack
  if (hitTest(mx, my, bx, ACTION_BAR_Y, 70, 24) && !isEmpty) {
    playerAttack(gs, c.targetIdx);
    return;
  }
  bx += 76;

  // Reload
  if (isFirearm) {
    if (hitTest(mx, my, bx, ACTION_BAR_Y, 60, 24)) {
      playerReload(gs);
      return;
    }
    bx += 66;
  }

  // Target cycle
  const aliveCount = c.enemies.filter(e => !e.dead).length;
  if (aliveCount > 1) {
    if (hitTest(mx, my, bx, ACTION_BAR_Y, 60, 24)) {
      // Find next alive enemy
      let next = (c.targetIdx + 1) % c.enemies.length;
      let tries = 0;
      while (c.enemies[next].dead && tries < c.enemies.length) { next = (next+1)%c.enemies.length; tries++; }
      c.targetIdx = next;
      return;
    }
    bx += 66;
  }

  // Use item
  if (hitTest(mx, my, bx, ACTION_BAR_Y, 56, 24)) {
    // Use first usable item
    const slot = gs.parent.inventory.find(s => {
      const d = getItemDef(s.id);
      return d && (d.health || d.hunger || d.thirst);
    });
    if (slot) playerUseItem(gs, slot.id);
    return;
  }
  bx += 62;

  // Flee
  if (hitTest(mx, my, bx, ACTION_BAR_Y, 48, 24)) {
    playerFlee(gs);
  }
}
