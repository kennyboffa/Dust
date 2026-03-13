// ============================================
// Dustwalker - Enemy Templates
// ============================================

const EnemyTemplates = {
    // ---- CAVE ENEMIES ----
    cave_rat: {
        name: 'Cave Rat',
        spriteType: 'rat',
        hp: 8,
        ap: 6,
        armorClass: 2,
        damageResist: 0,
        meleeDmg: 0,
        sequence: 8,
        critChance: 3,
        damage: '1d3',
        damageType: 'normal',
        xpReward: 25,
        attackRange: 1,
        moveSpeed: 1,
        aiType: 'aggressive',
        skills: { melee: 40, unarmed: 45 },
        loot: [
            { id: 'healing_powder', chance: 20, quantity: 1 },
        ]
    },

    giant_rat: {
        name: 'Giant Rat',
        spriteType: 'rat',
        hp: 18,
        ap: 7,
        armorClass: 4,
        damageResist: 5,
        meleeDmg: 1,
        sequence: 10,
        critChance: 5,
        damage: '1d6',
        damageType: 'normal',
        xpReward: 60,
        attackRange: 1,
        moveSpeed: 1,
        aiType: 'aggressive',
        skills: { melee: 55, unarmed: 55 },
        loot: [
            { id: 'healing_powder', chance: 30, quantity: 1 },
            { id: 'cave_mushroom', chance: 40, quantity: 1 },
        ]
    },

    rad_scorpion: {
        name: 'Rad Scorpion',
        spriteType: 'scorpion',
        hp: 30,
        ap: 7,
        armorClass: 8,
        damageResist: 10,
        meleeDmg: 2,
        sequence: 12,
        critChance: 8,
        damage: '1d8+2',
        damageType: 'poison',
        xpReward: 100,
        attackRange: 1,
        moveSpeed: 1,
        aiType: 'aggressive',
        skills: { melee: 65, unarmed: 65 },
        loot: [
            { id: 'antidote', chance: 25, quantity: 1 },
            { id: 'scrap_metal', chance: 40, quantity: 1 },
        ]
    },

    cave_spider: {
        name: 'Cave Spider',
        spriteType: 'cave_spider',
        hp: 15,
        ap: 8,
        armorClass: 5,
        damageResist: 0,
        meleeDmg: 1,
        sequence: 14,
        critChance: 10,
        damage: '1d4+1',
        damageType: 'poison',
        xpReward: 50,
        attackRange: 1,
        moveSpeed: 2,
        aiType: 'aggressive',
        skills: { melee: 50, unarmed: 55 },
        loot: [
            { id: 'antidote', chance: 30, quantity: 1 },
        ]
    },

    // ---- SURFACE ENEMIES ----
    raider: {
        name: 'Raider',
        spriteType: 'raider',
        hp: 25,
        ap: 8,
        armorClass: 6,
        damageResist: 10,
        meleeDmg: 2,
        sequence: 10,
        critChance: 6,
        damage: '1d6+2',
        damageType: 'normal',
        xpReward: 75,
        attackRange: 1,
        moveSpeed: 1,
        aiType: 'aggressive',
        skills: { melee: 55, unarmed: 45, smallGuns: 40 },
        loot: [
            { id: 'bottle_caps', chance: 80, quantity: 15 },
            { id: 'healing_powder', chance: 40, quantity: 1 },
            { id: 'knife', chance: 20, quantity: 1 },
            { id: 'raider_badge', chance: 60, quantity: 1 },
        ]
    },

    raider_gunner: {
        name: 'Raider Gunner',
        spriteType: 'raider',
        hp: 22,
        ap: 8,
        armorClass: 5,
        damageResist: 5,
        meleeDmg: 1,
        sequence: 12,
        critChance: 8,
        damage: '1d8',
        damageType: 'normal',
        xpReward: 100,
        attackRange: 8,
        moveSpeed: 1,
        aiType: 'ranged',
        skills: { smallGuns: 55, melee: 35 },
        loot: [
            { id: 'bottle_caps', chance: 70, quantity: 20 },
            { id: 'ammo_9mm', chance: 60, quantity: 10 },
            { id: 'stimpak', chance: 20, quantity: 1 },
        ]
    },

    // ---- BOSS ----
    mutant_brute: {
        name: 'Mutant Brute',
        spriteType: 'mutant',
        hp: 80,
        ap: 8,
        armorClass: 12,
        damageResist: 25,
        meleeDmg: 5,
        sequence: 8,
        critChance: 10,
        damage: '2d8+3',
        damageType: 'normal',
        xpReward: 300,
        attackRange: 1,
        moveSpeed: 1,
        aiType: 'aggressive',
        skills: { melee: 75, unarmed: 80 },
        loot: [
            { id: 'bottle_caps', chance: 100, quantity: 100 },
            { id: 'stimpak', chance: 80, quantity: 2 },
            { id: 'sledgehammer', chance: 50, quantity: 1 },
            { id: 'cave_crystal', chance: 100, quantity: 1 },
        ]
    },
};
