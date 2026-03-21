// ui.js — Reusable UI components
'use strict';

const PANEL_X = CFG.W - CFG.PANEL_W;

// ── Stats panel (right side) ──────────────────────────────────────────────────

function drawStatsPanel(ctx, gs) {
  const x = PANEL_X, w = CFG.PANEL_W, h = CFG.H;

  // Background
  fillRect(ctx, x, 0, w, h, C.panelBg);
  strokeRect(ctx, x, 0, w, h, C.border);

  let y = 8;

  // Day / Time
  drawText(ctx, `DAY ${gs.day}`, x + w/2, y + 11, C.textBright, 12, 'center', true);
  y += 16;
  const timeStr = formatTime(gs.time);
  drawText(ctx, timeStr, x + w/2, y + 10, C.textDim, 10, 'center');
  y += 14;
  drawDivider(ctx, x + 6, y, w - 12, C.border2);
  y += 6;

  // ── Parent stats ───────────────────────────────────────────────────────────
  drawText(ctx, gs.parent.name.toUpperCase() + ' (' + parentTitle() + ')', x + 8, y + 8, C.text, 8, 'left', true);
  y += 12;

  y = drawPersonStats(ctx, gs.parent, x + 8, y, w - 16);
  y += 4;
  drawDivider(ctx, x + 6, y, w - 12, C.border2);
  y += 5;

  // ── Child stats ────────────────────────────────────────────────────────────
  drawText(ctx, gs.child.name.toUpperCase() + ' (Child)', x + 8, y + 8, '#a0809a', 8, 'left', true);
  y += 12;
  y = drawPersonStats(ctx, gs.child, x + 8, y, w - 16);
  y += 4;

  // Survivors
  if (gs.survivors.length > 0) {
    drawDivider(ctx, x + 6, y, w - 12, C.border2);
    y += 5;
    for (const s of gs.survivors) {
      drawText(ctx, s.name, x + 8, y + 8, C.textDim, 8);
      y += 10;
      y = drawPersonStats(ctx, s, x + 8, y, w - 16, true);
      y += 3;
    }
  }

  // Dog
  if (gs.dog && gs.dog.alive) {
    drawDivider(ctx, x + 6, y, w - 12, C.border2);
    y += 5;
    drawText(ctx, gs.dog.name + ' (Dog)', x + 8, y + 8, '#9a7040', 8);
    y += 11;
    drawStatBar(ctx, x+8, y, w-16, 6, gs.dog.health,     100, '#aa6622', null, 'HP');
    y += 8;
    drawStatBar(ctx, x+8, y, w-16, 6, 100-gs.dog.hunger, 100, C.hunger,  null, 'Fed');
    y += 10;
  }

  // ── Suspicion meter ────────────────────────────────────────────────────────
  const suspY = h - 80;
  drawDivider(ctx, x + 6, suspY - 6, w - 12, C.border2);
  drawText(ctx, 'AI SUSPICION', x + 8, suspY + 8, gs.suspicion > 70 ? C.textDanger : C.textDim, 8, 'left', true);
  const suspColor = gs.suspicion < 40 ? '#2a6a2a' : gs.suspicion < 70 ? '#8a6a10' : '#aa2020';
  drawStatBar(ctx, x+8, suspY + 10, w - 16, 9, gs.suspicion, 100, suspColor, null);
  const suspLabel = gs.suspicion < 30 ? 'LOW' : gs.suspicion < 60 ? 'MODERATE' : gs.suspicion < 85 ? 'HIGH' : 'CRITICAL';
  drawText(ctx, suspLabel, x + w/2, suspY + 10 + 7, C.textDim, 7, 'center');
}

function drawPersonStats(ctx, person, x, y, w, compact) {
  const bh = compact ? 5 : 6;
  const gap = compact ? 7 : 8;

  // HP bar with number
  const hpPct = person.health / person.maxHealth;
  const hpColor = hpPct > 0.6 ? C.hp : hpPct > 0.3 ? '#cc6020' : '#dd1010';
  drawStatBar(ctx, x, y, w, bh, person.health, person.maxHealth, hpColor, null, 'HP');
  y += gap;

  if (!compact) {
    drawStatBar(ctx, x, y, w, bh, person.hunger,     100, C.hunger,    null, 'Hunger');   y += gap;
    drawStatBar(ctx, x, y, w, bh, person.thirst,     100, C.thirst,    null, 'Thirst');   y += gap;
    drawStatBar(ctx, x, y, w, bh, person.tiredness,  100, C.tiredness, null, 'Tired');    y += gap;
  }

  const dcolor = person.depression > 70 ? '#9944dd' : C.depression;
  drawStatBar(ctx, x, y, w, bh, person.depression, 100, dcolor, null, 'Depr.');
  y += gap;

  // Warning icons
  if (person.hunger > CFG.HUNGER_WARN)  { drawText(ctx, '! HUNGRY', x + w - 38, y + 0, C.textWarn, 7); }
  if (person.thirst > CFG.THIRST_WARN)  { drawText(ctx, '! THIRSTY', x + w - 42, y + 0, C.textWarn, 7); }
  if (person.tiredness > 75)            { drawText(ctx, '! TIRED',   x + w - 35, y + 0, C.textDim, 7); }
  if (person.depression > CFG.DEPR_WARN){ drawText(ctx, '! DEPR',    x,          y + 0, C.depression, 7); }

  return y + (compact ? 0 : 4);
}

// ── Notification popups (floating messages) ───────────────────────────────────

function drawNotifications(ctx, gs) {
  const notifs = gs.notifications.filter(n => n.ttl > 0);
  let ny = 20;
  for (const n of notifs) {
    const alpha = Math.min(1, n.ttl / 30);
    const typeColor = n.type === 'danger' ? C.textDanger
                    : n.type === 'warn'   ? C.textWarn
                    : n.type === 'good'   ? C.textGood
                    : C.text;
    drawTextShadow(ctx, n.text, 10, ny, typeColor, '#000000aa', 9);
    ny += 13;
    n.ttl--;
  }
  gs.notifications = notifs;
}

// ── Action button grid ─────────────────────────────────────────────────────────

function drawActionButtons(ctx, buttons, mx, my) {
  const results = {};
  for (const btn of buttons) {
    const hovered = hitTest(mx, my, btn.x, btn.y, btn.w, btn.h);
    drawButton(ctx, btn.x, btn.y, btn.w, btn.h, btn.label, hovered, btn.active, btn.disabled);
    results[btn.id] = { hovered, x: btn.x, y: btn.y, w: btn.w, h: btn.h };
  }
  return results;
}

// ── Inventory list ────────────────────────────────────────────────────────────

function drawInventoryList(ctx, inv, x, y, w, h, title, scrollY, mx, my) {
  // Panel background
  drawPanel(ctx, x, y, w, h, C.panelBg2, C.border2);

  // Title
  fillRect(ctx, x, y, w, 14, C.panelBg);
  drawText(ctx, title || 'INVENTORY', x + 6, y + 10, C.textBright, 9, 'left', true);
  drawDivider(ctx, x+2, y+14, w-4, C.border);

  const rowH = 18;
  const visRows = Math.floor((h - 18) / rowH);
  const startIdx = Math.floor(scrollY / rowH);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y + 15, w, h - 15);
  ctx.clip();

  let itemY = y + 15 - (scrollY % rowH);

  const clickResults = [];

  for (let i = startIdx; i < Math.min(inv.length, startIdx + visRows + 1); i++) {
    const slot = inv[i];
    if (!slot) continue;
    const def = getItemDef(slot.id);
    if (!def) continue;

    const hov = hitTest(mx, my, x, itemY, w, rowH);
    if (hov) fillRect(ctx, x, itemY, w, rowH, C.highlight);

    // Type colour strip
    fillRect(ctx, x + 2, itemY + 2, 3, rowH - 4, itemTypeColor(def.type));

    // Name + qty
    const label = slot.qty > 1 ? `${def.name} x${slot.qty}` : def.name;
    drawText(ctx, label, x + 10, itemY + rowH - 5, hov ? C.textBright : C.text, 9);

    // Weight
    const wt = `${(def.weight * slot.qty).toFixed(1)}kg`;
    drawText(ctx, wt, x + w - 4, itemY + rowH - 5, C.textDim, 7, 'right');

    clickResults.push({ idx: i, slot, y1: itemY, y2: itemY + rowH });
    itemY += rowH;
  }

  ctx.restore();

  // Scroll indicator
  if (inv.length > visRows) {
    const trackH = h - 18;
    const thumbH = Math.max(20, trackH * visRows / inv.length);
    const thumbY = y + 16 + (scrollY / (inv.length * rowH - h)) * (trackH - thumbH);
    fillRect(ctx, x + w - 4, y + 16, 3, trackH, C.border2);
    fillRect(ctx, x + w - 4, thumbY, 3, thumbH, '#555565');
  }

  return clickResults;
}

// ── Dialog / modal panel ──────────────────────────────────────────────────────

function drawModal(ctx, x, y, w, h, title) {
  // Shadow
  fillRect(ctx, x + 4, y + 4, w, h, '#000000', 0.5);
  // Body
  drawPanel(ctx, x, y, w, h, C.panelBg, C.border2);
  // Title bar
  fillRect(ctx, x, y, w, 16, '#0e0e20');
  drawText(ctx, title || '', x + w/2, y + 11, C.textBright, 9, 'center', true);
  drawDivider(ctx, x+2, y+16, w-4, C.border2);
}

// ── In-game log strip ─────────────────────────────────────────────────────────

function drawLog(ctx, gs, x, y, w, h) {
  fillRect(ctx, x, y, w, h, C.panelBg, 0.9);
  strokeRect(ctx, x, y, w, h, C.border);
  const maxLines = Math.floor((h - 4) / 10);
  let ly = y + 10;
  for (let i = 0; i < Math.min(gs.log.length, maxLines); i++) {
    const entry = gs.log[i];
    const col = entry.type === 'danger' ? C.textDanger
              : entry.type === 'good'   ? C.textGood
              : entry.type === 'warn'   ? C.textWarn
              : entry.type === 'info'   ? '#8888cc'
              : C.textDim;
    drawText(ctx, entry.text, x + 4, ly, col, 8);
    ly += 10;
  }
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function drawTooltip(ctx, itemId, mx, my) {
  const def = getItemDef(itemId);
  if (!def) return;

  const lines = [];
  lines.push({ text: def.name, color: C.textBright, size: 9, bold: true });
  if (def.weight) lines.push({ text: `Weight: ${def.weight}kg`, color: C.textDim, size: 8 });
  if (def.desc)   lines.push({ text: def.desc, color: C.text, size: 8, wrap: 140 });
  if (def.hunger  && def.hunger < 0)  lines.push({ text: `Hunger: ${def.hunger}`,     color: C.hunger,    size: 8 });
  if (def.thirst  && def.thirst < 0)  lines.push({ text: `Thirst: ${def.thirst}`,     color: C.thirst,    size: 8 });
  if (def.health  && def.health > 0)  lines.push({ text: `Health: +${def.health}`,    color: C.hp,        size: 8 });
  if (def.depression && def.depression < 0) lines.push({ text: `Mood: ${def.depression}`, color: C.depression, size: 8 });
  if (def.damage) lines.push({ text: `Damage: ${def.damage[0]}-${def.damage[1]}`, color: '#cc8888', size: 8 });

  const tw = 160, lh = 12;
  const th = lines.length * lh + 10;
  let tx = Math.min(mx + 10, CFG.W - tw - 5);
  let ty = Math.max(5, my - th - 5);

  fillRect(ctx, tx, ty, tw, th, C.panelBg);
  strokeRect(ctx, tx, ty, tw, th, C.border2);

  let lineY = ty + 11;
  for (const line of lines) {
    drawText(ctx, line.text, tx + 6, lineY, line.color, line.size || 8, 'left', line.bold);
    lineY += lh;
  }
}

// ── Day transition overlay ────────────────────────────────────────────────────

function drawDayTransition(ctx, gs) {
  const df = gs.dayFade;
  if (!df.active) return;

  df.timer++;

  if (df.phase === 'out') {
    df.alpha = Math.min(1, df.timer / 60);
    drawFade(ctx, df.alpha);
    if (df.alpha >= 1) {
      df.phase = 'text';
      df.timer = 0;
      advanceDay(gs);
    }
  } else if (df.phase === 'text') {
    drawFade(ctx, 1);
    drawText(ctx, `Day ${gs.day}`, CFG.W / 2, CFG.H / 2 - 8, C.textBright, 20, 'center', true);
    drawText(ctx, formatTime(gs.time), CFG.W / 2, CFG.H / 2 + 14, C.textDim, 10, 'center');
    if (df.timer > 100) { df.phase = 'in'; df.timer = 0; }
  } else if (df.phase === 'in') {
    df.alpha = Math.max(0, 1 - df.timer / 60);
    drawFade(ctx, df.alpha);
    if (df.alpha <= 0) {
      df.active = false;
      df.alpha  = 0;
      df.phase  = 'out';
      df.timer  = 0;
    }
  }
}

// ── Game over screen ──────────────────────────────────────────────────────────

function drawGameOver(ctx, gs) {
  fillRect(ctx, 0, 0, CFG.W, CFG.H, '#000000');

  const cx = CFG.W / 2;
  drawText(ctx, 'GAME OVER', cx, 100, '#441111', 40, 'center', true);
  drawText(ctx, gs.gameOverReason || 'You did not survive.', cx, 145, C.textDim, 10, 'center');
  drawText(ctx, `You survived ${gs.day} day${gs.day !== 1 ? 's' : ''}.`, cx, 165, C.textDim, 9, 'center');

  const mx = gs.mouse.x, my = gs.mouse.y;
  const bx = cx - 55, by = 200;
  drawButton(ctx, bx, by, 110, 24, 'Try Again', hitTest(mx, my, bx, by, 110, 24), false, false);
}
