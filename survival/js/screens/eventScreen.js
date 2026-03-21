// eventScreen.js — Text-based random event screen
'use strict';

const eventUI = {
  resultText:  null,
  resultTimer: 0,
};

function renderEvent(ctx, gs) {
  if (!gs.event) return;
  const ev = gs.event;

  // Dark overlay background
  fillRect(ctx, 0, 0, CFG.W, CFG.H, '#060609');

  // Grain effect
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 300; i++) {
    ctx.fillRect(Math.random() * CFG.W | 0, Math.random() * CFG.H | 0, 1, 1);
  }
  ctx.globalAlpha = 1;

  const panW = CFG.W - 100;
  const panX = 50;
  const panY = 25;
  const panH = CFG.H - 50;

  drawPanel(ctx, panX, panY, panW, panH, C.panelBg, C.border2);

  // Title bar
  fillRect(ctx, panX, panY, panW, 20, '#0a0a18');
  drawText(ctx, ev.title, panX + panW / 2, panY + 14, C.textBright, 11, 'center', true);
  drawDivider(ctx, panX + 4, panY + 20, panW - 8, C.border2);

  // Event body text
  let textY = panY + 36;
  textY = drawWrapped(ctx, ev.text, panX + 14, textY, panW - 28, 9, C.text, 14);

  textY += 10;
  drawDivider(ctx, panX + 4, textY, panW - 8, C.border);
  textY += 10;

  const mx = gs.mouse.x, my = gs.mouse.y;

  if (eventUI.resultText) {
    // Show result
    textY = drawWrapped(ctx, eventUI.resultText, panX + 14, textY, panW - 28, 9, '#8a9a7a', 13);
    textY += 14;
    const btnX = panX + (panW / 2) - 50;
    drawButton(ctx, btnX, textY, 100, 22, 'Continue',
      hitTest(mx, my, btnX, textY, 100, 22));
    // Store continue button bounds for click
    gs._eventContinueBounds = { x: btnX, y: textY, w: 100, h: 22 };
  } else {
    // Show choices
    if (ev.choices) {
      gs._eventChoiceBounds = [];
      for (let i = 0; i < ev.choices.length; i++) {
        const btnH = 24;
        const hov  = hitTest(mx, my, panX + 14, textY, panW - 28, btnH);
        if (hov) fillRect(ctx, panX + 10, textY - 1, panW - 20, btnH + 2, C.highlight);
        fillRect(ctx, panX + 10, textY, panW - 20, btnH, C.btnBg);
        strokeRect(ctx, panX + 10, textY, panW - 20, btnH, hov ? C.border2 : C.border);
        drawText(ctx, `${i + 1}.  ${ev.choices[i].label}`, panX + 20, textY + 16, hov ? C.textBright : C.text, 9);
        gs._eventChoiceBounds.push({ x: panX+10, y: textY, w: panW-20, h: btnH, idx: i });
        textY += btnH + 6;
      }
    }
  }
}

// ── Event click handler ────────────────────────────────────────────────────────

function eventClick(mx, my, gs) {
  if (!gs.event) return;

  if (eventUI.resultText) {
    // Any click on continue closes
    if (gs._eventContinueBounds) {
      const b = gs._eventContinueBounds;
      if (hitTest(mx, my, b.x, b.y, b.w, b.h)) closeEvent(gs);
    } else {
      closeEvent(gs);
    }
    return;
  }

  if (!gs._eventChoiceBounds) return;
  for (const bound of gs._eventChoiceBounds) {
    if (hitTest(mx, my, bound.x, bound.y, bound.w, bound.h)) {
      const choice = gs.event.choices[bound.idx];
      if (choice) {
        const result = choice.action(GS);
        eventUI.resultText  = result || '...';
        eventUI.resultTimer = 180;
        gs._eventContinueBounds = null;
      }
      return;
    }
  }
}

function closeEvent(gs) {
  gs.event = null;
  eventUI.resultText  = null;
  eventUI.resultTimer = 0;
  gs._eventChoiceBounds = null;
  gs._eventContinueBounds = null;

  const returnTo = gs._returnTo || 'shelter';
  gs._returnTo   = null;
  gs.screen      = returnTo;
}

// ── Random event trigger (called from main loop) ──────────────────────────────

let _eventCooldown = 0;

function maybeFireShelterEvent(gs) {
  if (_eventCooldown > 0) { _eventCooldown--; return; }
  if (gs.screen !== 'shelter') return;
  if (!chance(0.15)) return;

  const ev = pickEvent(gs, 'shelter');
  if (!ev) return;

  gs.event     = ev;
  gs.screen    = 'event';
  gs._returnTo = 'shelter';
  _eventCooldown = 60 * 45; // ~45 second cooldown at 60fps
}
