// explore.js — Side-scrolling exploration screen
'use strict';

const GROUND_Y    = 240;   // y where ground/floor is
const WORLD_H     = CFG.H;
const PLAYER_W    = 10;
const PLAYER_FOOT = GROUND_Y; // player stands at this Y

let exploreState = null;

// ── Init exploration ──────────────────────────────────────────────────────────

function startExploration(gs) {
  // Pick location
  const loc = randChoice(LOCATIONS_DB);

  // Place loot items in world
  const lootItems = [];
  for (const zone of loc.zones) {
    const items = rollLoot(zone.lootTable);
    for (const item of items) {
      lootItems.push({
        id:     item.id,
        qty:    item.qty,
        wx:     zone.x + randInt(30, zone.w - 30),
        wy:     PLAYER_FOOT,
        taken:  false,
      });
    }
  }

  // Place enemy encounter markers
  const encounters = [];
  for (const zone of loc.zones) {
    if (chance(zone.enemyChance)) {
      encounters.push({
        wx:       zone.x + Math.floor(zone.w * 0.6) + randInt(-20, 20),
        triggered: false,
        distance:  80,
        difficulty: loc.difficulty,
        zone,
      });
    }
  }

  // Place event markers (random events during exploration)
  const events = [];
  for (let i = 0; i < 2; i++) {
    events.push({
      wx:  randInt(200, CFG.WORLD_W - 200),
      triggered: false,
      distance: 40,
    });
  }

  // Hunt spots (forest only)
  const huntSpots = [];
  if (loc.canHunt) {
    for (const zone of loc.zones) {
      if (zone.huntChance && chance(zone.huntChance)) {
        huntSpots.push({ wx: zone.x + randInt(40, zone.w - 40), used: false });
      }
    }
  }

  exploreState = {
    location:    loc,
    scrollX:     0,
    loot:        lootItems,
    encounters,
    events,
    huntSpots,
    px:          80,      // player world X
    py:          PLAYER_FOOT,
    velX:        0,
    facing:      1,
    animFrame:   0,
    animTimer:   0,
    onGround:    true,
    showReturnPrompt: false,
    returnTimer: 0,
  };

  gs.parent.isExploring = true;
  gs.child.isAlone      = true;
  gs.screen             = 'explore';

  addLog(`Exploring: ${loc.name}`, 'info');

  // First explore flag
  if (!gs.flags.firstExplore) {
    gs.flags.firstExplore = true;
    notify('Move with A/D or arrow keys. Press E to interact.', 'info');
  }
}

// ── Update exploration ────────────────────────────────────────────────────────

function updateExplore(gs, dt) {
  if (!exploreState) return;
  const es = exploreState;
  const p  = gs.parent;

  // Movement input
  const moveLeft  = gs.keys['a'] || gs.keys['arrowleft'];
  const moveRight = gs.keys['d'] || gs.keys['arrowright'];

  if (moveLeft)  { es.velX = -CFG.PLAYER_SPEED; es.facing = -1; }
  else if (moveRight) { es.velX = CFG.PLAYER_SPEED; es.facing = 1; }
  else es.velX = 0;

  // Move player
  es.px = clamp(es.px + es.velX, 10, CFG.WORLD_W - 10);

  // Scroll (keep player in middle-ish of screen)
  const targetScroll = es.px - CFG.W * 0.35;
  es.scrollX = clamp(lerp(es.scrollX, targetScroll, 0.15), 0, CFG.WORLD_W - CFG.W);

  // Animation
  es.animTimer++;
  if (Math.abs(es.velX) > 0.1 && es.animTimer % 12 === 0) es.animFrame++;
  else if (Math.abs(es.velX) < 0.1) es.animFrame = 0;

  p.animFrame  = es.animFrame;
  p.facing     = es.facing;

  // Tiredness from exploring (active rate)
  p.tiredness = clamp(p.tiredness + CFG.TIRE_ACTIVE_PER_HOUR * (dt * CFG.MINS_PER_REAL_SEC / 60), 0, 100);

  // Check encounters
  for (const enc of es.encounters) {
    if (!enc.triggered && Math.abs(es.px - enc.wx) < enc.distance) {
      enc.triggered = true;
      const enemies = buildEncounter(enc.difficulty, enc.zone);
      if (enemies.length > 0) {
        startCombat(gs, enemies);
        gs.screen = 'combat';
        return;
      }
    }
  }

  // Check events
  for (const ev of es.events) {
    if (!ev.triggered && Math.abs(es.px - ev.wx) < ev.distance) {
      ev.triggered = true;
      const eventData = pickEvent(gs, 'explore');
      if (eventData) {
        gs.event   = eventData;
        gs.screen  = 'event';
        gs._returnTo = 'explore';
        return;
      }
    }
  }

  // Hunt spots
  for (const spot of es.huntSpots) {
    if (!spot.used && Math.abs(es.px - spot.wx) < 30) {
      spot.used = true;
      addToInventory(p.inventory, 'raw_meat', randInt(1,3));
      addLog('Hunted: found raw meat.', 'good');
    }
  }

  // Return home prompt (at world edges or near start)
  es.showReturnPrompt = es.px < 80 || es.px > CFG.WORLD_W - 120;

  // Auto return if tiredness too high
  if (p.tiredness >= 92) {
    endExploration(gs);
    notify('Too exhausted to continue. Returned home.', 'warn');
  }
}

// ── Render exploration ────────────────────────────────────────────────────────

function renderExplore(ctx, gs) {
  if (!exploreState) return;
  const es = exploreState;
  const loc = es.location;

  // Background
  drawExploreBackground(ctx, es.scrollX, null, CFG.H);

  // Ground
  fillRect(ctx, 0, GROUND_Y, CFG.W, CFG.H - GROUND_Y, C.ground);
  fillRect(ctx, 0, GROUND_Y, CFG.W, 3, C.dirt2);

  // World content (offset by scroll)
  ctx.save();
  ctx.translate(-es.scrollX, 0);

  // Zone backgrounds
  for (const zone of loc.zones) {
    fillRect(ctx, zone.x, 0, zone.w, GROUND_Y, zone.bgColor || C.bg, 0.4);
  }

  // Buildings / structures
  let bx = 120;
  for (let i = 0; i < loc.zones.length; i++) {
    const zone = loc.zones[i];
    const buildW = Math.min(zone.w - 60, 120);
    const buildH = randInt(60, 110);
    drawExploreBuilding(ctx, zone.x + 30, GROUND_Y - buildH, buildW, buildH, zone.name);
    bx = zone.x + zone.w;
  }

  // Loot items on ground
  for (const item of es.loot) {
    if (item.taken) continue;
    const def = getItemDef(item.id);
    if (!def) continue;
    const sx = item.wx, sy = GROUND_Y - 6;
    fillRect(ctx, sx - 4, sy - 4, 8, 8, itemTypeColor(def.type), 0.9);
    strokeRect(ctx, sx - 4, sy - 4, 8, 8, C.border2);
    // Quantity
    if (item.qty > 1) drawText(ctx, String(item.qty), sx + 5, sy - 2, C.textDim, 6);
    // Hover label
    if (Math.abs(es.px - item.wx) < 30) {
      drawText(ctx, def.name, sx, sy - 12, C.textBright, 7, 'center');
    }
  }

  // Encounter markers (skull icon if not triggered)
  for (const enc of es.encounters) {
    if (!enc.triggered && Math.abs(es.px - enc.wx) > 50) {
      fillRect(ctx, enc.wx - 4, GROUND_Y - 16, 8, 8, '#3a1010');
      drawText(ctx, '⚠', enc.wx, GROUND_Y - 10, '#cc3333', 8, 'center');
    }
  }

  // Hunt spots
  for (const spot of es.huntSpots) {
    if (!spot.used) {
      fillRect(ctx, spot.wx - 4, GROUND_Y - 10, 8, 8, '#1a3a10');
      drawText(ctx, '🐾', spot.wx, GROUND_Y - 2, '#3a6a20', 7, 'center');
    }
  }

  // Player
  drawParent(ctx, es.px, PLAYER_FOOT, 2, es.facing, es.animFrame, gs.parent.gender);

  ctx.restore();

  // HUD overlay (not scrolled)
  drawExploreHUD(ctx, gs, es);

  // Stats panel (right side)
  drawStatsPanel(ctx, gs);

  // Notifications
  drawNotifications(ctx, gs);
}

// ── Explore HUD ───────────────────────────────────────────────────────────────

function drawExploreHUD(ctx, gs, es) {
  const loc = es.location;

  // Location name
  drawPanel(ctx, 6, 6, 200, 18, C.panelBg);
  drawText(ctx, loc.name, 12, 18, C.text, 8);

  // Zone indicator
  const curZone = loc.zones.find(z => es.px >= z.x && es.px < z.x + z.w);
  if (curZone) drawText(ctx, curZone.name, 12, 30, C.textDim, 7);

  // Pickup prompt
  const nearLoot = es.loot.find(item => !item.taken && Math.abs(es.px - item.wx) < 25);
  if (nearLoot) {
    const def = getItemDef(nearLoot.id);
    drawPanel(ctx, CFG.W/2 - 80, CFG.H - 60, 160, 20, C.panelBg);
    drawText(ctx, `[E] Pick up ${def?.name || nearLoot.id}`, CFG.W/2, CFG.H - 46, C.textBright, 8, 'center');
  }

  // Return prompt
  if (es.showReturnPrompt) {
    drawPanel(ctx, CFG.W/2 - 90, CFG.H - 80, 180, 20, C.panelBg);
    drawText(ctx, '[E] Return to shelter', CFG.W/2, CFG.H - 66, C.textBright, 8, 'center');
  }

  // Inventory weight
  const wt    = calcWeight(gs.parent.inventory).toFixed(1);
  const maxWt = parentMaxCarry().toFixed(1);
  const wtCol = parseFloat(wt) > parseFloat(maxWt) * 0.9 ? C.textWarn : C.textDim;
  drawText(ctx, `Carrying: ${wt}/${maxWt}kg`, 12, CFG.H - 38, wtCol, 8);

  // Return home button
  const mx = gs.mouse.x, my = gs.mouse.y;
  drawButton(ctx, 12, CFG.H - 55, 90, 16, 'Return Home',
    hitTest(mx, my, 12, CFG.H-55, 90, 16));
}

// ── Explore input ─────────────────────────────────────────────────────────────

function exploreKeyPress(key, gs) {
  if (!exploreState) return;
  const es = exploreState;

  if (key === 'e') {
    // Pick up nearby loot
    const near = es.loot.find(item => !item.taken && Math.abs(es.px - item.wx) < 25);
    if (near) {
      const def = getItemDef(near.id);
      const maxW = parentMaxCarry();
      const curW = calcWeight(gs.parent.inventory);
      const addW = def ? def.weight * near.qty : 0;
      if (curW + addW > maxW) {
        notify('Too heavy to carry.', 'warn');
        return;
      }
      addToInventory(gs.parent.inventory, near.id, near.qty);
      near.taken = true;
      addLog(`Picked up: ${def?.name || near.id} x${near.qty}`, 'good');
      return;
    }
    // Return home
    if (es.showReturnPrompt) {
      endExploration(gs);
      return;
    }
  }
  if (key === 'escape') {
    endExploration(gs);
  }
}

function exploreClick(mx, my, gs) {
  if (!exploreState) return;
  const es = exploreState;

  // Return Home button
  if (hitTest(mx, my, 12, CFG.H-55, 90, 16)) {
    endExploration(gs);
    return;
  }

  // Click on loot
  const worldX = mx + es.scrollX;
  const near = es.loot.find(item => !item.taken && Math.abs(worldX - item.wx) < 20 && Math.abs(my - GROUND_Y) < 30);
  if (near) {
    const def = getItemDef(near.id);
    const maxW = parentMaxCarry();
    const curW = calcWeight(gs.parent.inventory);
    const addW = def ? def.weight * near.qty : 0;
    if (curW + addW > maxW) { notify('Too heavy.', 'warn'); return; }
    addToInventory(gs.parent.inventory, near.id, near.qty);
    near.taken = true;
    addLog(`Picked up: ${def?.name || near.id} x${near.qty}`, 'good');
  }
}

// ── End exploration ───────────────────────────────────────────────────────────

function endExploration(gs) {
  const es = exploreState;
  if (!es) return;

  gs.parent.isExploring = false;
  gs.child.isAlone      = false;
  exploreState          = null;
  gs.screen             = 'shelter';

  // Random suspicion bump from leaving shelter
  gs.suspicion = clamp(gs.suspicion + randInt(2, 5), 0, CFG.SUSPICION_MAX);

  // Transfer some items automatically if no room in parent inv
  // (player is back at shelter so they can access storage)
  addLog(`Returned from ${es?.location?.name || 'exploration'}.`, 'info');
}
