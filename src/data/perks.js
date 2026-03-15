// ============================================
// Dustwalker - Perks System
// ============================================

const PerkDatabase = [
    {
        id: 'toughness',
        name: 'Toughness',
        desc: '+20% damage resistance. You shrug off hits like a wasteland veteran.',
        levelReq: 2,
        statReq: { endurance: 5 },
        effect: (player) => { player.stats.damageResist += 20; },
    },
    {
        id: 'quick_pockets',
        name: 'Quick Pockets',
        desc: 'Using items in combat costs 1 less AP.',
        levelReq: 2,
        statReq: { agility: 5 },
        effect: () => {},
    },
    {
        id: 'sharpshooter',
        name: 'Sharpshooter',
        desc: '+15% hit chance with ranged weapons. Steady hands, steady aim.',
        levelReq: 3,
        statReq: { perception: 6 },
        effect: (player) => {
            player.skills.smallGuns = (player.skills.smallGuns || 0) + 15;
        },
    },
    {
        id: 'iron_fist',
        name: 'Iron Fist',
        desc: '+3 melee damage. Your fists and weapons hit harder.',
        levelReq: 2,
        statReq: { strength: 6 },
        effect: (player) => { player.stats.meleeDmg += 3; },
    },
    {
        id: 'fortune_finder',
        name: 'Fortune Finder',
        desc: 'Find more caps in containers and on enemies. Luck favors the greedy.',
        levelReq: 2,
        statReq: { luck: 6 },
        effect: () => {},
    },
    {
        id: 'medic',
        name: 'Field Medic',
        desc: 'Healing items restore 50% more HP. Every stimpak counts.',
        levelReq: 3,
        statReq: { intelligence: 6 },
        effect: () => {},
    },
    {
        id: 'swift_learner',
        name: 'Swift Learner',
        desc: '+20% XP from all sources. Knowledge is power.',
        levelReq: 2,
        statReq: { intelligence: 5 },
        effect: () => {},
    },
    {
        id: 'stonewall',
        name: 'Stonewall',
        desc: '+3 Armor Class. You become harder to hit.',
        levelReq: 3,
        statReq: { agility: 6 },
        effect: (player) => { player.stats.armorClass += 3; },
    },
    {
        id: 'silver_tongue',
        name: 'Silver Tongue',
        desc: '+20 Speech skill. Words are your greatest weapon.',
        levelReq: 2,
        statReq: { charisma: 6 },
        effect: (player) => { player.skills.speech = (player.skills.speech || 0) + 20; },
    },
    {
        id: 'bonus_move',
        name: 'Bonus Move',
        desc: '+2 max Action Points. More actions per turn.',
        levelReq: 4,
        statReq: { agility: 7 },
        effect: (player) => { player.stats.maxAp += 2; },
    },
];

class PerkSystem {
    static getAvailablePerks(player) {
        return PerkDatabase.filter(perk => {
            // Already has it?
            if (player.perks.includes(perk.id)) return false;
            // Level check
            if (player.level < perk.levelReq) return false;
            // Stat check
            for (const [stat, val] of Object.entries(perk.statReq)) {
                if ((player.special[stat] || 0) < val) return false;
            }
            return true;
        });
    }

    static applyPerk(player, perkId) {
        const perk = PerkDatabase.find(p => p.id === perkId);
        if (!perk) return false;
        if (player.perks.includes(perkId)) return false;
        player.perks.push(perkId);
        perk.effect(player);
        return true;
    }

    static reapplyPerks(player) {
        for (const perkId of player.perks) {
            const perk = PerkDatabase.find(p => p.id === perkId);
            if (perk) perk.effect(player);
        }
    }

    static hasPerk(player, perkId) {
        return player.perks.includes(perkId);
    }
}
