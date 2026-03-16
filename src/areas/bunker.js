// ============================================
// Dustwalker - Pre-War Bunker Area
// ============================================

function createBunkerArea() {
    // 22x22 underground military bunker - tight corridors, locked rooms, terminals
    const tileKey = {
        'S': 'stone', 'w': 'wall', 'D': 'door', 'o': 'wood',
        'v': 'void', 'c': 'cave_floor', 'C': 'crystal',
    };

    const mapRaw = [
        'vvvvvvvvvvvvvvvvvvvvvv',
        'vvvvvwwwwDwwwwvvvvvvvv',
        'vvvvvwooooooowvvvvvvvv',
        'vvvvvwooooooowvvvvvvvv',
        'vvvvvwooooooowwwwwwwvv',
        'vvwwwwoooooooDooooowvv',
        'vvwooDooooooowoooooD vv',
        'vvwoowooooooowoooooD vv',
        'vvwoowooooooowoooooD vv',
        'vvwoowooooooowoooooD vv',
        'vvwwwwwDwwwwwwwwDwwwvv',
        'vvwoooooooccccoooooovv',
        'vvwoooooooccccoooooovv',
        'vvwoooooooocccoooooovv',
        'vvwwwwDwwwwwwwwwDwwwvv',
        'vvwooooowvvvwooooowvv',
        'vvwooooowvvvwooooowvv',
        'vvwooCoowvvvwooCo owvv',
        'vvwwDwwwwvvvwwDwwwwvv',
        'vvvvcccccvvvvcccccvvvv',
        'vvvvcccccvvvvcccccvvvv',
        'vvvvvvvvvvvvvvvvvvvvvv',
    ];

    const map = mapRaw.map(row =>
        row.split('').map(c => tileKey[c.trim()] || 'void')
    );

    const heights = mapRaw.map(row =>
        row.split('').map(c => c === 'w' ? 2 : 0)
    );

    const blocked = new Set(['wall', 'void']);

    const entities = [];

    // Security robots / mutant guards
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.security_bot || EnemyTemplates.mutant_brute, 7, 3));
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.security_bot || EnemyTemplates.raider, 12, 8));
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.security_bot || EnemyTemplates.raider_gunner, 4, 12));
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.mutant_brute, 15, 16));
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.rad_scorpion, 8, 19));
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.cave_spider, 14, 19));

    // Loot containers - mostly locked
    const techCache = CharacterSystem.createContainer(
        'bunker_tech', 'Pre-War Terminal Cache', 6, 2,
        [
            { ...ItemDatabase.electronic_lockpick, quantity: 1 },
            { ...ItemDatabase.stimpak, quantity: 4 },
            { ...ItemDatabase.bottle_caps, quantity: 300 },
        ],
        'chest'
    );
    techCache.locked = true;
    techCache.lockDifficulty = 75;
    entities.push(techCache);

    const armory = CharacterSystem.createContainer(
        'bunker_armory', 'Military Armory Locker', 15, 6,
        [
            { ...ItemDatabase.hunting_rifle, quantity: 1 },
            { ...ItemDatabase.ammo_308, quantity: 30 },
            { ...ItemDatabase.ammo_9mm, quantity: 40 },
            { ...ItemDatabase.metal_armor, quantity: 1 },
        ],
        'chest'
    );
    armory.locked = true;
    armory.lockDifficulty = 80;
    entities.push(armory);

    entities.push(CharacterSystem.createContainer(
        'bunker_supplies', 'Emergency Supplies', 3, 6,
        [
            { ...ItemDatabase.stimpak, quantity: 3 },
            { ...ItemDatabase.nuka_cola, quantity: 4 },
            { ...ItemDatabase.water_flask, quantity: 2 },
            { ...ItemDatabase.lockpick, quantity: 4 },
        ],
        'crate'
    ));

    const vaultChest = CharacterSystem.createContainer(
        'bunker_vault', 'Sealed Vault Container', 8, 17,
        [
            { ...ItemDatabase.sledgehammer, quantity: 1 },
            { ...ItemDatabase.stimpak, quantity: 5 },
            { ...ItemDatabase.bottle_caps, quantity: 500 },
            { ...ItemDatabase.lucky_charm, quantity: 1 },
        ],
        'chest'
    );
    vaultChest.locked = true;
    vaultChest.lockDifficulty = 90;
    entities.push(vaultChest);

    entities.push(CharacterSystem.createContainer(
        'bunker_lab', 'Research Samples', 14, 17,
        [
            { ...ItemDatabase.antidote, quantity: 3 },
            { ...ItemDatabase.cave_mushroom, quantity: 5 },
            { ...ItemDatabase.jet, quantity: 2 },
            { ...ItemDatabase.buffout, quantity: 2 },
        ],
        'crate'
    ));

    // Environment
    const env = (id, sprite, x, y, name, blocking = true) => ({
        id, name: name || sprite, type: 'environment', spriteType: sprite,
        x, y, facing: 'south', isHostile: false, blocking,
    });
    entities.push(env('bk_ruins1', 'ruins', 10, 12, 'Collapsed Ceiling'));
    entities.push(env('bk_ruins2', 'ruins', 11, 12, 'Rubble'));
    entities.push(env('bk_wreck1', 'wreckage', 5, 8, 'Broken Terminal'));
    entities.push(env('bk_wreck2', 'wreckage', 16, 8, 'Destroyed Console'));
    entities.push(env('bk_bones1', 'bones', 3, 16, 'Pre-War Skeleton', false));
    entities.push(env('bk_bones2', 'bones', 16, 15, 'Skeletal Remains', false));

    const transitions = [
        {
            x: 7, y: 1,
            label: 'Exit Bunker',
            targetArea: 'oasis',
            targetX: 12, targetY: 12,
        },
    ];

    return {
        id: 'bunker',
        name: 'Pre-War Military Bunker',
        map,
        heights,
        blocked,
        entities,
        transitions,
        playerStart: { x: 7, y: 2 },
        ambientColor: '#0a0c1811',
    };
}
