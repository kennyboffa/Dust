// ============================================
// Dustwalker - Cave Area
// ============================================

function createCaveArea() {
    // 20x20 cave map - winding tunnels, chambers, a boss room
    // Legend:
    // f=cave_floor, w=cave_wall, r=cave_rock, c=crystal, v=void
    const tileKey = {
        'f': 'cave_floor', 'w': 'cave_wall', 'r': 'cave_rock',
        'c': 'crystal',    'v': 'void',
    };

    const mapRaw = [
        'wwwwwwwwwwwwwwwwwwww',
        'wwwwwwffffffffffwwww',
        'wwwwwfffrffffrfffwww',
        'wwwwfffwwwffwwfffwww',
        'wwwffffwwwffwwffffww',
        'wwwfffrwwfffwwrfffww',
        'wwffffrrrffffrrfffww',
        'wwffffffffffffffff ww',
        'wwffrfffffffrrffrfww',
        'wwwfffrrffrrrfffwwww',
        'wwwwfffffrrfffffwwww',
        'wwwwwffffffffffwwwww',
        'wwwwffffrfffffrffwww',
        'wwwfffffwwwwfffffwww',
        'wwwffcfwwwwwffcffwww',
        'wwwfffffwwwffffffwww',
        'wwwwfffffffffffwwwww',
        'wwwwwwfffffffwwwwwww',
        'wwwwwwwffffffwwwwwww',
        'wwwwwwwwwwwwwwwwwwww',
    ];

    const map = mapRaw.map(row =>
        row.split('').map(c => tileKey[c.trim()] || 'void')
    );

    // Heights - walls are tall, rocks are medium
    const heights = mapRaw.map(row =>
        row.split('').map(c => {
            if (c === 'w') return 3;
            if (c === 'r') return 1;
            if (c === 'c') return 0;
            return 0;
        })
    );

    const blocked = new Set(['cave_wall', 'cave_rock', 'void']);

    // Enemies
    const entities = [];

    // Entry chamber - a few rats
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.cave_rat, 8, 2));
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.cave_rat, 12, 3));

    // Mid tunnels - rats and spiders
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.cave_rat, 5, 6));
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.giant_rat, 14, 7));
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.cave_spider, 10, 8));

    // Central chamber - scorpion
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.rad_scorpion, 9, 10));
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.cave_spider, 7, 11));

    // Deep caves - more scorpions
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.rad_scorpion, 12, 13));
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.cave_spider, 5, 14));

    // Boss chamber - Mutant Brute
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.mutant_brute, 9, 16));

    // Loot containers
    entities.push(CharacterSystem.createContainer(
        'cave_chest1', 'Old Footlocker', 14, 2,
        [
            { ...ItemDatabase.ammo_9mm, quantity: 12 },
            { ...ItemDatabase.healing_powder, quantity: 1 },
            { ...ItemDatabase.bottle_caps, quantity: 25 },
        ],
        'chest'
    ));

    entities.push(CharacterSystem.createContainer(
        'cave_chest2', 'Rusted Box', 3, 7,
        [
            { ...ItemDatabase.stimpak, quantity: 1 },
            { ...ItemDatabase.pipe_wrench, quantity: 1 },
        ],
        'chest'
    ));

    entities.push(CharacterSystem.createContainer(
        'cave_chest3', 'Crystal Cache', 6, 14,
        [
            { ...ItemDatabase.cave_mushroom, quantity: 3 },
            { ...ItemDatabase.antidote, quantity: 2 },
        ],
        'crate'
    ));

    entities.push(CharacterSystem.createContainer(
        'cave_boss_chest', 'Ancient Strongbox', 9, 17,
        [
            { ...ItemDatabase.hunting_rifle, quantity: 1 },
            { ...ItemDatabase.ammo_308, quantity: 20 },
            { ...ItemDatabase.stimpak, quantity: 3 },
            { ...ItemDatabase.metal_armor, quantity: 1 },
            { ...ItemDatabase.bottle_caps, quantity: 150 },
            { ...ItemDatabase.old_map, quantity: 1 },
        ],
        'chest'
    ));

    // Area transitions
    const transitions = [
        {
            x: 7, y: 18,
            label: 'Exit to Village',
            targetArea: 'village',
            targetX: 12, targetY: 2,
        },
        {
            x: 9, y: 18,
            label: 'Exit to Village',
            targetArea: 'village',
            targetX: 12, targetY: 2,
        },
    ];

    return {
        id: 'cave',
        name: 'Dusthaven Caves',
        map,
        heights,
        blocked,
        entities,
        transitions,
        playerStart: { x: 7, y: 18 },
        ambientColor: '#00000066',
    };
}
