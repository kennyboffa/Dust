// ============================================
// Dustwalker - Character System (S.P.E.C.I.A.L.)
// ============================================

const SPECIAL_STATS = {
    strength:     { abbr: 'STR', desc: 'Raw physical power. Melee damage, carry weight.' },
    perception:   { abbr: 'PER', desc: 'Awareness and accuracy. Ranged attacks, detection.' },
    endurance:    { abbr: 'END', desc: 'Stamina and resilience. HP, resistances.' },
    charisma:     { abbr: 'CHR', desc: 'Social influence. Barter prices, dialogue options.' },
    intelligence: { abbr: 'INT', desc: 'Mental acuity. Skill points per level, skill checks.' },
    agility:      { abbr: 'AGI', desc: 'Speed and reflexes. Action Points, dodge chance.' },
    luck:         { abbr: 'LCK', desc: 'Fortune favors the bold. Critical chance, random finds.' }
};

const SKILLS = {
    // Combat
    smallGuns:    { name: 'Small Guns',    base: (s) => 5 + s.agility * 4,        category: 'Combat' },
    bigGuns:      { name: 'Big Guns',      base: (s) => 2 + s.agility * 2,        category: 'Combat' },
    energyWeapons:{ name: 'Energy Weapons',base: (s) => 2 + s.perception * 2,     category: 'Combat' },
    melee:        { name: 'Melee',         base: (s) => 20 + s.strength * 2 + s.agility * 2, category: 'Combat' },
    unarmed:      { name: 'Unarmed',       base: (s) => 30 + s.strength * 2 + s.agility * 2, category: 'Combat' },
    throwing:     { name: 'Throwing',      base: (s) => 4 * s.agility,            category: 'Combat' },
    // Support
    firstAid:     { name: 'First Aid',     base: (s) => 2 * (s.perception + s.intelligence), category: 'Support' },
    doctor:       { name: 'Doctor',        base: (s) => 5 + s.perception + s.intelligence,   category: 'Support' },
    sneak:        { name: 'Sneak',         base: (s) => 5 + 3 * s.agility,        category: 'Support' },
    lockpick:     { name: 'Lockpick',      base: (s) => 10 + s.perception + s.agility, category: 'Support' },
    steal:        { name: 'Steal',         base: (s) => 3 * s.agility,            category: 'Support' },
    traps:        { name: 'Traps',         base: (s) => 10 + s.perception + s.agility, category: 'Support' },
    science:      { name: 'Science',       base: (s) => 4 * s.intelligence,       category: 'Support' },
    repair:       { name: 'Repair',        base: (s) => 3 * s.intelligence,       category: 'Support' },
    // Social
    speech:       { name: 'Speech',        base: (s) => 5 * s.charisma,           category: 'Social' },
    barter:       { name: 'Barter',        base: (s) => 4 * s.charisma,           category: 'Social' },
    // Knowledge
    outdoorsman:  { name: 'Outdoorsman',   base: (s) => 2 * (s.endurance + s.intelligence), category: 'Knowledge' },
};

class CharacterSystem {
    static createPlayer(name, special, tagSkills) {
        const player = {
            id: 'player',
            name: name,
            type: 'player',
            spriteType: 'player',
            x: 0,
            y: 0,
            facing: 'south',

            level: 1,
            xp: 0,
            xpToNext: 1000,

            special: { ...special },
            tagSkills: [...tagSkills],
            skillPoints: 0,
            skillBonuses: {},  // extra points invested

            stats: {},
            perks: [],

            equipment: {
                weapon: null,
                armor: null,
                accessory: null
            },

            inventory: [],
            maxCarryWeight: 0,

            questFlags: {},
            killedEnemies: {},
        };

        CharacterSystem.recalcStats(player);
        player.stats.hp = player.stats.maxHp;
        player.stats.ap = player.stats.maxAp;

        return player;
    }

    static recalcStats(char) {
        const s = char.special;

        // Derived stats
        char.stats.maxHp = 15 + s.strength + (s.endurance * 2) + (char.level * (2 + Math.floor(s.endurance / 2)));
        char.stats.maxAp = 5 + Math.floor(s.agility / 2);
        char.maxCarryWeight = 25 + s.strength * 25;

        // Combat stats
        char.stats.meleeDmg = Math.max(1, s.strength - 5);
        char.stats.critChance = s.luck;
        char.stats.armorClass = s.agility;
        char.stats.damageResist = 0;
        char.stats.poisonResist = s.endurance * 5;
        char.stats.radiationResist = (s.endurance - 1) * 2;
        char.stats.sequence = 2 * s.perception;
        char.stats.healRate = Math.max(1, Math.floor(s.endurance / 3));

        // Apply armor bonuses
        if (char.equipment && char.equipment.armor) {
            const armor = char.equipment.armor;
            char.stats.armorClass += armor.armorClass || 0;
            char.stats.damageResist += armor.damageResist || 0;
        }

        // Apply accessory bonuses (to derived stats directly)
        if (char.equipment && char.equipment.accessory) {
            const acc = char.equipment.accessory;
            if (acc.luck) char.stats.critChance += acc.luck;
            if (acc.perception) char.stats.sequence += acc.perception * 2;
            if (acc.armorClass) char.stats.armorClass += acc.armorClass;
        }

        // Calculate skills
        char.skills = {};
        for (const [key, skill] of Object.entries(SKILLS)) {
            let value = skill.base(s);
            if (char.tagSkills.includes(key)) value += 20;
            value += (char.skillBonuses[key] || 0);
            char.skills[key] = Math.min(200, value);
        }

        // Skill points per level
        char.stats.skillPointsPerLevel = 5 + (s.intelligence * 2);

        // Reapply perks that modify stats
        if (char.perks && char.perks.length > 0 && typeof PerkSystem !== 'undefined') {
            PerkSystem.reapplyPerks(char);
        }

        // Clamp HP
        if (char.stats.hp !== undefined) {
            char.stats.hp = Math.min(char.stats.hp, char.stats.maxHp);
        }
    }

    static getSkillValue(char, skillName) {
        return char.skills[skillName] || 0;
    }

    static skillCheck(char, skillName, difficulty) {
        const skill = CharacterSystem.getSkillValue(char, skillName);
        const roll = Utils.randInt(1, 100);
        const success = roll <= skill - difficulty;
        return {
            success,
            roll,
            skill,
            difficulty,
            margin: skill - difficulty - roll
        };
    }

    static addXP(char, amount) {
        if (char.perks && char.perks.includes('swift_learner')) {
            amount = Math.floor(amount * 1.2);
        }
        char.xp += amount;
        const leveled = char.xp >= char.xpToNext;
        if (leveled) {
            char.level++;
            char.xp -= char.xpToNext;
            char.xpToNext = char.level * 1000;
            char.skillPoints += char.stats.skillPointsPerLevel;
            char.stats.hp = char.stats.maxHp;
            CharacterSystem.recalcStats(char);
        }
        return leveled;
    }

    static investSkillPoint(char, skillName) {
        if (char.skillPoints <= 0) return false;
        if (!char.skillBonuses[skillName]) char.skillBonuses[skillName] = 0;
        // Tag skills get 2 points per investment
        const amount = char.tagSkills.includes(skillName) ? 2 : 1;
        char.skillBonuses[skillName] += amount;
        char.skillPoints--;
        CharacterSystem.recalcStats(char);
        return true;
    }

    static createNPC(template) {
        const npc = {
            id: template.id || Utils.uid(),
            name: template.name,
            type: 'npc',
            spriteType: template.spriteType || 'villager',
            x: template.x,
            y: template.y,
            facing: template.facing || 'south',
            dialogueId: template.dialogueId || null,
            isHostile: false,
            stats: {
                hp: template.hp || 30,
                maxHp: template.hp || 30,
            },
            schedule: template.schedule || null,
            flags: template.flags || {},
        };
        return npc;
    }

    static createEnemy(template, x, y) {
        const enemy = {
            id: Utils.uid(),
            name: template.name,
            type: 'enemy',
            spriteType: template.spriteType,
            x: x !== undefined ? x : template.x,
            y: y !== undefined ? y : template.y,
            facing: 'south',
            isHostile: true,
            aiType: template.aiType || 'aggressive',

            special: template.special || { strength: 5, perception: 5, endurance: 5, charisma: 1, intelligence: 2, agility: 5, luck: 5 },
            stats: {
                hp: template.hp,
                maxHp: template.hp,
                ap: template.ap || 8,
                maxAp: template.ap || 8,
                armorClass: template.armorClass || 0,
                damageResist: template.damageResist || 0,
                meleeDmg: template.meleeDmg || 0,
                sequence: template.sequence || 10,
                critChance: template.critChance || 5,
            },

            skills: template.skills || { melee: 50, unarmed: 50 },
            damage: template.damage || '1d4',
            damageType: template.damageType || 'normal',
            xpReward: template.xpReward || 50,
            loot: template.loot || [],
            attackRange: template.attackRange || 1,
            moveSpeed: template.moveSpeed || 1,
        };
        return enemy;
    }

    static createContainer(id, name, x, y, items, spriteType = 'chest') {
        return {
            id,
            name,
            type: 'container',
            spriteType,
            x, y,
            facing: 'south',
            isHostile: false,
            items: items.map(i => ({ ...i })),
            locked: false,
            lockDifficulty: 0,
        };
    }

    static heal(char, amount) {
        char.stats.hp = Math.min(char.stats.maxHp, char.stats.hp + amount);
    }

    static takeDamage(char, amount) {
        // Apply damage resist
        const resist = char.stats.damageResist || 0;
        const actualDmg = Math.max(1, amount - Math.floor(amount * resist / 100));
        char.stats.hp -= actualDmg;
        return { damage: actualDmg, killed: char.stats.hp <= 0 };
    }

    static restoreAP(char) {
        char.stats.ap = char.stats.maxAp;
    }

    static useAP(char, cost) {
        if (char.stats.ap < cost) return false;
        char.stats.ap -= cost;
        return true;
    }

    static getCarryWeight(char) {
        if (!char.inventory) return 0;
        return char.inventory.reduce((sum, item) => sum + (item.weight || 0) * (item.quantity || 1), 0);
    }
}
