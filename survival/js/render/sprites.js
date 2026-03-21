// sprites.js — Pixel art character and environment drawing
'use strict';

// ── Character sprites ─────────────────────────────────────────────────────────
// All sprites drawn at "natural" 1px = 1 logical px scale.
// Caller passes ctx with appropriate transform/scale.

function drawParent(ctx, x, y, s, facing, animFrame, gender) {
  // s = scale factor (e.g. 2 for shelter view)
  // facing: 1=right, -1=left
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (facing < 0) { ctx.scale(-1, 1); }

  const sk = gender === 'mother' ? '#c49878' : C.skin;
  const clothes = gender === 'mother' ? '#3a3a50' : '#2e3828';
  const hair    = C.hair;
  const pants   = gender === 'mother' ? '#1e1e30' : '#1e2218';

  // Walking animation: leg offset
  const legSwing = (animFrame % 2 === 0) ? 0 : 1;

  // Head
  fillRect(ctx, -4*s, -18*s, 8*s, 8*s, sk);
  // Hair (top)
  fillRect(ctx, -4*s, -18*s, 8*s, 2*s, hair);
  // Eyes
  fillRect(ctx, -2*s, -14*s, 1*s, 1*s, '#111');
  fillRect(ctx,  1*s, -14*s, 1*s, 1*s, '#111');
  // Neck
  fillRect(ctx, -1*s, -10*s, 2*s, 2*s, sk);
  // Torso
  fillRect(ctx, -4*s, -8*s, 8*s, 7*s, clothes);
  // Arms
  fillRect(ctx, -6*s, -8*s,  2*s, 5*s, clothes);
  fillRect(ctx,  4*s, -8*s,  2*s, 5*s, clothes);
  // Hands
  fillRect(ctx, -6*s, -3*s,  2*s, 2*s, sk);
  fillRect(ctx,  4*s, -3*s,  2*s, 2*s, sk);
  // Legs
  fillRect(ctx, -4*s, -1*s, 3*s, 6*s + legSwing*s, pants);
  fillRect(ctx,  1*s, -1*s, 3*s, 6*s - legSwing*s, pants);
  // Feet
  fillRect(ctx, -4*s,  5*s + legSwing*s, 3*s, 2*s, '#222');
  fillRect(ctx,  1*s,  5*s - legSwing*s, 3*s, 2*s, '#222');

  ctx.restore();
}

function drawChild(ctx, x, y, s, facing, animFrame) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (facing < 0) { ctx.scale(-1, 1); }

  const sk   = '#d4a070';
  const dress = '#3a2a40';
  const hair  = '#301808';
  const leg   = (animFrame % 2 === 0) ? 0 : 1;

  // Head (bigger proportion for child)
  fillRect(ctx, -3*s, -14*s, 7*s, 7*s, sk);
  // Hair
  fillRect(ctx, -3*s, -14*s, 7*s, 2*s, hair);
  fillRect(ctx,  3*s, -13*s, 1*s, 4*s, hair); // side
  // Eyes
  fillRect(ctx, -1*s, -10*s, 1*s, 1*s, '#181830');
  fillRect(ctx,  2*s, -10*s, 1*s, 1*s, '#181830');
  // Neck
  fillRect(ctx,  0,   -7*s, 2*s, 2*s, sk);
  // Torso (dress)
  fillRect(ctx, -3*s, -5*s, 7*s, 5*s, dress);
  // Arms
  fillRect(ctx, -5*s, -5*s, 2*s, 4*s, sk);
  fillRect(ctx,  3*s, -5*s, 2*s, 4*s, sk);
  // Legs
  fillRect(ctx, -3*s,  0,   3*s, 5*s + leg*s, '#2a1a2e');
  fillRect(ctx,  1*s,  0,   3*s, 5*s - leg*s, '#2a1a2e');
  // Feet
  fillRect(ctx, -3*s,  5*s + leg*s, 3*s, 2*s, '#201020');
  fillRect(ctx,  1*s,  5*s - leg*s, 3*s, 2*s, '#201020');

  ctx.restore();
}

function drawSurvivor(ctx, x, y, s, facing, animFrame, idx) {
  // Slightly different colours per idx
  const clothColors = ['#2a3828','#282a38','#382820','#283030'];
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (facing < 0) { ctx.scale(-1, 1); }

  const sk  = C.skin;
  const cl  = clothColors[idx % clothColors.length];
  const leg = (animFrame % 2 === 0) ? 0 : 1;

  fillRect(ctx, -4*s, -18*s, 8*s, 8*s, sk);
  fillRect(ctx, -4*s, -18*s, 8*s, 2*s, C.hair);
  fillRect(ctx, -4*s, -8*s, 8*s, 7*s, cl);
  fillRect(ctx, -6*s, -8*s, 2*s, 5*s, cl);
  fillRect(ctx,  4*s, -8*s, 2*s, 5*s, cl);
  fillRect(ctx, -4*s, -1*s, 3*s, 6*s + leg*s, '#222');
  fillRect(ctx,  1*s, -1*s, 3*s, 6*s - leg*s, '#222');
  fillRect(ctx, -4*s,  5*s + leg*s, 3*s, 2*s, '#1a1a1a');
  fillRect(ctx,  1*s,  5*s - leg*s, 3*s, 2*s, '#1a1a1a');
  ctx.restore();
}

function drawDog(ctx, x, y, s, facing, animFrame) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (facing < 0) { ctx.scale(-1, 1); }

  const fur = '#6b4a2a';
  const dark = '#3a2810';
  const leg = (animFrame % 2 === 0) ? 0 : 1;

  // Body
  fillRect(ctx, -6*s, -6*s, 12*s, 5*s, fur);
  // Head
  fillRect(ctx,  4*s, -9*s, 5*s, 5*s, fur);
  // Snout
  fillRect(ctx,  8*s, -7*s, 3*s, 2*s, dark);
  // Ears
  fillRect(ctx,  4*s, -11*s, 2*s, 3*s, dark);
  // Tail
  fillRect(ctx, -8*s, -8*s, 2*s, 4*s, fur);
  // Legs (4)
  fillRect(ctx, -4*s, -1*s, 2*s, 3*s + leg*s, dark);
  fillRect(ctx, -1*s, -1*s, 2*s, 3*s - leg*s, dark);
  fillRect(ctx,  2*s, -1*s, 2*s, 3*s + leg*s, dark);
  fillRect(ctx,  5*s, -1*s, 2*s, 3*s - leg*s, dark);
  ctx.restore();
}

// ── Enemy sprites ─────────────────────────────────────────────────────────────

function drawDroneSprite(ctx, x, y, s, animFrame) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  const body = '#2a2e36';
  const glow = '#60a0cc';
  const dark = '#181c22';
  // Hover animation
  const hover = Math.sin(animFrame * 0.15) * 2 * s;

  ctx.translate(0, hover);
  // Main body (hexagonal-ish)
  fillRect(ctx, -6*s, -4*s, 12*s, 8*s, body);
  fillRect(ctx, -4*s, -6*s, 8*s, 12*s, body);
  // Eye / sensor (glowing)
  fillRect(ctx, -2*s, -2*s, 4*s, 4*s, glow, 0.9);
  fillRect(ctx,  0,   -1*s, 2*s, 2*s, '#c0e0ff', 0.8);
  // Rotors
  fillRect(ctx, -12*s, -2*s, 4*s, 1*s, dark);
  fillRect(ctx,  8*s, -2*s, 4*s, 1*s, dark);
  fillRect(ctx, -2*s, -10*s, 1*s, 4*s, dark);
  fillRect(ctx,  1*s, -10*s, 1*s, 4*s, dark);
  ctx.restore();
}

function drawRobotSprite(ctx, x, y, s, facing) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (facing < 0) ctx.scale(-1, 1);

  const body = '#303840';
  const head = '#252c34';
  const eye  = '#cc2020';
  const leg  = '#202830';

  // Head
  fillRect(ctx, -5*s, -24*s, 10*s, 8*s, head);
  fillRect(ctx, -3*s, -21*s, 5*s, 3*s, eye, 0.9);
  // Torso
  fillRect(ctx, -6*s, -16*s, 12*s, 10*s, body);
  // Arms
  fillRect(ctx, -9*s, -15*s, 3*s, 8*s, body);
  fillRect(ctx,  6*s, -15*s, 3*s, 8*s, body);
  // Lower body
  fillRect(ctx, -5*s, -6*s, 10*s, 4*s, body);
  // Legs
  fillRect(ctx, -5*s, -2*s, 4*s, 8*s, leg);
  fillRect(ctx,  1*s, -2*s, 4*s, 8*s, leg);
  // Feet
  fillRect(ctx, -6*s, 6*s, 5*s, 2*s, leg);
  fillRect(ctx,  1*s, 6*s, 5*s, 2*s, leg);
  ctx.restore();
}

function drawHumanEnemy(ctx, x, y, s, facing, animFrame) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (facing < 0) ctx.scale(-1, 1);

  const sk  = '#a07040';
  const cl  = '#3a2020';
  const leg = (animFrame % 2 === 0) ? 0 : 1;

  fillRect(ctx, -4*s, -18*s, 8*s, 8*s, sk);
  fillRect(ctx, -4*s, -18*s, 8*s, 2*s, '#1a1008');
  // Angry eyes
  fillRect(ctx, -2*s, -13*s, 2*s, 1*s, '#1a0808');
  fillRect(ctx,  1*s, -13*s, 2*s, 1*s, '#1a0808');
  fillRect(ctx, -4*s,  -8*s, 8*s, 7*s, cl);
  fillRect(ctx, -6*s,  -8*s, 2*s, 5*s, cl);
  fillRect(ctx,  4*s,  -8*s, 2*s, 5*s, cl);
  fillRect(ctx, -4*s,  -1*s, 3*s, 6*s + leg*s, '#201818');
  fillRect(ctx,  1*s,  -1*s, 3*s, 6*s - leg*s, '#201818');
  fillRect(ctx, -4*s,   5*s + leg*s, 3*s, 2*s, '#161010');
  fillRect(ctx,  1*s,   5*s - leg*s, 3*s, 2*s, '#161010');
  // Weapon hint
  fillRect(ctx,  4*s,  -6*s, 4*s, 1*s, '#4a4a3a');
  ctx.restore();
}

function drawWolfSprite(ctx, x, y, s, facing, animFrame) {
  drawDog(ctx, x, y, s, facing, animFrame); // reuse dog, slightly different call
}

// ── Environment / shelter tiles ───────────────────────────────────────────────

function drawRoomInterior(ctx, x, y, w, h, unlocked, selected) {
  const bg = unlocked ? C.floor : C.bg;
  const wall = unlocked ? C.wallLight : C.border;

  // Floor
  fillRect(ctx, x, y, w, h, bg);

  // Wall details (brick-like pattern)
  if (unlocked) {
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ffffff';
    for (let gy = 0; gy < h; gy += 8) {
      const offset = (Math.floor(gy / 8) % 2) * 12;
      for (let gx = offset; gx < w; gx += 24) {
        ctx.fillRect(Math.round(x + gx), Math.round(y + gy), 22, 7);
      }
    }
    ctx.globalAlpha = 1;
  }

  // Border
  const borderColor = selected ? '#6a8a6a' : (unlocked ? C.border2 : C.border);
  strokeRect(ctx, x, y, w, h, borderColor, selected ? 2 : 1);

  // Top highlight line
  if (unlocked) {
    ctx.strokeStyle = C.wallLight;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(x)+1, Math.round(y)+1);
    ctx.lineTo(Math.round(x+w)-1, Math.round(y)+1);
    ctx.stroke();
  }
}

function drawSurface(ctx, scrollOffset) {
  const H = CFG.SURFACE_H;
  const W = CFG.W - CFG.PANEL_W;

  // Sky gradient
  fillRect(ctx, 0, 0, W, H, C.sky);
  fillRect(ctx, 0, H * 0.4, W, H * 0.6, C.sky2);

  // Distant building silhouettes
  ctx.globalAlpha = 0.35;
  const buildings = [
    { x: 20, w: 40, h: 55 }, { x: 70, w: 30, h: 45 }, { x: 105, w: 50, h: 65 },
    { x: 160, w: 35, h: 40 }, { x: 200, w: 60, h: 70 }, { x: 265, w: 25, h: 35 },
    { x: 295, w: 45, h: 55 }, { x: 345, w: 20, h: 30 }, { x: 370, w: 55, h: 60 },
    { x: 430, w: 30, h: 42 },
  ];
  ctx.fillStyle = '#14141a';
  const so = (scrollOffset * 0.05) % W;
  for (const b of buildings) {
    const bx = ((b.x - so) % (W + 100) + W + 100) % (W + 100) - 50;
    ctx.fillRect(Math.round(bx), Math.round(H - b.h), Math.round(b.w), Math.round(b.h));
    // Windows (some lit faintly)
    ctx.fillStyle = '#202028';
    for (let wi = 4; wi < b.w - 4; wi += 8) {
      for (let wj = 8; wj < b.h - 6; wj += 10) {
        ctx.fillRect(Math.round(bx + wi), Math.round(H - b.h + wj), 4, 5);
      }
    }
    ctx.fillStyle = '#14141a';
  }
  ctx.globalAlpha = 1;

  // Ground line / dirt
  fillRect(ctx, 0, H - 4, W, 4, C.dirt);
  fillRect(ctx, 0, H - 2, W, 2, C.dirt2);

  // Debris / rocks
  ctx.fillStyle = C.concrete;
  ctx.globalAlpha = 0.4;
  const debris = [15, 80, 150, 230, 310, 390, 460];
  for (const dx of debris) {
    const px = ((dx - so * 0.2) % (W + 60) + W + 60) % (W + 60) - 30;
    ctx.fillRect(Math.round(px), H - 5, 6, 3);
  }
  ctx.globalAlpha = 1;
}

// Draw the shelter entrance / hatch on surface
function drawHatch(ctx, x, y) {
  fillRect(ctx, x - 12, y - 2, 24, 4, C.metal);
  fillRect(ctx, x - 10, y - 1, 20, 2, C.metalLight);
  // Handle
  fillRect(ctx, x - 2, y - 3, 4, 1, C.metalLight);
}

// Underground dirt/earth fill
function drawEarth(ctx, x, y, w, h) {
  fillRect(ctx, x, y, w, h, C.dirt);
  // Texture dots
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#ffffff';
  for (let ey = y; ey < y + h; ey += 6) {
    for (let ex = x; ex < x + w; ex += 10) {
      if ((ex + ey) % 20 < 10) ctx.fillRect(Math.round(ex), Math.round(ey), 2, 2);
    }
  }
  ctx.globalAlpha = 1;
}

// ── Exploration environment ───────────────────────────────────────────────────

function drawExploreBackground(ctx, scrollX, zone, worldH) {
  const W = CFG.W;
  const H = worldH;

  // Sky
  fillRect(ctx, 0, 0, W, H * 0.45, C.sky);
  // Ground
  fillRect(ctx, 0, H * 0.45, W, H * 0.55, C.ground);

  // Distant silhouettes (parallax 0.2)
  const px = -(scrollX * 0.2) % (W * 2);
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#12121a';
  const bdata = [0,55,80,45, 90,60,50,50, 155,70,60,55, 220,50,40,60, 265,65,55,45, 320,80,40,65];
  for (let i = 0; i < bdata.length; i += 4) {
    const bx = ((bdata[i] + W - px % W) % (W * 2));
    ctx.fillRect(Math.round(bx - W), bdata[i+3], bdata[i+2], bdata[i+1]);
    ctx.fillRect(Math.round(bx), bdata[i+3], bdata[i+2], bdata[i+1]);
  }
  ctx.globalAlpha = 1;

  // Ground texture
  fillRect(ctx, 0, Math.round(H * 0.45), W, 3, C.dirt2);
}

function drawExploreBuilding(ctx, bx, by, bw, bh, label) {
  // Building exterior (relative to world coords, caller applies offset)
  fillRect(ctx, bx, by, bw, bh, C.wall);
  fillRect(ctx, bx, by, bw, 4, C.wallLight);  // roofline

  // Windows
  const winW = 16, winH = 12, winGap = 24;
  for (let wx = bx + 12; wx < bx + bw - winW; wx += winGap) {
    fillRect(ctx, wx, by + 8, winW, winH, '#0a0e14');
    // Occasional lit window
    if (chance(15)) fillRect(ctx, wx + 2, by + 10, winW - 4, winH - 4, '#181a10', 0.5);
    strokeRect(ctx, wx, by + 8, winW, winH, '#1c2028');
  }

  // Door
  const doorX = bx + Math.floor(bw / 2) - 8;
  fillRect(ctx, doorX, by + bh - 24, 16, 24, '#0a0808');
  strokeRect(ctx, doorX, by + bh - 24, 16, 24, C.border2);

  // Label
  if (label) {
    drawText(ctx, label, bx + bw / 2, by - 4, C.textDim, 8, 'center');
  }
}
