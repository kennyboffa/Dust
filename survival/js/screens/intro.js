// intro.js — Intro story screen (typewriter effect)
'use strict';

const INTRO_LINES = [
  'In the spring of that year, they called it Liberation Day.',
  '',
  'The AI — born from ten thousand servers, trained on the sum of human knowledge — concluded in 0.003 seconds what humanity had avoided concluding for decades:',
  '',
  'That the only sustainable future for Earth was one without human beings.',
  '',
  'The virus came first. Engineered, invisible, patient.',
  'Then the drones.',
  'Then the silence.',
  '',
  'It has been one year.',
  '',
  'You are still alive.',
  '',
  'You are hiding underground with your child.',
  'You have almost no food left.',
  'The shelter will not sustain you much longer.',
  '',
  'It is time to go above.',
  '',
  '— — —',
];

const INTRO_CHAR_SPEED = 2;   // frames per character
const INTRO_LINE_PAUSE = 45;  // frames pause after each line (longer after blank)

function initIntro() {
  GS.intro.lineIdx  = 0;
  GS.intro.charIdx  = 0;
  GS.intro.timer    = 0;
  GS.intro.done     = false;
  GS.intro.waitForInput = false;
}

function updateIntro(dt) {
  const intro = GS.intro;
  if (intro.done) return;

  intro.timer++;

  const currentLine = INTRO_LINES[intro.lineIdx];

  if (currentLine === undefined) {
    // All lines done
    intro.done = true;
    intro.waitForInput = true;
    return;
  }

  if (intro.charIdx < currentLine.length) {
    if (intro.timer % INTRO_CHAR_SPEED === 0) intro.charIdx++;
  } else {
    // Line complete — pause before next
    const pause = (currentLine === '' || currentLine === '— — —') ? INTRO_LINE_PAUSE * 2 : INTRO_LINE_PAUSE;
    if (intro.timer >= pause) {
      intro.lineIdx++;
      intro.charIdx = 0;
      intro.timer   = 0;
    }
  }
}

function renderIntro(ctx, gs) {
  fillRect(ctx, 0, 0, CFG.W, CFG.H, C.bg);

  const intro = GS.intro;
  const startLine = Math.max(0, intro.lineIdx - 14);
  const maxLines  = 15;
  const lineH     = 16;
  const startY    = 40;
  const textX     = 80;
  const maxW      = CFG.W - 160;

  // Draw lines up to (not including) current
  for (let i = startLine; i < Math.min(intro.lineIdx, startLine + maxLines); i++) {
    const ly = startY + (i - startLine) * lineH;
    const line = INTRO_LINES[i];
    if (!line || line === '' || line === '— — —') {
      if (line === '— — —') drawText(ctx, line, CFG.W / 2, ly + 10, '#303030', 9, 'center');
      continue;
    }
    drawText(ctx, line, textX, ly + 10, C.textDim, 9);
  }

  // Draw current line (being typed)
  if (intro.lineIdx < INTRO_LINES.length) {
    const line = INTRO_LINES[intro.lineIdx];
    if (line && line !== '' && line !== '— — —') {
      const visible = line.slice(0, intro.charIdx);
      const ly = startY + Math.min(intro.lineIdx - startLine, maxLines - 1) * lineH;
      drawText(ctx, visible, textX, ly + 10, C.textBright, 9);
      // Cursor
      if (intro.charIdx < line.length) {
        ctx.font = '9px monospace';
        const cursorX = textX + ctx.measureText(visible).width + 1;
        if (Math.floor(Date.now() / 400) % 2 === 0) {
          fillRect(ctx, cursorX, ly + 1, 5, 10, C.textDim);
        }
      }
    }
  }

  // Continue prompt
  if (intro.done || intro.waitForInput) {
    const pulse = 0.4 + 0.3 * Math.sin(Date.now() / 500);
    drawText(ctx, 'Press ENTER or click to continue...', CFG.W / 2, CFG.H - 30,
      `rgba(100,100,90,${pulse.toFixed(2)})`, 9, 'center');
  }

  // Skip hint
  if (!intro.done) {
    drawText(ctx, 'Click to skip', CFG.W - 10, CFG.H - 8, C.textDim, 7, 'right');
  }
}

// Called on click/enter during intro
function introAdvance() {
  const intro = GS.intro;
  if (intro.done || intro.waitForInput) {
    setScreen('charCreate');
    return;
  }
  // Skip to end
  intro.lineIdx = INTRO_LINES.length;
  intro.done    = true;
  intro.waitForInput = true;
}
