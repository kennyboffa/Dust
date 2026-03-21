// config.js — Game constants and configuration
'use strict';

const CFG = {
  W: 640,
  H: 360,

  // ── Time ─────────────────────────────────────────────────────────────────
  MINS_PER_REAL_SEC: 4,   // 1 real second = 4 game minutes (so a full day ~54 real min, speedy)
  DAY_START: 6 * 60,      // 360 — day begins at 06:00
  DAY_END:  23 * 60,      // 1380 — auto end-day at 23:00

  // ── Stat decay rates (per game hour, applied each tick) ──────────────────
  HUNGER_PER_HOUR:        3.5,   // +3.5 hunger per in-game hour
  THIRST_PER_HOUR:        5.0,   // +5 thirst per in-game hour (faster)
  TIRE_IDLE_PER_HOUR:     1.5,   // tiredness while idle
  TIRE_ACTIVE_PER_HOUR:   6.0,   // tiredness while doing tasks / exploring
  TIRE_SLEEP_PER_HOUR:   -18.0,  // sleep restores tiredness fast
  DEPR_CHILD_ALONE_PER_HOUR: 4.0,    // child alone → depression rises
  DEPR_CHILD_PARENT_PER_HOUR: -1.5,  // child with parent → depression falls
  DEPR_PARENT_IDLE_PER_HOUR: 0.5,    // parent ambient depression

  // ── Danger thresholds ────────────────────────────────────────────────────
  HUNGER_WARN:   60,
  HUNGER_DAMAGE: 80,  // above this: lose HP
  THIRST_WARN:   55,
  THIRST_DAMAGE: 75,
  TIRE_FORCED_SLEEP: 92,   // auto-sleep if parent tiredness hits this
  DEPR_WARN:     70,
  DEPR_LEAVE:    88,   // survivors may leave above this

  HEALTH_DRAIN_PER_HOUR: 2.5,  // HP lost per hour when stat > DAMAGE threshold
  SUSPICION_MAX: 100,

  // ── Shelter layout ───────────────────────────────────────────────────────
  PANEL_W: 200,          // right stats/controls panel width
  ROOM_W:  128,
  ROOM_H:   68,
  ROOM_GAP:   8,
  ROOM_COLS:  3,
  SURFACE_H: 95,         // height of surface scene at top of shelter view

  // ── Exploration ──────────────────────────────────────────────────────────
  WORLD_W: 2200,         // exploration world pixel width
  SCROLL_SPEED: 2.2,
  PLAYER_SPEED: 2.0,

  // ── Combat ───────────────────────────────────────────────────────────────
  BASE_HIT_CHANCE: 75,   // base % to hit

  // ── Colours ──────────────────────────────────────────────────────────────
  C: {
    // background / structural
    bg:          '#090910',
    panelBg:     '#0d0d16',
    panelBg2:    '#11111c',
    border:      '#222230',
    border2:     '#333344',
    // text
    text:        '#c4c4b0',
    textDim:     '#707060',
    textBright:  '#e4e4cc',
    textWarn:    '#cc8830',
    textDanger:  '#cc2828',
    textGood:    '#3aaa50',
    // stat bars
    hp:          '#cc2828',
    hunger:      '#cc7a28',
    thirst:      '#2878cc',
    tiredness:   '#767676',
    depression:  '#7040cc',
    suspicion:   '#cc1818',
    // world / environment
    sky:         '#060609',
    sky2:        '#0c0c18',
    ground:      '#18180e',
    dirt:        '#22200e',
    dirt2:       '#2a2618',
    floor:       '#181510',
    wall:        '#1c1c16',
    wallLight:   '#282820',
    metal:       '#22242a',
    metalLight:  '#30343c',
    concrete:    '#282820',
    // character
    skinLight:   '#c49460',
    skin:        '#b07848',
    skinDark:    '#7a5028',
    hair:        '#2a1808',
    hairLight:   '#4a2c10',
    // other
    highlight:   'rgba(255,255,255,0.07)',
    shadow:      'rgba(0,0,0,0.5)',
    overlay:     'rgba(0,0,0,0.7)',
    // UI elements
    btnBg:       '#141420',
    btnBorder:   '#2a2a3c',
    btnHover:    '#1e1e2c',
    btnActive:   '#18281c',
    btnText:     '#b8b8a0',
    // item types
    food:        '#8a5a18',
    water:       '#185a8a',
    medicine:    '#186040',
    weapon:      '#6a1818',
    material:    '#4a4030',
    ammo:        '#3a3020',
    backpack:    '#303820',
  },
};

// Shorthand for colours used everywhere
const C = CFG.C;
