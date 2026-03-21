// shelter.js — Shelter management screen
'use strict';

// Room layout constants
const ROOM_GRID = [
  ['main','bedroom','storage'],
  ['workshop','infirmary','security'],
];
const MAIN_W = CFG.W - CFG.PANEL_W;  // 440

// Compute room rect from grid col/row
function roomRect(col, row) {
  const totalW = ROOM_GRID[0].length * CFG.ROOM_W + (ROOM_GRID[0].length - 1) * CFG.ROOM_GAP;
  const startX = Math.floor((MAIN_W - totalW) / 2);
  const x = startX + col * (CFG.ROOM_W + CFG.ROOM_GAP);
  const y = CFG.SURFACE_H + 12 + row * (CFG.ROOM_H + CFG.ROOM_GAP);
  return { x, y, w: CFG.ROOM_W, h: CFG.ROOM_H };
}

// ── Shelter action menus ───────────────────────────────────────────────────────

let shelterUI = {
  activeMenu: null,    // null | 'room' | 'crafting' | 'storage' | 'cooking'
  selectedRoom: null,
  contextItem: null,
  storageScroll: 0,
  craftingScroll: 0,
  menuX: 0, menuY: 0,
  tooltip: null,
  tooltipX: 0, tooltipY: 0,
};

function renderShelter(ctx, gs) {
  // Background
  fillRect(ctx, 0, 0, MAIN_W, CFG.H, C.bg);

  // Surface scene
  drawSurface(ctx, gs.day * 30);
  drawHatch(ctx, MAIN_W / 2, CFG.SURFACE_H - 2);

  // Earth fill below surface
  drawEarth(ctx, 0, CFG.SURFACE_H, MAIN_W, CFG.H - CFG.SURFACE_H);

  // Shaft from hatch to first room
  const mainRect = roomRect(0, 0);
  fillRect(ctx, MAIN_W/2 - 6, CFG.SURFACE_H - 2, 12, 14, C.metal);

  // Draw rooms
  const mx = gs.mouse.x, my = gs.mouse.y;
  for (let row = 0; row < ROOM_GRID.length; row++) {
    for (let col = 0; col < ROOM_GRID[row].length; col++) {
      const roomId = ROOM_GRID[row][col];
      const room   = getRoom(roomId);
      const def    = ROOM_DEFS[roomId];
      const r      = roomRect(col, row);
      const sel    = shelterUI.selectedRoom === roomId;
      const hov    = !shelterUI.activeMenu && hitTest(mx, my, r.x, r.y, r.w, r.h);

      drawRoomInterior(ctx, r.x, r.y, r.w, r.h, room.unlocked, sel || hov);

      if (room.unlocked) {
        drawText(ctx, def.name, r.x + r.w/2, r.y + 12, C.textDim, 8, 'center', true);
      } else {
        drawText(ctx, def.name, r.x + r.w/2, r.y + r.h/2 - 2, '#303035', 8, 'center', false);
        drawText(ctx, '[ BUILD ]', r.x + r.w/2, r.y + r.h/2 + 10, '#2a2a35', 7, 'center');
      }

      // Building progress bar
      if (room.building) {
        const prog = gs.parent.taskProgress / gs.parent.taskDuration;
        drawStatBar(ctx, r.x + 4, r.y + r.h - 10, r.w - 8, 5, prog * 100, 100, C.textGood);
        drawText(ctx, 'BUILDING...', r.x + r.w/2, r.y + r.h - 14, C.textWarn, 7, 'center');
      }

      // Shaft/connector between rows
      if (row === 0 && col === 0 && ROOM_GRID.length > 1) {
        const lowerRect = roomRect(0, 1);
        fillRect(ctx, r.x + r.w/2 - 5, r.y + r.h, 10, lowerRect.y - (r.y + r.h), C.metal);
      }
    }
  }

  // Connectors between columns (same row)
  for (let row = 0; row < ROOM_GRID.length; row++) {
    for (let col = 0; col < ROOM_GRID[row].length - 1; col++) {
      const r1 = roomRect(col, row);
      const r2 = roomRect(col+1, row);
      fillRect(ctx, r1.x + r1.w, r1.y + r1.h/2 - 5, r2.x - (r1.x + r1.w), 10, C.metal);
    }
  }

  // Characters in main room
  drawShelterCharacters(ctx, gs);

  // Right stats panel
  drawStatsPanel(ctx, gs);

  // Bottom controls bar
  drawShelterControls(ctx, gs, mx, my);

  // Active menu overlay
  if (shelterUI.activeMenu) drawShelterMenu(ctx, gs, mx, my);

  // Tooltip
  if (shelterUI.tooltip) drawTooltip(ctx, shelterUI.tooltip, shelterUI.tooltipX, shelterUI.tooltipY);

  // Notifications
  drawNotifications(ctx, gs);

  // Day transition
  drawDayTransition(ctx, gs);
}

// ── Characters in rooms ───────────────────────────────────────────────────────

function drawShelterCharacters(ctx, gs) {
  const p = gs.parent;
  const ch = gs.child;
  const mainR = roomRect(0, 0);

  // Animate
  p.animTimer++;
  ch.animTimer++;
  if (p.animTimer  % 30 === 0) p.animFrame++;
  if (ch.animTimer % 25 === 0) ch.animFrame++;

  if (!p.isExploring) {
    const px = mainR.x + 30;
    const py = mainR.y + mainR.h - 12;
    drawParent(ctx, px, py, 2, p.facing, p.isSleeping ? 0 : p.animFrame, p.gender);
    if (p.isSleeping) {
      drawText(ctx, 'zzz', px + 8, py - 20, C.textDim, 7);
    }
    if (p.isWorking && p.task) {
      const prog = p.taskProgress / p.taskDuration;
      drawStatBar(ctx, px - 10, py - 25, 30, 4, prog * 100, 100, C.textGood);
      drawText(ctx, 'working', px, py - 28, C.textDim, 6, 'center');
    }
  }

  // Child
  const cpy = mainR.y + mainR.h - 12;
  const cpx = mainR.x + 60;
  drawChild(ctx, cpx, cpy, 2, ch.facing, ch.animFrame);

  // Dog
  if (gs.dog && gs.dog.alive) {
    const dogX = mainR.x + 90;
    drawDog(ctx, dogX, cpy, 2, 1, ch.animFrame);
  }

  // Survivors
  gs.survivors.forEach((s, i) => {
    const sx = mainR.x + 100 + i * 28;
    drawSurvivor(ctx, sx, cpy, 2, s.facing, s.animFrame, i);
  });
}

// ── Bottom controls ───────────────────────────────────────────────────────────

const CTRL_BUTTONS = [
  { id: 'explore',  label: 'Explore',   w: 72 },
  { id: 'craft',    label: 'Craft',     w: 56 },
  { id: 'storage',  label: 'Storage',   w: 62 },
  { id: 'cook',     label: 'Cook',      w: 56, needsCampfire: true },
  { id: 'sleep',    label: 'Sleep',     w: 52 },
  { id: 'play',     label: 'Play',      w: 52 },
  { id: 'endday',   label: 'End Day',   w: 62 },
];

function drawShelterControls(ctx, gs, mx, my) {
  const barH = 30, barY = CFG.H - barH;
  fillRect(ctx, 0, barY, MAIN_W, barH, C.panelBg);
  drawDivider(ctx, 0, barY, MAIN_W, C.border2);

  let bx = 6;
  for (const btn of CTRL_BUTTONS) {
    const disabled = (btn.needsCampfire && !gs.shelter.campfire)
                  || (btn.id === 'explore' && gs.parent.isExploring)
                  || (btn.id === 'sleep'   && gs.parent.isSleeping);
    const active = (btn.id === 'craft'   && shelterUI.activeMenu === 'crafting')
                || (btn.id === 'storage' && shelterUI.activeMenu === 'storage')
                || (btn.id === 'cook'    && shelterUI.activeMenu === 'cooking');
    drawButton(ctx, bx, barY + 5, btn.w, 20, btn.label,
      hitTest(mx, my, bx, barY + 5, btn.w, 20), active, disabled);
    bx += btn.w + 4;
  }
}

// ── Context menus ─────────────────────────────────────────────────────────────

function drawShelterMenu(ctx, gs, mx, my) {
  const M = shelterUI;

  if (M.activeMenu === 'room') drawRoomMenu(ctx, gs, mx, my);
  else if (M.activeMenu === 'crafting') drawCraftingMenu(ctx, gs, mx, my);
  else if (M.activeMenu === 'storage')  drawStorageMenu(ctx, gs, mx, my);
  else if (M.activeMenu === 'cooking')  drawCookingMenu(ctx, gs, mx, my);
}

function drawRoomMenu(ctx, gs, mx, my) {
  const roomId = shelterUI.selectedRoom;
  if (!roomId) return;
  const def  = ROOM_DEFS[roomId];
  const room = getRoom(roomId);
  const W2 = 210, H2 = 200;
  const px = clamp(shelterUI.menuX, 2, MAIN_W - W2 - 2);
  const py = clamp(shelterUI.menuY, 2, CFG.H - H2 - 2);

  drawModal(ctx, px, py, W2, H2, def.name);
  let y = py + 24;

  drawText(ctx, def.desc, px + 8, y + 9, C.textDim, 8);
  y += 20;

  if (!room.unlocked) {
    drawText(ctx, 'Build cost:', px + 8, y + 9, C.text, 8);
    y += 12;
    if (def.buildCost) {
      for (const [id, qty] of Object.entries(def.buildCost)) {
        const have = countInInventory(gs.shelter.storage, id) + countInInventory(gs.parent.inventory, id);
        const col  = have >= qty ? C.textGood : C.textDanger;
        drawText(ctx, `  ${getItemDef(id)?.name || id}: ${have}/${qty}`, px + 8, y + 9, col, 8);
        y += 11;
      }
      if (def.needsTools) {
        const haveTools = countInInventory(gs.shelter.storage,'tools') + countInInventory(gs.parent.inventory,'tools');
        drawText(ctx, `  Tools: ${haveTools}/1`, px+8, y+9, haveTools>0?C.textGood:C.textDanger, 8);
        y += 11;
      }
      drawText(ctx, `Noise: +${def.buildNoise} (Suspicion)`, px+8, y+9, C.textWarn, 7);
      y += 14;
      const canBuild = canAfford(def.buildCost, gs, true)
        && (!def.needsTools || countInInventory(gs.shelter.storage,'tools')+countInInventory(gs.parent.inventory,'tools')>0)
        && gs.parent.task === null;
      // Position build button near bottom
      const buildBtnY = py + H2 - 48;
      drawButton(ctx, px+8, buildBtnY, W2-16, 18, 'Build Room',
        hitTest(mx, my, px+8, buildBtnY, W2-16, 18), false, !canBuild);
      y += 22;
    }
  } else {
    drawText(ctx, 'Room level: ' + room.level, px+8, y+9, C.textGood, 8);
    y += 14;
  }

  const closeX = px+8, closeY = py + H2 - 24;
  drawButton(ctx, closeX, closeY, 50, 16, 'Close', hitTest(mx, my, closeX, closeY, 50, 16));
}

function drawCraftingMenu(ctx, gs, mx, my) {
  const W2 = 280, H2 = 220;
  const px = 60, py = 50;
  drawModal(ctx, px, py, W2, H2, 'CRAFTING');

  let y = py + 24;
  const visRecipes = RECIPES_DB.concat(Object.values(UPGRADES_DB));

  for (const recipe of visRecipes) {
    if (y > py + H2 - 40) break;

    // Check if already built (for upgrades)
    if (recipe.key && gs.shelter[recipe.key]) continue;

    const name = recipe.name;
    const canMake = recipe.buildCost
      ? canAfford(recipe.buildCost, gs, true)
      : canAfford(recipe.cost || {}, gs, true);

    const hov = hitTest(mx, my, px+4, y, W2-8, 18);
    if (hov) fillRect(ctx, px+4, y, W2-8, 18, C.highlight);

    const col = canMake ? C.text : C.textDim;
    drawText(ctx, name, px + 10, y + 11, col, 8);
    if (canMake) drawText(ctx, '✓', px + W2 - 18, y + 11, C.textGood, 8);

    y += 20;
  }

  const closeX = px+8, closeY = py + H2 - 24;
  drawButton(ctx, closeX, closeY, 50, 16, 'Close', hitTest(mx, my, closeX, closeY, 50, 16));
}

function drawStorageMenu(ctx, gs, mx, my) {
  const W2 = 280, H2 = 240;
  const px = 60, py = 40;

  const storage = gs.shelter.storage;
  const wt = shelterStorageWeight().toFixed(1);
  const title = `STORAGE  ${wt}/${gs.shelter.storageMax}kg`;
  drawModal(ctx, px, py, W2, H2, title);

  const clicks = drawInventoryList(ctx, storage, px + 2, py + 17, W2 - 4, H2 - 40, null,
    shelterUI.storageScroll, mx, my);

  shelterUI._storageClicks = clicks;

  const closeX = px + 8, closeY = py + H2 - 22;
  drawButton(ctx, closeX, closeY, 50, 16, 'Close', hitTest(mx, my, closeX, closeY, 50, 16));
}

function drawCookingMenu(ctx, gs, mx, my) {
  const W2 = 240, H2 = 180;
  const px = 80, py = 60;
  drawModal(ctx, px, py, W2, H2, 'COOK FOOD');
  let y = py + 24;

  const cookable = [
    { srcId:'raw_meat',   outId:'cooked_meat',  label:'Cook Meat (raw → cooked)' },
    { srcId:'canned_soup',outId:'heated_soup',  label:'Heat Soup (canned → hot)' },
    { srcId:'canned_beans',outId:'heated_beans',label:'Heat Beans (canned → hot)' },
  ];

  for (const item of cookable) {
    const qty = countInInventory(gs.shelter.storage, item.srcId);
    const canCook = qty > 0 && !gs.parent.isWorking && gs.parent.task === null;
    const hov = hitTest(mx, my, px+4, y, W2-8, 20);
    if (hov) fillRect(ctx, px+4, y, W2-8, 20, C.highlight);
    drawButton(ctx, px+8, y+1, W2-16, 18, `${item.label} (${qty})`,
      hov, false, !canCook);
    y += 24;
  }

  const closeX = px+8, closeY = py + H2 - 24;
  drawButton(ctx, closeX, closeY, 50, 16, 'Close', hitTest(mx, my, closeX, closeY, 50, 16));
}

// ── Click handler ─────────────────────────────────────────────────────────────

function shelterClick(mx, my, gs) {
  const M    = shelterUI;
  const barY = CFG.H - 30;

  // Close menu on outside click
  if (M.activeMenu) {
    handleMenuClick(mx, my, gs);
    return;
  }

  // Bottom control bar
  for (const btn of CTRL_BUTTONS) {
    let bx = 6;
    for (const b of CTRL_BUTTONS) {
      if (b === btn) break;
      bx += b.w + 4;
    }
    if (hitTest(mx, my, bx, barY + 5, btn.w, 20)) {
      handleControlBtn(btn.id, gs, mx, my);
      return;
    }
  }

  // Room click
  for (let row = 0; row < ROOM_GRID.length; row++) {
    for (let col = 0; col < ROOM_GRID[row].length; col++) {
      const roomId = ROOM_GRID[row][col];
      const r      = roomRect(col, row);
      if (hitTest(mx, my, r.x, r.y, r.w, r.h)) {
        M.selectedRoom = roomId;
        M.activeMenu   = 'room';
        M.menuX        = r.x;
        M.menuY        = r.y - 10;
        return;
      }
    }
  }
}

function handleControlBtn(id, gs, mx, my) {
  const M = shelterUI;
  switch (id) {
    case 'explore':
      startExploration(gs);
      break;
    case 'craft':
      M.activeMenu = M.activeMenu === 'crafting' ? null : 'crafting';
      break;
    case 'storage':
      M.activeMenu = M.activeMenu === 'storage' ? null : 'storage';
      break;
    case 'cook':
      M.activeMenu = M.activeMenu === 'cooking' ? null : 'cooking';
      break;
    case 'sleep':
      gs.parent.isSleeping = true;
      gs.parent.task = { type:'sleep' };
      gs.parent.taskDuration = 6;   // 6 game hours
      gs.parent.taskProgress = 0;
      notify('Sleeping...', 'normal');
      break;
    case 'play':
      if (!gs.parent.task) {
        gs.parent.task = { type:'play' };
        gs.parent.taskDuration = 2;
        gs.parent.taskProgress = 0;
        gs.parent.isWorking = true;
        notify(`Playing with ${gs.child.name}.`, 'good');
      }
      break;
    case 'endday':
      startDayTransition(gs);
      break;
  }
}

function handleMenuClick(mx, my, gs) {
  const M    = shelterUI;
  const barH = 30;

  if (M.activeMenu === 'room') {
    const roomId = M.selectedRoom;
    const def    = ROOM_DEFS[roomId];
    const room   = getRoom(roomId);
    const W2 = 210, H2 = 200;
    const px = clamp(M.menuX, 2, MAIN_W - W2 - 2);
    const py = clamp(M.menuY, 2, CFG.H - H2 - 2);

    // Build button (positioned near bottom of modal)
    if (!room.unlocked) {
      const buildBtnY = py + H2 - 48;
      if (hitTest(mx, my, px+8, buildBtnY, W2-16, 18)) {
        const result = buildRoom(gs, roomId);
        if (result.ok) M.activeMenu = null;
        else notify(result.msg, 'warn');
        return;
      }
    }
    // Close
    if (hitTest(mx, my, px+8, py + H2 - 24, 50, 16)) { M.activeMenu = null; M.selectedRoom = null; }
    return;
  }

  if (M.activeMenu === 'crafting') {
    const W2 = 280, H2 = 220;
    const px = 60, py = 50;
    const allRecipes = RECIPES_DB.concat(Object.values(UPGRADES_DB));
    let y = py + 24;
    for (const recipe of allRecipes) {
      if (recipe.key && gs.shelter[recipe.key]) continue;
      if (hitTest(mx, my, px+4, y, W2-8, 18)) {
        // Is it a room upgrade or item recipe?
        if (UPGRADES_DB[recipe.id]) {
          const result = buildUpgrade(gs, recipe.id);
          if (!result.ok) notify(result.msg, 'warn');
        } else {
          const result = craftItem(gs, recipe.id);
          if (!result.ok) notify(result.msg, 'warn');
        }
      }
      y += 20;
    }
    if (hitTest(mx, my, px+8, py + H2 - 24, 50, 16)) M.activeMenu = null;
    return;
  }

  if (M.activeMenu === 'storage') {
    const W2 = 280, H2 = 240;
    const px = 60, py = 40;
    if (hitTest(mx, my, px+8, py + H2 - 22, 50, 16)) { M.activeMenu = null; return; }
    return;
  }

  if (M.activeMenu === 'cooking') {
    const W2 = 240, H2 = 180;
    const px = 80, py = 60;
    const cookable = [
      { srcId:'raw_meat',   outId:'cooked_meat' },
      { srcId:'canned_soup',outId:'heated_soup' },
      { srcId:'canned_beans',outId:'heated_beans' },
    ];
    let y = py + 24;
    for (const item of cookable) {
      if (hitTest(mx, my, px+8, y+1, W2-16, 18)) {
        const result = cookFood(gs, item.srcId, 1);
        if (!result.ok) notify(result.msg, 'warn');
        M.activeMenu = null;
        return;
      }
      y += 24;
    }
    if (hitTest(mx, my, px+8, py + H2 - 24, 50, 16)) M.activeMenu = null;
  }
}
