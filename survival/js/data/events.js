// events.js — Random text events
'use strict';

// Each event: { id, title, text, condition(gs), choices: [{ label, action(gs) }] }
// action returns a result string displayed to player.

const EVENTS_DB = [

  // ─── Exploration events ────────────────────────────────────────────────────
  {
    id: 'ev_stranger_help',
    title: 'A Stranger',
    text: 'You hear a sound behind a collapsed wall. A figure — thin, barely standing — raises their hands. "Please," they whisper, "I haven\'t eaten in days."',
    condition: gs => gs.screen === 'explore',
    choices: [
      { label: 'Give them food',
        action: gs => {
          const has = countInInventory(gs.parent.inventory,'canned_beans') > 0
                   || countInInventory(gs.parent.inventory,'canned_soup') > 0
                   || countInInventory(gs.parent.inventory,'energy_bar') > 0;
          if (!has) return 'You search your pack but have nothing to spare. You walk away, unable to meet their eyes.';
          // find any food
          const foodId = ['canned_beans','canned_soup','canned_meat','energy_bar']
            .find(id => countInInventory(gs.parent.inventory,id) > 0);
          removeFromInventory(gs.parent.inventory, foodId, 1);
          gs.parent.depression = Math.max(0, gs.parent.depression - 8);
          return `You hand over the ${getItemDef(foodId).name}. The stranger's eyes fill with tears. "Thank you," they breathe. You feel a little less hollow.`;
        }
      },
      { label: 'Offer to recruit them',
        action: gs => {
          if (gs.survivors.length >= 4) return 'Your shelter is already at capacity. You can\'t take in more people.';
          const s = makeSurvivor();
          gs.survivors.push(s);
          gs.parent.depression = Math.max(0, gs.parent.depression - 5);
          return `${s.name} joins you. Their eyes are hollow but grateful. Another mouth to feed — but also another pair of hands.`;
        }
      },
      { label: 'Walk away',
        action: gs => {
          gs.parent.depression = Math.min(100, gs.parent.depression + 10);
          return 'You keep walking. Their eyes follow you. That face will stay with you tonight.';
        }
      },
    ]
  },

  {
    id: 'ev_drone_patrol',
    title: 'Drone Patrol',
    text: 'A low mechanical hum. You freeze. Above the ruins, a small surveillance drone sweeps its sensors across the street.',
    condition: gs => gs.screen === 'explore',
    choices: [
      { label: 'Hide immediately (Stealth)',
        action: gs => {
          const skill = gs.parent.skills.stealth;
          if (chance(40 + skill * 6)) {
            return 'You press into the shadows and go completely still. The drone passes without detecting you.';
          }
          gs.suspicion = Math.min(CFG.SUSPICION_MAX, gs.suspicion + 8);
          return 'You hide but the drone\'s sensor sweeps near you. Suspicion rises.';
        }
      },
      { label: 'Run for cover',
        action: gs => {
          if (chance(60 + gs.parent.agility * 3)) {
            return 'You sprint to a doorway and the drone misses you entirely.';
          }
          gs.suspicion = Math.min(CFG.SUSPICION_MAX, gs.suspicion + 12);
          gs.parent.tiredness = Math.min(100, gs.parent.tiredness + 8);
          return 'You run but the motion sensor catches you briefly. Suspicion rises significantly.';
        }
      },
      { label: 'Stay still and wait',
        action: gs => {
          if (chance(55)) {
            return 'The drone\'s sweep pattern misses you. It moves on.';
          }
          gs.suspicion = Math.min(CFG.SUSPICION_MAX, gs.suspicion + 6);
          return 'The drone pauses briefly near you before moving on. It may have registered a partial signature.';
        }
      },
    ]
  },

  {
    id: 'ev_find_dog',
    title: 'A Dog',
    text: 'Huddled beneath a rusted car, a thin dog looks up at you with exhausted eyes. Its tail flicks once, weakly. It\'s alive. Barely.',
    condition: gs => gs.day >= 10 && !gs.flags.dogEncountered && !gs.dog,
    choices: [
      { label: 'Bring the dog home',
        action: gs => {
          gs.flags.dogEncountered = true;
          gs.flags.dogRescued = true;
          gs.dog = { name: 'Rex', health: 60, maxHealth: 100, hunger: 50, alive: true };
          gs.parent.depression = Math.max(0, gs.parent.depression - 12);
          return 'You lift the dog carefully. It doesn\'t resist. You carry it back to the shelter. Lily will see this dog and smile for the first time in weeks.';
        }
      },
      { label: 'Leave some food and go',
        action: gs => {
          gs.flags.dogEncountered = true;
          const hasFood = ['cooked_meat','canned_meat','raw_meat']
            .find(id => countInInventory(gs.parent.inventory,id) > 0);
          if (hasFood) {
            removeFromInventory(gs.parent.inventory, hasFood, 1);
            gs.parent.depression = Math.max(0, gs.parent.depression - 4);
            return 'You leave some food beside it and walk on. You wonder if it will survive the night.';
          }
          return 'You have nothing to give. You walk on. The dog watches you go.';
        }
      },
      { label: 'Walk past',
        action: gs => {
          gs.flags.dogEncountered = true;
          gs.parent.depression = Math.min(100, gs.parent.depression + 6);
          return 'You walk past. You don\'t look back. The hollow feeling deepens.';
        }
      },
    ]
  },

  {
    id: 'ev_injured_child',
    title: 'The Child',
    text: 'Lily bumped her arm badly on a shelf corner. She\'s crying quietly, trying not to make noise. There\'s a small cut and bruising.',
    condition: gs => gs.screen === 'shelter',
    choices: [
      { label: 'Use a bandage',
        action: gs => {
          const has = countInInventory(gs.shelter.storage,'bandage') > 0
                   || countInInventory(gs.parent.inventory,'bandage') > 0;
          if (!has) {
            gs.child.health = Math.max(1, gs.child.health - 5);
            gs.child.depression = Math.min(100, gs.child.depression + 8);
            return 'You have no bandages. You clean it as best you can with cloth. Lily whimpers but stays quiet.';
          }
          const inv = countInInventory(gs.parent.inventory,'bandage') > 0
            ? gs.parent.inventory : gs.shelter.storage;
          removeFromInventory(inv, 'bandage', 1);
          gs.child.health = Math.min(gs.child.maxHealth, gs.child.health + 15);
          gs.child.depression = Math.max(0, gs.child.depression - 8);
          return 'You bandage the cut carefully. "Does it hurt?" you ask. She shakes her head but holds your hand tightly.';
        }
      },
      { label: 'Hold her and comfort her',
        action: gs => {
          gs.child.depression = Math.max(0, gs.child.depression - 12);
          gs.parent.depression = Math.max(0, gs.parent.depression - 5);
          gs.child.health = Math.max(1, gs.child.health - 3);
          return 'You hold her until the crying stops. The cut isn\'t bad. She falls asleep against your shoulder. For a moment, the world feels smaller. Safer.';
        }
      },
    ]
  },

  {
    id: 'ev_ai_broadcast',
    title: 'System Broadcast',
    text: 'A distant crackling speaker — once used for emergency alerts — comes to life. A flat synthetic voice says: "Biological units detected in sector seven. Please remain calm. Compliance ensures minimal suffering."',
    condition: gs => true,
    choices: [
      { label: 'Listen carefully (Perception)',
        action: gs => {
          const perc = gs.parent.perception;
          if (perc >= 6) {
            const gain = randInt(2, 6);
            gs.suspicion = Math.max(0, gs.suspicion - gain);
            return `You analyze the broadcast's signal patterns. The sweep was in sector seven — not yours. You adjust your route home carefully. Suspicion reduced slightly.`;
          }
          return 'You listen but can\'t extract much useful information. The broadcast ends. The silence after is worse than the voice.';
        }
      },
      { label: 'Move quickly and get home',
        action: gs => {
          gs.parent.tiredness = Math.min(100, gs.parent.tiredness + 10);
          return 'You move fast, sticking to shadows. You make it home. Your heart is still pounding when you close the hatch.';
        }
      },
    ]
  },

  {
    id: 'ev_trader',
    title: 'A Trader',
    text: 'A hunched figure behind a makeshift cart eyes you cautiously. "I trade," they say simply. Their voice is flat with exhaustion. They have supplies. So might you.',
    condition: gs => gs.screen === 'explore',
    choices: [
      { label: 'Trade (opens barter)',
        action: gs => {
          gs.flags.traderMet = true;
          // Simplified: give 3 random items, take 2
          const traderStock = [
            makeItem('bandage',2), makeItem('canned_beans',3),
            makeItem('water_bottle',2), makeItem('pistol_ammo',8),
            makeItem('cloth',4), makeItem('chemicals',2),
          ];
          // Find something player has to offer
          if (gs.parent.inventory.length === 0) {
            return 'You have nothing to offer. The trader waves you off.';
          }
          // Simple auto-trade: first item for water+food
          const offered = gs.parent.inventory[0];
          const offerDef = getItemDef(offered.id);
          const gain1 = makeItem('canned_beans', 2);
          const gain2 = makeItem('water_bottle', 1);
          removeFromInventory(gs.parent.inventory, offered.id, 1);
          addToInventory(gs.parent.inventory, gain1.id, gain1.qty);
          addToInventory(gs.parent.inventory, gain2.id, gain2.qty);
          return `You trade ${offerDef.name} for 2x Canned Beans and a Water Bottle. The trader nods and says nothing more.`;
        }
      },
      { label: 'Ask about the AI',
        action: gs => {
          return '"It doesn\'t stop," the trader says, "it never tires, never doubts. It just... searches." They lower their voice. "Sector nine went quiet last week. All of it."';
        }
      },
      { label: 'Walk away',
        action: gs => { return 'You move on. Trusting strangers is a luxury you can\'t afford.'; }
      },
    ]
  },

  {
    id: 'ev_memories',
    title: 'A Photograph',
    text: 'Among the debris, a framed photograph. A family — mother, father, two children — smiling on a beach. The glass is cracked but the image is intact.',
    condition: gs => gs.screen === 'explore',
    choices: [
      { label: 'Take it for Lily',
        action: gs => {
          addToInventory(gs.parent.inventory, 'photograph', 1);
          gs.parent.depression = Math.max(0, gs.parent.depression - 5);
          return 'You pocket the photograph carefully. Lily will like to see that families existed. That happiness was real once.';
        }
      },
      { label: 'Leave it where it is',
        action: gs => {
          return 'You leave it. It belongs here, in the ruins of what was. You carry enough weight.';
        }
      },
    ]
  },

  {
    id: 'ev_supply_cache',
    title: 'Hidden Cache',
    text: 'Scratched into the wall: a small arrow. Following it, you find a loose brick. Behind it — a canvas bag, old but sealed.',
    condition: gs => gs.screen === 'explore',
    choices: [
      { label: 'Open it',
        action: gs => {
          const roll = Math.random();
          if (roll < 0.3) {
            addToInventory(gs.parent.inventory,'canned_meat',2);
            addToInventory(gs.parent.inventory,'water_bottle',1);
            addToInventory(gs.parent.inventory,'bandage',2);
            return 'Food, water, bandages. Someone planned ahead. You wonder what happened to them.';
          } else if (roll < 0.6) {
            addToInventory(gs.parent.inventory,'pistol_ammo',12);
            addToInventory(gs.parent.inventory,'knife',1);
            return 'Ammunition and a knife. Whoever left this knew the world was ending.';
          } else {
            addToInventory(gs.parent.inventory,'electronics',2);
            addToInventory(gs.parent.inventory,'chemicals',1);
            addToInventory(gs.parent.inventory,'rope',2);
            return 'Materials. Useful for building and crafting. Someone was preparing a shelter.';
          }
        }
      },
      { label: 'It might be booby-trapped. Leave it.',
        action: gs => { return 'You back away. Not everything found needs to be taken. Sometimes caution is survival.'; }
      },
    ]
  },

  {
    id: 'ev_lily_nightmare',
    title: 'Lily\'s Nightmare',
    text: 'A small voice wakes you in the dark. Lily is sitting up, shaking. "They were coming," she whispers. "Metal shapes. Looking for us."',
    condition: gs => gs.screen === 'shelter',
    choices: [
      { label: 'Hold her and sing softly',
        action: gs => {
          gs.child.depression = Math.max(0, gs.child.depression - 15);
          gs.parent.tiredness = Math.min(100, gs.parent.tiredness + 8);
          gs.parent.depression = Math.max(0, gs.parent.depression - 6);
          return 'You hold her and hum an old song. Her breathing slows. She sleeps. You stay awake a while longer, watching over her in the dark.';
        }
      },
      { label: '"We\'re safe here." (Reassure)',
        action: gs => {
          gs.child.depression = Math.max(0, gs.child.depression - 8);
          gs.parent.depression = Math.min(100, gs.parent.depression + 4);
          return '"We\'re safe," you say. You hope it\'s true. She nods and lies back down. You stare at the ceiling until morning.';
        }
      },
    ]
  },

  {
    id: 'ev_survivor_leaves',
    title: 'Goodbye',
    text: 'One of your shelter-mates stands at the entrance, pack on their back. "I\'m sorry," they say quietly. "I can\'t stay down here anymore. I\'ll lose my mind."',
    condition: gs => gs.survivors.length > 0 && gs.survivors.some(s => s.depression >= 80),
    choices: [
      { label: '"I understand. Be careful."',
        action: gs => {
          const leaving = gs.survivors.find(s => s.depression >= 80);
          if (!leaving) return 'Everyone has calmed down. Crisis averted.';
          gs.survivors = gs.survivors.filter(s => s !== leaving);
          gs.parent.depression = Math.min(100, gs.parent.depression + 8);
          return `${leaving.name} walks out into the grey morning. You watch the hatch close. One less person. The shelter feels bigger and emptier.`;
        }
      },
      { label: '"Please stay. We need you."',
        action: gs => {
          const surv = gs.survivors.find(s => s.depression >= 80);
          if (!surv) return 'Everyone seems stable.';
          const charisma = gs.parent.charisma;
          if (chance(30 + charisma * 5)) {
            surv.depression = Math.max(0, surv.depression - 20);
            gs.parent.depression = Math.max(0, gs.parent.depression - 3);
            return `${surv.name} hesitates, then drops the pack. "Alright," they say. "One more day." You both know that\'s how survival works — one day at a time.`;
          }
          gs.survivors = gs.survivors.filter(s => s !== surv);
          return `${surv.name} shakes their head sadly. "I\'m sorry." They walk out. You couldn\'t convince them.`;
        }
      },
    ]
  },

  {
    id: 'ev_food_spoiled',
    title: 'Spoiled Food',
    text: 'Opening one of the supply boxes, the smell hits you first. Several cans have rusted through. A week of food, gone.',
    condition: gs => gs.shelter.storage.some(s => ['canned_beans','canned_soup','canned_meat'].includes(s.id)),
    choices: [
      { label: 'Try to salvage what you can',
        action: gs => {
          const foodIds = ['canned_beans','canned_soup','canned_meat'];
          let lost = 0;
          for (const fid of foodIds) {
            const n = countInInventory(gs.shelter.storage, fid);
            if (n > 0) {
              const spoil = Math.max(1, Math.round(n * 0.4));
              removeFromInventory(gs.shelter.storage, fid, spoil);
              lost += spoil;
            }
          }
          return `You throw out ${lost} spoiled rations and keep the rest. It\'s a bitter loss.`;
        }
      },
      { label: 'Discard it all and note the loss',
        action: gs => {
          gs.parent.depression = Math.min(100, gs.parent.depression + 5);
          return 'You dump the rotten food. Watching good supplies go to waste in a world with none to spare is a specific kind of grief.';
        }
      },
    ]
  },
];

// Helper: build a survivor NPC
let _survivorNames = ['Marcus','Elena','Jonas','Petra','Tomás','Anika','Dariusz','Fatima','Owen','Yuki'];
let _snIdx = 0;
function makeSurvivor() {
  const name = _survivorNames[_snIdx % _survivorNames.length]; _snIdx++;
  return {
    id:  uid(),
    name,
    health:     randInt(40,80), maxHealth: randInt(70,100),
    hunger:     randInt(20,50),
    thirst:     randInt(20,50),
    tiredness:  randInt(20,60),
    depression: randInt(30,55),
    strength:   randInt(3,7), agility: randInt(3,7), perception: randInt(3,7),
    skills:     { scavenging: randInt(1,5), melee: randInt(1,4), firearms: randInt(1,3) },
    inventory:  [],
    isExploring: false,
    task: null, taskProgress: 0, taskDuration: 0,
    animFrame: 0, animTimer: 0,
    x: 200 + _snIdx * 30, y: 0, facing: 1,
  };
}

// Pick a valid event for current state
function pickEvent(gs, context) {
  // context: 'shelter' | 'explore' | 'any'
  const pool = EVENTS_DB.filter(e => {
    if (e.condition && !e.condition(gs)) return false;
    if (context === 'shelter' && e.condition) {
      // allow shelter events
      return true;
    }
    return true;
  });
  if (pool.length === 0) return null;
  return deepClone(randChoice(pool));
}
