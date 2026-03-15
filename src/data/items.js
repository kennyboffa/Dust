// ============================================
// Dustwalker - Item Database
// ============================================

const ItemDatabase = {
    // ---- WEAPONS ----
    // Melee
    knife: {
        id: 'knife', name: 'Combat Knife', type: 'melee',
        damage: '1d4+1', range: 1, apCost: 3, skill: 'melee',
        weight: 1, value: 40,
        desc: 'A sharp, well-balanced combat knife. Standard wasteland sidearm.',
    },
    spear: {
        id: 'spear', name: 'Sharpened Spear', type: 'melee',
        damage: '1d6+2', range: 1, apCost: 4, skill: 'melee',
        weight: 4, value: 60,
        desc: 'A metal-tipped spear. Reliable and deadly.',
    },
    sledgehammer: {
        id: 'sledgehammer', name: 'Sledgehammer', type: 'melee',
        damage: '2d6', range: 1, apCost: 5, skill: 'melee',
        weight: 12, value: 120,
        desc: 'A massive sledgehammer. Slow but devastating.',
    },
    pipe_wrench: {
        id: 'pipe_wrench', name: 'Pipe Wrench', type: 'melee',
        damage: '1d6', range: 1, apCost: 4, skill: 'melee',
        weight: 5, value: 50,
        desc: 'A heavy pipe wrench. Doubles as a tool and weapon.',
    },

    // Ranged
    pipe_pistol: {
        id: 'pipe_pistol', name: 'Pipe Pistol', type: 'ranged',
        damage: '1d8', range: 8, apCost: 4, skill: 'smallGuns',
        weight: 3, value: 100, ammoType: '9mm',
        desc: 'A crude but functional pistol cobbled together from scrap.',
    },
    hunting_rifle: {
        id: 'hunting_rifle', name: 'Hunting Rifle', type: 'ranged',
        damage: '2d6+2', range: 12, apCost: 5, skill: 'smallGuns',
        weight: 7, value: 300, ammoType: '.308',
        desc: 'A pre-war hunting rifle. Accurate at long range.',
    },
    sawed_off: {
        id: 'sawed_off', name: 'Sawed-Off Shotgun', type: 'ranged',
        damage: '3d4', range: 3, apCost: 4, skill: 'smallGuns',
        weight: 5, value: 200, ammoType: '12ga',
        desc: 'A sawed-off double barrel. Deadly at close range.',
    },

    // ---- ARMOR ----
    leather_armor: {
        id: 'leather_armor', name: 'Leather Armor', type: 'armor',
        armorClass: 8, damageResist: 15,
        weight: 8, value: 150,
        desc: 'Tough leather armor. Basic but reliable protection.',
    },
    metal_armor: {
        id: 'metal_armor', name: 'Metal Armor', type: 'armor',
        armorClass: 15, damageResist: 30,
        weight: 18, value: 400,
        desc: 'Scrap metal shaped into armor plates. Heavy but strong.',
    },
    ragged_clothes: {
        id: 'ragged_clothes', name: 'Ragged Clothes', type: 'armor',
        armorClass: 2, damageResist: 0,
        weight: 2, value: 10,
        desc: 'Worn-out clothes. Better than nothing.',
    },
    tribal_garb: {
        id: 'tribal_garb', name: 'Tribal Garb', type: 'armor',
        armorClass: 5, damageResist: 5,
        weight: 4, value: 50,
        desc: 'Handmade clothing with bone and leather reinforcements.',
    },

    // ---- CONSUMABLES ----
    stimpak: {
        id: 'stimpak', name: 'Stimpak', type: 'consumable',
        usable: true, useEffect: 'heal', healAmount: 25,
        stackable: true, weight: 0.5, value: 75,
        desc: 'Auto-injecting stimulant. Restores 25 HP.',
    },
    healing_powder: {
        id: 'healing_powder', name: 'Healing Powder', type: 'consumable',
        usable: true, useEffect: 'heal', healAmount: 15,
        stackable: true, weight: 0.5, value: 20,
        desc: 'Dried medicinal herbs ground into powder. Restores 15 HP.',
    },
    antidote: {
        id: 'antidote', name: 'Antidote', type: 'consumable',
        usable: true, useEffect: 'antidote',
        stackable: true, weight: 0.5, value: 50,
        desc: 'Cures poison and related ailments.',
    },
    nuka_cola: {
        id: 'nuka_cola', name: 'Nuka-Cola', type: 'consumable',
        usable: true, useEffect: 'heal', healAmount: 5,
        stackable: true, weight: 1, value: 15,
        desc: 'A warm, flat soda. Mildly refreshing. Restores 5 HP.',
    },
    jet: {
        id: 'jet', name: 'Jet', type: 'consumable',
        usable: true, useEffect: 'buff', buffStat: 'agility', buffAmount: 2,
        buffDuration: 15, buffDesc: '+2 AGI for 15 turns.',
        stackable: true, weight: 0.5, value: 100,
        desc: 'Powerful inhaled stimulant. Temporarily boosts agility for 15 turns.',
    },
    buffout: {
        id: 'buffout', name: 'Buffout', type: 'consumable',
        usable: true, useEffect: 'buff', buffStat: 'strength', buffAmount: 2,
        buffDuration: 15, buffDesc: '+2 STR for 15 turns.',
        stackable: true, weight: 0.5, value: 100,
        desc: 'Steroid tablets. Temporarily boosts strength for 15 turns.',
    },
    mentats: {
        id: 'mentats', name: 'Mentats', type: 'consumable',
        usable: true, useEffect: 'buff', buffStat: 'intelligence', buffAmount: 2,
        buffDuration: 15, buffDesc: '+2 INT for 15 turns.',
        stackable: true, weight: 0.5, value: 100,
        desc: 'Brain-boosting chems. Temporarily boosts intelligence for 15 turns.',
    },

    // ---- AMMO ----
    ammo_9mm: {
        id: 'ammo_9mm', name: '9mm Rounds', type: 'ammo', ammoType: '9mm',
        stackable: true, weight: 0.1, value: 2,
        desc: 'Standard 9mm ammunition.',
    },
    ammo_308: {
        id: 'ammo_308', name: '.308 Rounds', type: 'ammo', ammoType: '.308',
        stackable: true, weight: 0.2, value: 5,
        desc: 'High-caliber rifle ammunition.',
    },
    ammo_12ga: {
        id: 'ammo_12ga', name: '12ga Shells', type: 'ammo', ammoType: '12ga',
        stackable: true, weight: 0.2, value: 4,
        desc: 'Shotgun shells.',
    },

    // ---- MISC / QUEST ----
    bottle_caps: {
        id: 'bottle_caps', name: 'Bottle Caps', type: 'misc',
        stackable: true, weight: 0, value: 1,
        desc: 'The currency of the wasteland.',
    },
    water_flask: {
        id: 'water_flask', name: 'Water Flask', type: 'misc',
        stackable: true, weight: 1, value: 20,
        desc: 'Clean drinking water. Precious commodity.',
    },
    scrap_metal: {
        id: 'scrap_metal', name: 'Scrap Metal', type: 'misc',
        stackable: true, weight: 2, value: 5,
        desc: 'Assorted scrap metal. Useful for repairs.',
    },
    cave_mushroom: {
        id: 'cave_mushroom', name: 'Cave Mushroom', type: 'misc',
        stackable: true, weight: 0.2, value: 10,
        desc: 'A bioluminescent mushroom from the caves. Has alchemical uses.',
    },
    old_map: {
        id: 'old_map', name: 'Old Map Fragment', type: 'quest',
        weight: 0.1, value: 0,
        desc: 'A tattered map fragment showing a location marked with an X.',
    },
    elder_amulet: {
        id: 'elder_amulet', name: "Elder's Amulet", type: 'quest',
        weight: 0.5, value: 0,
        desc: 'A carved bone amulet given by Elder Mara. It bears an ancient symbol.',
    },
    cave_crystal: {
        id: 'cave_crystal', name: 'Dust Crystal', type: 'quest',
        weight: 1, value: 200,
        desc: 'A shimmering crystal found deep in the caves. Radiates faint warmth.',
    },
    raider_badge: {
        id: 'raider_badge', name: 'Raider Badge', type: 'misc',
        stackable: true, weight: 0.1, value: 15,
        desc: 'A crude badge worn by raiders. Proof of a kill.',
    },
    raider_orders: {
        id: 'raider_orders', name: "Raider Orders", type: 'quest',
        weight: 0.1, value: 0,
        desc: 'Crumpled orders from the raider warlord. Mentions a planned attack on Dusthaven and references a "bunker full of pre-war tech" to the west.',
    },
    // ---- ACCESSORY ----
    lucky_charm: {
        id: 'lucky_charm', name: 'Lucky Charm', type: 'accessory',
        luck: 2,
        weight: 0.5, value: 80,
        desc: 'A strange trinket that seems to bring good fortune. +2 LCK when equipped.',
    },
    scout_goggles: {
        id: 'scout_goggles', name: 'Scout Goggles', type: 'accessory',
        perception: 1,
        weight: 0.5, value: 60,
        desc: 'Tinted goggles that sharpen your vision. +1 PER when equipped.',
    },
};
