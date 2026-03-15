// ============================================
// Dustwalker - Dialogue Database
// ============================================

const DialogueDatabase = {
    // ---- ELDER MARA ----
    elder_mara: {
        getStartNode(player) {
            if (player.questFlags.cave_crystal_returned) return 'crystal_returned';
            if (player.questFlags.cave_quest_accepted) return 'quest_progress';
            if (player.questFlags.met_elder) return 'return_greeting';
            return 'start';
        },
        nodes: {
            start: {
                text: "Welcome, stranger. I am Mara, elder of Dusthaven. We don't get many visitors these days. The wasteland grows more dangerous by the year.",
                options: [
                    { text: "I'm a traveler. What is this place?", next: 'about_village' },
                    { text: "You look worried. Is something wrong?", next: 'problem' },
                    {
                        text: "I can see this village has seen better days.",
                        next: 'perception_insight',
                        skillCheck: { skill: 'perception', difficulty: 0 },
                        successNode: 'perception_insight',
                        failNode: 'about_village',
                    },
                    { text: "Goodbye.", end: true, action: (p) => { p.questFlags.met_elder = true; } }
                ]
            },
            about_village: {
                text: "This is Dusthaven — a small settlement built around an old water well. We've survived here for three generations. We grow what we can, trade when traders pass through. Life is hard, but we endure.",
                options: [
                    { text: "Is there anything troubling the village?", next: 'problem' },
                    { text: "Do you have any work for a capable wanderer?", next: 'problem' },
                    { text: "Interesting. I'll look around.", end: true, action: (p) => { p.questFlags.met_elder = true; } }
                ]
            },
            perception_insight: {
                text: "You have sharp eyes, traveler. Yes... we are struggling. Our scouts found caves to the north — they should have been a blessing, a source of minerals. But something lurks within. Creatures... and worse.",
                options: [
                    { text: "Tell me more about these caves.", next: 'cave_details' },
                    { text: "I could help. What do you need?", next: 'quest_offer' },
                    { text: "Sounds dangerous. Good luck with that.", end: true, action: (p) => { p.questFlags.met_elder = true; } }
                ]
            },
            problem: {
                text: "There is, actually. To the north, we discovered a network of caves. We hoped to mine them for crystals — they're valuable for trade. But the caves are infested with creatures. We've already lost two scouts.",
                options: [
                    { text: "What kind of creatures?", next: 'cave_details' },
                    { text: "I might be able to help.", next: 'quest_offer' },
                    { text: "That's unfortunate. I'll be on my way.", end: true, action: (p) => { p.questFlags.met_elder = true; } }
                ]
            },
            cave_details: {
                text: "Giant rats, scorpions, cave spiders... the usual wasteland vermin, but in large numbers. And our last scout spoke of something bigger lurking in the deepest chamber — something mutated. He barely escaped with his life.",
                options: [
                    { text: "I'll clear out those caves for you.", next: 'quest_offer' },
                    { text: "What's in it for me?", next: 'quest_reward' },
                    { text: "I need to prepare first.", end: true, action: (p) => { p.questFlags.met_elder = true; } }
                ]
            },
            quest_offer: {
                text: "Would you truly brave the caves? We need someone to venture into the deepest chamber and retrieve a Dust Crystal — a large, glowing stone our scouts spotted before they fled. Bring it back, and you'll be well rewarded.",
                options: [
                    { text: "What's the reward?", next: 'quest_reward' },
                    { text: "I accept. I'll bring back the crystal.", next: 'quest_accepted' },
                    {
                        text: "I'll need supplies and information before I go.",
                        next: 'quest_negotiate',
                        skillCheck: { skill: 'speech', difficulty: 30, xp: 25 },
                        successNode: 'quest_negotiate_success',
                        failNode: 'quest_accepted',
                    },
                    { text: "Let me think about it.", end: true, action: (p) => { p.questFlags.met_elder = true; } }
                ]
            },
            quest_reward: {
                text: "We can offer 200 bottle caps, and I have a set of leather armor that belonged to our best scout. It's yours if you return with the crystal. We'll also grant you full trading rights in Dusthaven.",
                options: [
                    { text: "Deal. I'll bring back the crystal.", next: 'quest_accepted' },
                    { text: "I'll think about it.", end: true, action: (p) => { p.questFlags.met_elder = true; } }
                ]
            },
            quest_negotiate_success: {
                text: "You drive a hard bargain, but fair enough. Take this healing powder and these supplies. You'll need them in the caves. And take this amulet — it's said to bring luck to those who venture underground.",
                options: [
                    { text: "Thank you. I'll head out soon.", end: true, action: (p, game) => {
                        p.questFlags.met_elder = true;
                        p.questFlags.cave_quest_accepted = true;
                        QuestSystem.startQuest(p, 'cave_crystal', game);
                        InventorySystem.addItem(p, ItemDatabase.healing_powder, 3);
                        InventorySystem.addItem(p, ItemDatabase.stimpak, 1);
                        InventorySystem.addItem(p, ItemDatabase.elder_amulet, 1);
                        game.addMessage('Received: 3x Healing Powder, 1x Stimpak, Elder\'s Amulet', 'loot');
                    }}
                ]
            },
            quest_accepted: {
                text: "Brave soul. The cave entrance is to the north of the village — you'll see the opening in the cliff face. Be careful, and may fortune walk with you.",
                options: [
                    { text: "I'll return with the crystal.", end: true, action: (p, game) => {
                        p.questFlags.met_elder = true;
                        p.questFlags.cave_quest_accepted = true;
                        QuestSystem.startQuest(p, 'cave_crystal', game);
                    }}
                ]
            },
            return_greeting: {
                text: "Welcome back, traveler. Have you given thought to helping us with the cave problem?",
                options: [
                    { text: "Tell me about the caves again.", next: 'cave_details' },
                    { text: "I'll do it. I'll clear the caves.", next: 'quest_accepted' },
                    { text: "Not yet. I'm still preparing.", end: true }
                ]
            },
            quest_progress: {
                text: "You've accepted the task? Good. The cave entrance is north of here. Retrieve the Dust Crystal from the deepest chamber and return it to me.",
                options: [
                    { text: "Any advice for the caves?", next: 'cave_advice' },
                    { text: "I'm on my way.", end: true }
                ]
            },
            cave_advice: {
                text: "Stick to the walls, move carefully. The rats are territorial but cowardly in small numbers. The scorpions are the real threat — their poison is nasty. And whatever is in the deepest chamber... don't underestimate it.",
                options: [
                    { text: "Thanks for the advice.", end: true }
                ]
            },
            crystal_returned: {
                text: "You did it! The Dust Crystal — I can barely believe it. You've saved Dusthaven, traveler. With this crystal, we can trade for supplies that will last us years. Here is your reward, as promised.",
                options: [
                    { text: "Glad I could help.", end: true, action: (p, game) => {
                        if (!p.questFlags.cave_reward_given) {
                            p.questFlags.cave_reward_given = true;
                            InventorySystem.addItem(p, ItemDatabase.bottle_caps, 200);
                            InventorySystem.addItem(p, ItemDatabase.leather_armor, 1);
                            game.addMessage('Received: 200 Bottle Caps, Leather Armor', 'loot');
                            CharacterSystem.addXP(p, 500);
                            game.addMessage('+500 XP', 'xp');
                            QuestSystem.advanceQuest(p, 'cave_crystal', 'complete', game);
                        }
                    }}
                ]
            }
        }
    },

    // ---- MERCHANT HANK ----
    merchant_hank: {
        getStartNode(player) {
            if (player.questFlags.raider_camp_cleared) return 'raider_complete';
            if (player.questFlags.raider_quest_accepted) return 'raider_progress';
            if (player.questFlags.met_hank) return 'return_greeting';
            return 'start';
        },
        nodes: {
            start: {
                text: "Well, well! A new face in Dusthaven. Name's Hank — I'm the closest thing to a trader this village has. Interested in buying or selling?",
                options: [
                    { text: "What do you have for sale?", next: 'shop', action: (p) => { p.questFlags.met_hank = true; } },
                    { text: "Tell me about Dusthaven.", next: 'about' },
                    {
                        text: "You look like a man who knows things. Any rumors?",
                        next: 'rumors',
                        skillCheck: { skill: 'speech', difficulty: 20, xp: 15 },
                        successNode: 'rumors',
                        failNode: 'rumors_fail',
                    },
                    { text: "Maybe later.", end: true, action: (p) => { p.questFlags.met_hank = true; } }
                ]
            },
            return_greeting: {
                text: "Back again? Ready to trade?",
                options: [
                    { text: "Show me what you have.", next: 'shop' },
                    { text: "Tell me about those raiders.", next: 'raider_info' },
                    { text: "Any news?", next: 'rumors' },
                    { text: "Just passing through.", end: true }
                ]
            },
            shop: {
                text: "Here's what I've got. Prices are fair — well, fair for the wasteland anyway.",
                options: [
                    { text: "[Buy] Stimpak - 75 caps", next: 'buy_stimpak' },
                    { text: "[Buy] Healing Powder - 20 caps", next: 'buy_healing' },
                    { text: "[Buy] Pipe Pistol - 100 caps", next: 'buy_pistol' },
                    { text: "That's all for now.", end: true }
                ]
            },
            buy_stimpak: {
                text(player) {
                    const caps = player.inventory.find(i => i.id === 'bottle_caps');
                    const capCount = caps ? caps.quantity : 0;
                    if (capCount >= 75) {
                        return "Stimpak, good choice. That'll be 75 caps.";
                    }
                    return `You only have ${capCount} caps. Need 75 for a Stimpak.`;
                },
                options: (player) => {
                    const caps = player.inventory.find(i => i.id === 'bottle_caps');
                    const canAfford = caps && caps.quantity >= 75;
                    const opts = [];
                    if (canAfford) {
                        opts.push({
                            text: "Deal.", next: 'shop',
                            action: (p, game) => {
                                InventorySystem.removeItem(p, 'bottle_caps', 75);
                                InventorySystem.addItem(p, ItemDatabase.stimpak, 1);
                                game.addMessage('Purchased: Stimpak', 'loot');
                            }
                        });
                    }
                    opts.push({ text: "Let me look at something else.", next: 'shop' });
                    return opts;
                }
            },
            buy_healing: {
                text(player) {
                    const caps = player.inventory.find(i => i.id === 'bottle_caps');
                    const capCount = caps ? caps.quantity : 0;
                    if (capCount >= 20) return "Healing Powder, reliable stuff. 20 caps.";
                    return `You need 20 caps. You've got ${capCount}.`;
                },
                options: (player) => {
                    const caps = player.inventory.find(i => i.id === 'bottle_caps');
                    const canAfford = caps && caps.quantity >= 20;
                    const opts = [];
                    if (canAfford) {
                        opts.push({
                            text: "I'll take it.", next: 'shop',
                            action: (p, game) => {
                                InventorySystem.removeItem(p, 'bottle_caps', 20);
                                InventorySystem.addItem(p, ItemDatabase.healing_powder, 1);
                                game.addMessage('Purchased: Healing Powder', 'loot');
                            }
                        });
                    }
                    opts.push({ text: "Show me something else.", next: 'shop' });
                    return opts;
                }
            },
            buy_pistol: {
                text(player) {
                    const caps = player.inventory.find(i => i.id === 'bottle_caps');
                    const capCount = caps ? caps.quantity : 0;
                    if (capCount >= 100) return "A Pipe Pistol. Not pretty, but it shoots straight. 100 caps.";
                    return `100 caps for the pistol. You've only got ${capCount}.`;
                },
                options: (player) => {
                    const caps = player.inventory.find(i => i.id === 'bottle_caps');
                    const canAfford = caps && caps.quantity >= 100;
                    const opts = [];
                    if (canAfford) {
                        opts.push({
                            text: "Sold.", next: 'shop',
                            action: (p, game) => {
                                InventorySystem.removeItem(p, 'bottle_caps', 100);
                                InventorySystem.addItem(p, ItemDatabase.pipe_pistol, 1);
                                game.addMessage('Purchased: Pipe Pistol', 'loot');
                            }
                        });
                    }
                    opts.push({ text: "Too rich for my blood.", next: 'shop' });
                    return opts;
                }
            },
            about: {
                text: "Dusthaven? Not much to tell. Used to be a bigger settlement, but times are hard. We've got the elder, Mara — she keeps us together. A few families farming what they can. Me handling what little trade comes through.",
                options: [
                    { text: "What do you trade in?", next: 'shop' },
                    { text: "Thanks for the info.", end: true, action: (p) => { p.questFlags.met_hank = true; } }
                ]
            },
            rumors: {
                text: "You didn't hear this from me... but there's talk of raiders camping out east of here. Also, the caves north of town — Elder Mara's been looking for someone brave or stupid enough to go in. And I've heard whispers about an old bunker somewhere in the wastes. Pre-war tech. Big money if you find it.",
                options: [
                    { text: "Tell me more about the raiders.", next: 'raider_info' },
                    { text: "Interesting. Thanks.", end: true, action: (p) => { p.questFlags.met_hank = true; } }
                ]
            },
            rumors_fail: {
                text: "Rumors? I'm a trader, not a gossip. Buy something or move along.",
                options: [
                    { text: "Fine, show me your goods.", next: 'shop' },
                    { text: "Maybe later.", end: true, action: (p) => { p.questFlags.met_hank = true; } }
                ]
            },
            raider_info: {
                text: "Small gang, maybe five or six of them, led by a brute called Warlord Krag. They've been eyeing Dusthaven, we think. Haven't attacked yet, but it's only a matter of time. If someone were to... thin their numbers, the village would be grateful. Very grateful.",
                options: [
                    { text: "How grateful? What's in it for me?", next: 'raider_reward' },
                    { text: "I'll keep an eye out.", end: true },
                    { text: "Show me your shop.", next: 'shop' }
                ]
            },
            raider_reward: {
                text: "300 caps and I'll throw in a sawed-off shotgun from my personal collection. Or if you prefer, I can make it 450 caps total. Either way, you'd be doing Dusthaven a real service. Their camp is east of the village — head out the east side and you'll find them.",
                options: [
                    { text: "Deal. I'll take care of the raiders.", next: 'raider_accepted' },
                    { text: "I'll think about it.", end: true }
                ]
            },
            raider_accepted: {
                text: "Good luck. Krag's a tough one — take him down and the rest should scatter or die. Come back when they're dealt with.",
                options: [
                    { text: "Consider it done.", end: true, action: (p, game) => {
                        p.questFlags.raider_quest_accepted = true;
                        QuestSystem.startQuest(p, 'raider_camp', game);
                    }}
                ]
            },
            raider_progress: {
                text: "You back already? The raiders still causing trouble east of here. Take out Warlord Krag and his gang. Come back when you're done.",
                options: [
                    { text: "I'm working on it.", end: true },
                    { text: "Let me buy some supplies first.", next: 'shop' }
                ]
            },
            raider_complete: {
                text(player) {
                    if (player.questFlags.raider_reward_given) {
                        return "Thanks again for dealing with those raiders. Need anything from the shop?";
                    }
                    return "Wait... you're telling me Krag is dead? The raiders are gone? Ha! I knew you had it in you! Now, about that reward — what'll it be?";
                },
                options: (player) => {
                    if (player.questFlags.raider_reward_given) {
                        return [
                            { text: "Show me your shop.", next: 'shop' },
                            { text: "See you around.", end: true }
                        ];
                    }
                    return [
                        { text: "I'll take the shotgun and 300 caps.", end: true, action: (p, game) => {
                            p.questFlags.raider_reward_given = true;
                            InventorySystem.addItem(p, ItemDatabase.bottle_caps, 300);
                            InventorySystem.addItem(p, ItemDatabase.sawed_off, 1);
                            InventorySystem.addItem(p, ItemDatabase.ammo_12ga, 12);
                            game.addMessage('Received: 300 Bottle Caps, Sawed-Off Shotgun, 12x 12ga Shells', 'loot');
                            CharacterSystem.addXP(p, 400);
                            game.addMessage('+400 XP', 'xp');
                            QuestSystem.advanceQuest(p, 'raider_camp', 'complete', game);
                        }},
                        { text: "Just give me the 450 caps.", end: true, action: (p, game) => {
                            p.questFlags.raider_reward_given = true;
                            InventorySystem.addItem(p, ItemDatabase.bottle_caps, 450);
                            game.addMessage('Received: 450 Bottle Caps', 'loot');
                            CharacterSystem.addXP(p, 400);
                            game.addMessage('+400 XP', 'xp');
                            QuestSystem.advanceQuest(p, 'raider_camp', 'complete', game);
                        }}
                    ];
                }
            }
        }
    },

    // ---- GUARD ROOK ----
    guard_rook: {
        getStartNode(player) {
            if (player.questFlags.cave_quest_accepted) return 'quest_active';
            return 'start';
        },
        nodes: {
            start: {
                text: "Hold. I'm Rook, village guard. Don't cause trouble here and we won't have problems.",
                options: [
                    { text: "Easy, I'm just passing through.", next: 'passing' },
                    { text: "What can you tell me about the area?", next: 'area_info' },
                    { text: "Understood.", end: true }
                ]
            },
            passing: {
                text: "Good. Elder Mara's hut is in the center of the village if you need anything. Hank's got a trading post to the east. Stay out of people's homes.",
                options: [
                    { text: "Thanks.", end: true },
                    { text: "Anything dangerous nearby?", next: 'danger_info' }
                ]
            },
            area_info: {
                text: "This is Dusthaven. Small but we get by. North of here are the caves — don't go there unless you want to lose a limb. South is open wasteland. East is raider territory.",
                options: [
                    { text: "Tell me about the caves.", next: 'danger_info' },
                    { text: "Raiders?", next: 'raider_mention' },
                    { text: "Got it. Thanks.", end: true }
                ]
            },
            danger_info: {
                text: "The caves are infested. We lost two good people in there. Elder Mara's been looking for someone to deal with it. Talk to her if you've got a death wish... or courage.",
                options: [
                    { text: "I might just do that.", end: true },
                    { text: "I'll steer clear.", end: true }
                ]
            },
            raider_mention: {
                text: "Small band of scavengers turned raiders. They camp out east somewhere. Haven't hit us yet but I expect they will eventually. I keep watch, but I'm just one guard.",
                options: [
                    { text: "Maybe I can help with that.", end: true },
                    { text: "Stay sharp.", end: true }
                ]
            },
            quest_active: {
                text: "Heard you're heading into the caves. Brave. Or foolish. Either way, watch your back in there. The critters come from all directions.",
                options: [
                    { text: "Any combat tips?", next: 'tips' },
                    { text: "I'll be fine.", end: true }
                ]
            },
            tips: {
                text: "Fight smart. Don't let them surround you — use narrow passages as chokepoints. Scorpions are tough but slow to react. And whatever's in the deep caves... hit it hard and fast.",
                options: [
                    { text: "Good advice. Thanks.", end: true }
                ]
            }
        }
    },

    // ---- VILLAGER SARAH ----
    villager_sarah: {
        getStartNode() { return 'start'; },
        nodes: {
            start: {
                text: "Oh, hello! I'm Sarah. I help tend the village garden. It's not much, but it keeps us fed.",
                options: [
                    { text: "How's life in Dusthaven?", next: 'life' },
                    {
                        text: "Those plants look like they could use some help.",
                        next: 'science_check',
                        skillCheck: { skill: 'science', difficulty: 25, xp: 20 },
                        successNode: 'science_success',
                        failNode: 'life'
                    },
                    { text: "Take care.", end: true }
                ]
            },
            life: {
                text: "It's quiet. Too quiet sometimes. But safe, mostly. The elder keeps us together. I worry about the caves though — strange sounds at night sometimes...",
                options: [
                    { text: "I'll look into it.", end: true },
                    { text: "Stay safe.", end: true }
                ]
            },
            science_success: {
                text: "You know about agriculture? That's incredible! Most people out here just know how to shoot. Here, take this — I found it near the old buildings. I can't read the label but maybe you can make use of it.",
                options: [
                    { text: "Thanks, Sarah.", end: true, action: (p, game) => {
                        InventorySystem.addItem(p, ItemDatabase.stimpak, 1);
                        game.addMessage('Sarah gave you a Stimpak!', 'loot');
                    }}
                ]
            }
        }
    },
};
