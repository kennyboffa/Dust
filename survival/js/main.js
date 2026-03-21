// main.js — Entry point, game loop, input routing
'use strict';

// ── Canvas setup ──────────────────────────────────────────────────────────────

const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

let SCALE = 1;

function resizeCanvas() {
  const ww = window.innerWidth, wh = window.innerHeight;
  SCALE = Math.min(ww / CFG.W, wh / CFG.H);
  canvas.width  = CFG.W;
  canvas.height = CFG.H;
  canvas.style.width  = Math.floor(CFG.W * SCALE) + 'px';
  canvas.style.height = Math.floor(CFG.H * SCALE) + 'px';
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ── Input handling ────────────────────────────────────────────────────────────

function canvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / SCALE,
    y: (e.clientY - rect.top)  / SCALE,
  };
}

canvas.addEventListener('mousemove', (e) => {
  const { x, y } = canvasCoords(e);
  GS.mouse.x = x;
  GS.mouse.y = y;
});

canvas.addEventListener('mousedown', (e) => {
  const { x, y } = canvasCoords(e);
  GS.mouse.down   = true;
  GS.mouse.clickX = x;
  GS.mouse.clickY = y;
});

canvas.addEventListener('mouseup', (e) => {
  const { x, y } = canvasCoords(e);
  GS.mouse.down    = false;
  GS.mouse.clicked = true;
  GS.mouse.clickX  = x;
  GS.mouse.clickY  = y;
});

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  GS.keys[key] = true;

  // Don't swallow typing in name input
  if (document.getElementById('name-input') === document.activeElement) return;

  handleKeyPress(key);
});

window.addEventListener('keyup', (e) => {
  GS.keys[e.key.toLowerCase()] = false;
});

function handleKeyPress(key) {
  if (key === 'enter' || key === ' ') {
    if (GS.screen === 'intro')      { introAdvance(); return; }
    if (GS.screen === 'gameOver')   { resetGame(); return; }
  }

  if (GS.screen === 'explore') {
    exploreKeyPress(key, GS);
    return;
  }

  if (GS.screen === 'event') {
    if (key >= '1' && key <= '9') {
      const idx = parseInt(key) - 1;
      const ev  = GS.event;
      if (ev && ev.choices && idx < ev.choices.length && !eventUI.resultText) {
        const choice = ev.choices[idx];
        const result = choice.action(GS);
        eventUI.resultText  = result || '';
        eventUI.resultTimer = 180;
      }
    }
    if (key === 'enter' && eventUI.resultText) closeEvent(GS);
    return;
  }

  if (GS.screen === 'shelter') {
    if (key === 'e') {
      // Feed Lily if hungry
      if (GS.child.hunger > 50) {
        const foodId = ['heated_beans','heated_soup','canned_beans','cooked_meat','canned_soup']
          .find(id => countInInventory(GS.shelter.storage, id) > 0);
        if (foodId) {
          removeFromInventory(GS.shelter.storage, foodId, 1);
          const def = getItemDef(foodId);
          GS.child.hunger = clamp(GS.child.hunger + (def.hunger || -20), 0, 100);
          notify(`Fed Lily: ${def.name}`, 'good');
        }
      }
    }
  }
}

// ── Main game loop ────────────────────────────────────────────────────────────

let lastTime   = 0;
let frameCount = 0;
const TARGET_FPS = 60;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = timestamp;
  frameCount++;

  // Clear
  ctx.clearRect(0, 0, CFG.W, CFG.H);
  ctx.imageSmoothingEnabled = false;

  // Update & render
  update(dt);
  render(ctx);

  // Reset click state
  GS.mouse.clicked = false;

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  const gs = GS;

  // Day transition takes priority
  if (gs.dayFade.active) return;

  // Stats tick (only in shelter/explore — not during events or combat transitions)
  if (!gs.paused && (gs.screen === 'shelter' || gs.screen === 'explore')) {
    tickStats(gs, dt);
  }

  // Screen-specific update
  if (gs.screen === 'intro')      updateIntro(dt);
  if (gs.screen === 'explore')    updateExplore(gs, dt);

  // Shelter ambient events
  if (gs.screen === 'shelter') {
    maybeFireShelterEvent(gs);
    // Auto feed when parent is not exploring (simple AI)
    autoFeedLogic(gs);
  }

  // Handle pending click
  if (gs.mouse.clicked) {
    handleClick(gs.mouse.clickX, gs.mouse.clickY, gs);
  }
}

function render(ctx) {
  const gs = GS;

  switch (gs.screen) {
    case 'intro':
      renderIntro(ctx, gs);
      break;
    case 'charCreate':
      renderCharCreate(ctx, gs);
      break;
    case 'shelter':
      renderShelter(ctx, gs);
      break;
    case 'explore':
      renderExplore(ctx, gs);
      break;
    case 'combat':
      renderCombat(ctx, gs);
      break;
    case 'event':
      renderEvent(ctx, gs);
      break;
    case 'gameOver':
      renderGameOver(ctx, gs);
      break;
    default:
      fillRect(ctx, 0, 0, CFG.W, CFG.H, C.bg);
  }
}

function renderGameOver(ctx, gs) {
  drawGameOver(ctx, gs);
}

// ── Click routing ─────────────────────────────────────────────────────────────

function handleClick(mx, my, gs) {
  // Day transition / game over
  if (gs.dayFade.active) return;

  switch (gs.screen) {
    case 'intro':
      introAdvance();
      break;
    case 'charCreate':
      charCreateClick(mx, my, gs);
      break;
    case 'shelter':
      shelterClick(mx, my, gs);
      break;
    case 'explore':
      exploreClick(mx, my, gs);
      break;
    case 'combat':
      combatClick(mx, my, gs);
      break;
    case 'event':
      eventClick(mx, my, gs);
      break;
    case 'gameOver': {
      const bx = CFG.W/2 - 55, by = 200;
      if (hitTest(mx, my, bx, by, 110, 24)) resetGame();
      break;
    }
  }
}

// ── Auto feed logic (basic needs management hint) ─────────────────────────────

function autoFeedLogic(gs) {
  // Auto feed Lily if parent is present, storage has food, lily is hungry
  if (gs.parent.isExploring) return;
  const ch = gs.child;
  if (ch.hunger >= 70) {
    const foodOrder = ['heated_beans','heated_soup','cooked_meat','cooked_soup',
                       'canned_beans','canned_soup','canned_meat','energy_bar'];
    for (const fid of foodOrder) {
      if (countInInventory(gs.shelter.storage, fid) > 0) {
        removeFromInventory(gs.shelter.storage, fid, 1);
        const def = getItemDef(fid);
        ch.hunger    = clamp(ch.hunger    + (def.hunger    || -20), 0, 100);
        ch.thirst    = clamp(ch.thirst    + (def.thirst    ||   0), 0, 100);
        ch.depression= clamp(ch.depression+ (def.depression||   0), 0, 100);
        notify(`Lily ate ${def.name}.`, 'good');
        break;
      }
    }
  }
  // Auto drink for lily
  if (ch.thirst >= 70) {
    const waterOrder = ['purified_water','water_bottle','dirty_water'];
    for (const wid of waterOrder) {
      if (countInInventory(gs.shelter.storage, wid) > 0) {
        removeFromInventory(gs.shelter.storage, wid, 1);
        const def = getItemDef(wid);
        ch.thirst = clamp(ch.thirst + (def.thirst || -28), 0, 100);
        ch.health = clamp(ch.health + (def.health || 0), 0, ch.maxHealth);
        notify(`Lily drank ${def.name}.`, 'good');
        break;
      }
    }
  }
}

// ── Game reset ────────────────────────────────────────────────────────────────

function resetGame() {
  // Reset state
  Object.assign(GS, {
    screen: 'intro',
    day: 1,
    time: CFG.DAY_START,
    paused: false,
    parent: {
      name:'Alex', gender:'father',
      health:100, maxHealth:100,
      hunger:20, thirst:20, tiredness:20, depression:15,
      infected:false,
      strength:5, agility:5, perception:5, intelligence:5, charisma:5,
      skills:{scavenging:1,stealth:1,exploration:1,bartering:1,speech:1,lockpick:1,melee:1,firearms:1},
      inventory:[], backpackId:null,
      equipped:{weapon:null,armor:null},
      ammo:{pistol:0,rifle:0,shotgun:0},
      loaded:{pistol:0,rifle:0,shotgun:0},
      isExploring:false, isSleeping:false, isWorking:false,
      task:null, taskProgress:0, taskDuration:0,
      x:115, y:0, facing:1, animFrame:0, animTimer:0,
    },
    child: {
      name:'Lily', health:80, maxHealth:80,
      hunger:20, thirst:20, tiredness:25, depression:15,
      isAlone:false, infected:false,
      x:65, y:0, facing:1, animFrame:0, animTimer:0,
    },
    survivors: [],
    shelter: {
      rooms: [
        {id:'main',     unlocked:true,  level:1, building:false, buildProgress:0},
        {id:'bedroom',  unlocked:false, level:0, building:false, buildProgress:0},
        {id:'storage',  unlocked:false, level:0, building:false, buildProgress:0},
        {id:'workshop', unlocked:false, level:0, building:false, buildProgress:0},
        {id:'infirmary',unlocked:false, level:0, building:false, buildProgress:0},
        {id:'security', unlocked:false, level:0, building:false, buildProgress:0},
      ],
      storage:[], storageMax:80, defenseLevel:0,
      hasWaterFilter:false, hasGenerator:false, hasRadioDampener:false,
      campfire:false, noiseBudget:100, noiseToday:0,
    },
    dog:null, suspicion:10,
    explore:null, combat:null, event:null,
    flags:{dogEncountered:false,dogRescued:false,firstExplore:false,traderMet:false},
    log:[], notifications:[],
    dayFade:{active:false,alpha:0,phase:'out',timer:0},
    mouse:{x:0,y:0,down:false,clicked:false,clickX:0,clickY:0},
    keys:{},
    gameOverReason: '',
  });
  initIntro();
  // Reset shelter UI
  shelterUI.activeMenu   = null;
  shelterUI.selectedRoom = null;
  // Reset event UI
  eventUI.resultText  = null;
  eventUI.resultTimer = 0;
}

// ── Boot ──────────────────────────────────────────────────────────────────────

initIntro();
requestAnimationFrame(gameLoop);
