// utils.js — Utility / drawing helpers
'use strict';

// ── Math ───────────────────────────────────────────────────────────────────

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function lerp(a, b, t)    { return a + (b - a) * t; }
function randInt(lo, hi)   { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }
function randFloat(lo, hi) { return Math.random() * (hi - lo) + lo; }
function randChoice(arr)   { return arr[Math.floor(Math.random() * arr.length)]; }
function chance(pct)       { return Math.random() * 100 < pct; }
function uid()             { return Math.random().toString(36).substr(2, 9); }

function formatTime(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

// ── Canvas draw helpers ────────────────────────────────────────────────────

/** Filled rectangle */
function fillRect(ctx, x, y, w, h, color, alpha) {
  if (alpha !== undefined && alpha !== 1) ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if (alpha !== undefined && alpha !== 1) ctx.globalAlpha = 1;
}

/** Stroked rectangle */
function strokeRect(ctx, x, y, w, h, color, lw) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw || 1;
  ctx.strokeRect(Math.round(x)+0.5, Math.round(y)+0.5, Math.round(w)-1, Math.round(h)-1);
}

/** Panel: dark fill + border */
function drawPanel(ctx, x, y, w, h, bg, border) {
  fillRect(ctx, x, y, w, h, bg || C.panelBg);
  strokeRect(ctx, x, y, w, h, border || C.border);
}

/** Simple text */
function drawText(ctx, str, x, y, color, size, align, bold) {
  ctx.fillStyle = color || C.text;
  ctx.font = `${bold ? 'bold ' : ''}${size || 10}px monospace`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, Math.round(x), Math.round(y));
  ctx.textAlign = 'left';
}

/** Text with drop-shadow / outline */
function drawTextShadow(ctx, str, x, y, color, outColor, size, align) {
  ctx.font = `${size || 10}px monospace`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = outColor || '#000';
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++)
      if (dx || dy) ctx.fillText(str, Math.round(x)+dx, Math.round(y)+dy);
  ctx.fillStyle = color || C.text;
  ctx.fillText(str, Math.round(x), Math.round(y));
  ctx.textAlign = 'left';
}

/**
 * Stat bar: [ ████░░░░ ]
 * Returns the rect so callers can check hover.
 */
function drawStatBar(ctx, x, y, w, h, value, maxVal, fillColor, label, showNum) {
  const pct = clamp(value / maxVal, 0, 1);
  fillRect(ctx, x, y, w, h, '#111118');
  fillRect(ctx, x, y, Math.round(w * pct), h, fillColor);
  strokeRect(ctx, x, y, w, h, C.border2);
  if (label) drawText(ctx, label, x + 2, y + h - 2, C.textDim, 7);
  if (showNum) {
    const numStr = `${Math.round(value)}`;
    drawText(ctx, numStr, x + w - ctx.measureText(numStr).width - 2, y + h - 2, C.textDim, 7);
  }
}

/** Wrap text into lines, returns array of strings */
function wrapText(ctx, str, maxW, size) {
  ctx.font = `${size || 10}px monospace`;
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Draw wrapped text, returns new Y after last line */
function drawWrapped(ctx, str, x, y, maxW, size, color, lh) {
  const lines = wrapText(ctx, str, maxW, size);
  ctx.fillStyle = color || C.text;
  ctx.font = `${size || 10}px monospace`;
  ctx.textBaseline = 'alphabetic';
  const lineH = lh || (size || 10) + 3;
  for (const line of lines) { ctx.fillText(line, Math.round(x), Math.round(y)); y += lineH; }
  return y;
}

/** Full-screen fade overlay */
function drawFade(ctx, alpha, color) {
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.fillStyle = color || '#000';
  ctx.fillRect(0, 0, CFG.W, CFG.H);
  ctx.globalAlpha = 1;
}

/** Horizontal divider line */
function drawDivider(ctx, x, y, w, color) {
  ctx.strokeStyle = color || C.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(x) + 0.5, Math.round(y) + 0.5);
  ctx.lineTo(Math.round(x + w) + 0.5, Math.round(y) + 0.5);
  ctx.stroke();
}

/** Small icon rect for item type */
function itemTypeColor(type) {
  const map = {
    food: C.food, water: C.water, medicine: C.medicine,
    weapon: C.weapon, material: C.material, ammo: C.ammo,
    backpack: C.backpack, tool: C.material, misc: C.material,
  };
  return map[type] || C.material;
}

/** Draw a button, returns true if mouse is over it */
function drawButton(ctx, x, y, w, h, label, hovered, active, disabled) {
  const bg = disabled ? '#0e0e14' : active ? C.btnActive : hovered ? C.btnHover : C.btnBg;
  const border = disabled ? C.border : hovered ? C.border2 : C.btnBorder;
  const txtColor = disabled ? C.textDim : hovered ? C.textBright : C.btnText;
  fillRect(ctx, x, y, w, h, bg);
  strokeRect(ctx, x, y, w, h, border);
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = txtColor;
  ctx.fillText(label, Math.round(x + w / 2), Math.round(y + h / 2));
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/** Hit-test: is point (px,py) inside rect? */
function hitTest(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

/** Deep clone via JSON */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
