// charCreate.js — Character creation screen
'use strict';

const ATTRS  = ['strength','agility','perception','intelligence','charisma'];
const SKILLS_LIST = ['scavenging','stealth','exploration','bartering','speech','lockpick','melee','firearms'];
const ATTR_DESCS = {
  strength:     'Carry weight, melee damage',
  agility:      'Speed, flee chance, dodge',
  perception:   'Detection, accuracy bonus',
  intelligence: 'Task speed, bonus skill pts',
  charisma:     'Speech, morale of others',
};
const SKILL_DESCS = {
  scavenging:   'Find more / better loot',
  stealth:      'Avoid AI detection, sneak',
  exploration:  'Navigate locations safely',
  bartering:    'Better trade prices',
  speech:       'Convince survivors, events',
  lockpick:     'Open locked areas',
  melee:        'Melee combat accuracy',
  firearms:     'Ranged accuracy & handling',
};

let CC_scroll = 0;

function initCharCreate() {
  GS.cc = {
    step: 0,
    gender: 'father',
    name: '',
    attrPts: 5,
    skillPts: 10,
    attrs:  { strength:5, agility:5, perception:5, intelligence:5, charisma:5 },
    skills: { scavenging:1, stealth:1, exploration:1, bartering:1, speech:1, lockpick:1, melee:1, firearms:1 },
    nameInputActive: false,
    hoveredItem: null,
  };
  CC_scroll = 0;
}

function renderCharCreate(ctx, gs) {
  fillRect(ctx, 0, 0, CFG.W, CFG.H, C.bg);

  const cc = gs.cc;
  const cx = CFG.W / 2;

  // Title
  drawText(ctx, 'CHARACTER CREATION', cx, 22, C.textBright, 13, 'center', true);
  drawDivider(ctx, 40, 28, CFG.W - 80, C.border2);

  // Step indicator
  const steps = ['Identity', 'Attributes', 'Skills'];
  let sx = cx - 90;
  for (let i = 0; i < steps.length; i++) {
    const active = i === cc.step;
    const col = active ? C.textBright : (i < cc.step ? C.textGood : C.textDim);
    drawText(ctx, `${i+1}. ${steps[i]}`, sx, 42, col, 8, 'left', active);
    sx += 65;
  }
  drawDivider(ctx, 40, 47, CFG.W - 80, C.border);

  if (cc.step === 0)      renderStep0(ctx, gs, cx);
  else if (cc.step === 1) renderStep1(ctx, gs, cx);
  else if (cc.step === 2) renderStep2(ctx, gs, cx);

  // Bottom navigation
  const mx = gs.mouse.x, my = gs.mouse.y;
  if (cc.step > 0) {
    drawButton(ctx, 40, CFG.H - 32, 80, 20, '< Back', hitTest(mx, my, 40, CFG.H-32, 80, 20));
  }
  const canNext = cc.step < 2 || (cc.attrPts === 0 && cc.skillPts === 0);
  const nextLabel = cc.step === 2 ? 'Begin →' : 'Next >';
  drawButton(ctx, CFG.W - 120, CFG.H - 32, 80, 20, nextLabel,
    hitTest(mx, my, CFG.W-120, CFG.H-32, 80, 20), false, cc.step === 0 && !cc.name.trim());
}

// ── Step 0: Gender & Name ─────────────────────────────────────────────────────

function renderStep0(ctx, gs, cx) {
  const cc = gs.cc;
  let y = 70;

  drawText(ctx, 'Choose your role:', cx, y, C.textDim, 9, 'center');
  y += 16;

  // Gender buttons
  const btnW = 100, btnH = 28;
  const fatherX = cx - btnW - 10, motherX = cx + 10;
  const mx = gs.mouse.x, my = gs.mouse.y;

  drawButton(ctx, fatherX, y, btnW, btnH, 'Father',
    hitTest(mx, my, fatherX, y, btnW, btnH), cc.gender === 'father');
  drawButton(ctx, motherX, y, btnW, btnH, 'Mother',
    hitTest(mx, my, motherX, y, btnW, btnH), cc.gender === 'mother');
  y += 40;

  // Parent sprite preview
  const sprScale = 3;
  drawParent(ctx, cx, y + 38, sprScale, 1, 0, cc.gender);
  y += 64;

  drawText(ctx, 'Your name:', cx, y + 10, C.textDim, 9, 'center');
  y += 16;

  // Name display area
  const nameW = 200, nameH = 20;
  const nameX = cx - nameW / 2;
  fillRect(ctx, nameX, y, nameW, nameH, '#0a0a14');
  strokeRect(ctx, nameX, y, nameW, nameH, cc.nameInputActive ? C.border2 : C.border);

  const displayName = cc.name || (cc.nameInputActive ? '' : 'Click to enter name');
  const nameColor = cc.name ? C.textBright : C.textDim;
  drawText(ctx, displayName, nameX + nameW/2, y + nameH - 5, nameColor, 10, 'center');
  if (cc.nameInputActive && Math.floor(Date.now() / 500) % 2 === 0) {
    ctx.font = '10px monospace';
    const nameW2 = ctx.measureText(cc.name).width;
    fillRect(ctx, nameX + nameW/2 + nameW2/2 + 2, y + 3, 6, 12, C.textDim);
  }
  y += 28;

  drawText(ctx, 'Your child is named Lily, 8 years old.', cx, y + 10, C.textDim, 8, 'center');
}

// ── Step 1: Attributes ────────────────────────────────────────────────────────

function renderStep1(ctx, gs, cx) {
  const cc = gs.cc;
  const mx = gs.mouse.x, my = gs.mouse.y;
  let y = 65;

  const ptsColor = cc.attrPts > 0 ? C.textWarn : C.textGood;
  drawText(ctx, `Points remaining: ${cc.attrPts}`, cx, y, ptsColor, 9, 'center', true);
  y += 16;

  for (const attr of ATTRS) {
    const val = cc.attrs[attr];
    const label = attr.charAt(0).toUpperCase() + attr.slice(1);

    // Row background
    const hov = hitTest(mx, my, 60, y - 2, CFG.W - 120, 22);
    if (hov) {
      fillRect(ctx, 60, y - 2, CFG.W - 120, 22, C.highlight);
      drawText(ctx, ATTR_DESCS[attr], cx, CFG.H - 50, C.textDim, 8, 'center');
    }

    drawText(ctx, label, 70, y + 12, C.text, 9);

    // Minus button
    const minX = CFG.W/2 - 50, plusX = CFG.W/2 + 28;
    drawButton(ctx, minX, y, 18, 18, '−', hitTest(mx, my, minX, y, 18, 18), false, val <= 1);
    drawText(ctx, String(val), cx, y + 12, val >= 8 ? C.textGood : C.textBright, 10, 'center', true);
    drawButton(ctx, plusX, y, 18, 18, '+', hitTest(mx, my, plusX, y, 18, 18), false, cc.attrPts <= 0 || val >= 10);

    y += 26;
  }
}

// ── Step 2: Skills ────────────────────────────────────────────────────────────

function renderStep2(ctx, gs, cx) {
  const cc = gs.cc;
  const mx = gs.mouse.x, my = gs.mouse.y;
  let y = 65;

  const ptsColor = cc.skillPts > 0 ? C.textWarn : C.textGood;
  drawText(ctx, `Skill points: ${cc.skillPts}`, cx, y, ptsColor, 9, 'center', true);
  y += 14;
  drawText(ctx, '(All skills start at 1, max 10)', cx, y, C.textDim, 7, 'center');
  y += 14;

  for (const skill of SKILLS_LIST) {
    const val = cc.skills[skill];
    const label = skill.charAt(0).toUpperCase() + skill.slice(1);

    const hov = hitTest(mx, my, 60, y - 2, CFG.W - 120, 20);
    if (hov) {
      fillRect(ctx, 60, y - 2, CFG.W - 120, 20, C.highlight);
      drawText(ctx, SKILL_DESCS[skill], cx, CFG.H - 50, C.textDim, 8, 'center');
    }

    drawText(ctx, label, 70, y + 11, C.text, 9);

    // Pips
    for (let p = 0; p < 10; p++) {
      const px = CFG.W/2 - 50 + p * 13;
      fillRect(ctx, px, y + 3, 11, 11, p < val ? '#3a6a3a' : '#151520');
      strokeRect(ctx, px, y + 3, 11, 11, p < val ? '#5a9a5a' : C.border);
    }

    const minX = CFG.W - 80, plusX = CFG.W - 58;
    drawButton(ctx, minX, y, 18, 18, '−', hitTest(mx, my, minX, y, 18, 18), false, val <= 1);
    drawButton(ctx, plusX, y, 18, 18, '+', hitTest(mx, my, plusX, y, 18, 18), false, cc.skillPts <= 0 || val >= 10);

    y += 24;
  }
}

// ── Input handlers ─────────────────────────────────────────────────────────────

function charCreateClick(mx, my, gs) {
  const cc = gs.cc;
  const cx = CFG.W / 2;

  // Navigation
  const nextDisabled = cc.step === 0 && !cc.name.trim();
  if (hitTest(mx, my, CFG.W - 120, CFG.H - 32, 80, 20) && !nextDisabled) {
    if (cc.step < 2) {
      cc.step++;
    } else {
      // Finalize character
      finalizeCharacter(gs);
      return;
    }
  }
  if (cc.step > 0 && hitTest(mx, my, 40, CFG.H - 32, 80, 20)) cc.step--;

  if (cc.step === 0) {
    // Gender (renderStep0: y starts at 70, then +16 for text, so buttons at y=86)
    const btnW = 100, btnH = 28;
    const fatherX = cx - btnW - 10;
    const motherX = cx + 10;
    const genderBtnY = 86;
    if (hitTest(mx, my, fatherX, genderBtnY, btnW, btnH)) cc.gender = 'father';
    if (hitTest(mx, my, motherX, genderBtnY, btnW, btnH)) cc.gender = 'mother';

    // Name input (Y = 86+40+60+16 = 202)
    const nameW = 200, nameH = 20;
    const nameX = cx - nameW / 2;
    const nameY = 202;
    if (hitTest(mx, my, nameX, nameY, nameW, nameH)) {
      cc.nameInputActive = true;
      showNameInput(gs);
    }
  }

  if (cc.step === 1) {
    for (const attr of ATTRS) {
      const rowY = 81 + ATTRS.indexOf(attr) * 26;
      const minX = CFG.W/2 - 50, plusX = CFG.W/2 + 28;
      if (hitTest(mx, my, minX, rowY, 18, 18) && cc.attrs[attr] > 1) {
        cc.attrs[attr]--; cc.attrPts++;
      }
      if (hitTest(mx, my, plusX, rowY, 18, 18) && cc.attrPts > 0 && cc.attrs[attr] < 10) {
        cc.attrs[attr]++; cc.attrPts--;
      }
    }
  }

  if (cc.step === 2) {
    for (let si = 0; si < SKILLS_LIST.length; si++) {
      const skill = SKILLS_LIST[si];
      const rowY = 93 + si * 24;
      const minX = CFG.W - 80, plusX = CFG.W - 58;
      if (hitTest(mx, my, minX, rowY, 18, 18) && cc.skills[skill] > 1) {
        cc.skills[skill]--; cc.skillPts++;
      }
      if (hitTest(mx, my, plusX, rowY, 18, 18) && cc.skillPts > 0 && cc.skills[skill] < 10) {
        cc.skills[skill]++; cc.skillPts--;
      }
    }
  }
}

function showNameInput(gs) {
  const wrap = document.getElementById('name-input-wrap');
  const inp  = document.getElementById('name-input');
  wrap.style.display = 'block';
  inp.value = gs.cc.name;
  inp.focus();
  inp.oninput = () => { gs.cc.name = inp.value; };
  inp.onblur  = () => { wrap.style.display = 'none'; gs.cc.nameInputActive = false; };
  inp.onkeydown = (e) => { if (e.key === 'Enter') inp.blur(); };
}

function finalizeCharacter(gs) {
  const cc = gs.cc;
  Object.assign(gs.parent, {
    name:    cc.name.trim() || (cc.gender === 'father' ? 'David' : 'Sarah'),
    gender:  cc.gender,
    strength: cc.attrs.strength, agility: cc.attrs.agility,
    perception: cc.attrs.perception, intelligence: cc.attrs.intelligence,
    charisma:   cc.attrs.charisma,
    skills:  { ...cc.skills },
  });

  // Starting inventory based on skills
  const inv = gs.parent.inventory;
  addToInventory(inv, 'canned_beans', 3);
  addToInventory(inv, 'water_bottle', 2);
  addToInventory(inv, 'bandage', 2);
  if (cc.skills.melee >= 4)    addToInventory(inv, 'knife', 1);
  if (cc.skills.firearms >= 4) { addToInventory(inv, 'pistol', 1); addToInventory(inv, 'pistol_ammo', 8); }

  // Shelter starting storage
  const storage = gs.shelter.storage;
  addToInventory(storage, 'canned_beans', 5);
  addToInventory(storage, 'canned_soup',  3);
  addToInventory(storage, 'water_bottle', 4);
  addToInventory(storage, 'wood', 6);
  addToInventory(storage, 'metal', 4);
  addToInventory(storage, 'cloth', 3);
  addToInventory(storage, 'matches', 2);

  setScreen('shelter');
  addLog(`Day 1. ${gs.parent.name} and Lily are hiding below ground. Supplies are running low.`, 'info');
}
