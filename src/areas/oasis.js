// ============================================
// Dustwalker - Desert Oasis Area
// ============================================

function createOasisArea() {
    // 24x24 desert oasis - water, greenery, trader camp, cave entrance to bunker
    const tileKey = {
        'd': 'dirt', 's': 'sand', 'g': 'grass', 'r': 'road',
        'S': 'stone', 'w': 'wall', 'D': 'door', 'o': 'wood',
        't': 'water', 'v': 'void',
    };

    const mapRaw = [
        'ssssssssssssssssssssssss',
        'ssssddddddssssdddddssss',
        'sssddddddddsddddddddsss',
        'ssddddgggddddddgggdddss',
        'ssdddgggggddddgggggddss',
        'ssddgggtggdddddggtggdss',
        'ssddggttgdddddddgttgdss',
        'ssdddgttgddrrddddgttdss',
        'ssddddggdddrrdddddgddss',
        'sssddddddddrrdddddddsss',
        'sssddddddddrrdddddddss',
        'sssddwwwwddrrddwwwwddss',
        'ssddwooowddrrdwooowddss',
        'ssddwoooD ddrrdDooowddss',
        'ssddwooowddrrdwooowddss',
        'ssddwwwwwddrrddwwwwddss',
        'sssddddddddrrddddddss',
        'sssddddddddrrdddddddss',
        'sssddddSSddrrdSSddddss',
        'sssddddSSddrrdSSddddss',
        'ssssdddddddrrddddddss',
        'ssssdddddddrrddddddss',
        'sssssddddddrrddddddss',
        'ssssssssssssssssssssssss',
    ];

    const map = mapRaw.map(row =>
        row.split('').map(c => tileKey[c.trim()] || 'sand')
    );

    const heights = mapRaw.map(row =>
        row.split('').map(c => c === 'w' ? 2 : c === 'S' ? 1 : 0)
    );

    const blocked = new Set(['wall', 'water', 'void']);

    const entities = [];

    // Friendly trader NPCs
    entities.push(CharacterSystem.createNPC({
        id: 'oasis_trader',
        name: 'Zara the Caravan Master',
        spriteType: 'merchant',
        x: 5, y: 13,
        dialogueId: 'wasteland_trader',
    }));
    entities.push(CharacterSystem.createNPC({
        id: 'oasis_guard1',
        name: 'Caravan Guard',
        spriteType: 'guard',
        x: 4, y: 11,
    }));
    entities.push(CharacterSystem.createNPC({
        id: 'oasis_guard2',
        name: 'Caravan Guard',
        spriteType: 'guard',
        x: 19, y: 14,
    }));
    entities.push(CharacterSystem.createNPC({
        id: 'oasis_hermit',
        name: 'Old Ezra',
        spriteType: 'elder',
        x: 18, y: 13,
        dialogueId: 'elder_mara', // Reuse elder dialogue for now
    }));
    entities.push(CharacterSystem.createNPC({
        id: 'oasis_settler1',
        name: 'Oasis Settler',
        spriteType: 'villager',
        x: 10, y: 4,
    }));

    // Some hostile wildlife near the edges
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.rad_scorpion, 2, 18));
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.giant_rat, 21, 3));
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.giant_rat, 22, 5));

    // Containers
    entities.push(CharacterSystem.createContainer(
        'oasis_crate1', 'Trader Supplies', 6, 12,
        [
            { ...ItemDatabase.stimpak, quantity: 2 },
            { ...ItemDatabase.healing_powder, quantity: 3 },
            { ...ItemDatabase.water_flask, quantity: 3 },
            { ...ItemDatabase.lockpick, quantity: 2 },
        ],
        'crate'
    ));

    const lockedTrader = CharacterSystem.createContainer(
        'oasis_locked', 'Zara\'s Personal Chest', 5, 14,
        [
            { ...ItemDatabase.pipe_pistol, quantity: 1 },
            { ...ItemDatabase.ammo_9mm, quantity: 20 },
            { ...ItemDatabase.bottle_caps, quantity: 150 },
            { ...ItemDatabase.electronic_lockpick, quantity: 1 },
        ],
        'chest'
    );
    lockedTrader.locked = true;
    lockedTrader.lockDifficulty = 55;
    entities.push(lockedTrader);

    entities.push(CharacterSystem.createContainer(
        'oasis_hermit_box', 'Ezra\'s Trunk', 19, 13,
        [
            { ...ItemDatabase.healing_powder, quantity: 4 },
            { ...ItemDatabase.antidote, quantity: 2 },
            { ...ItemDatabase.cave_mushroom, quantity: 3 },
            { ...ItemDatabase.nuka_cola, quantity: 2 },
        ],
        'chest'
    ));

    // Environment
    const env = (id, sprite, x, y, name, blocking = true) => ({
        id, name: name || sprite, type: 'environment', spriteType: sprite,
        x, y, facing: 'south', isHostile: false, blocking,
    });
    entities.push(env('oasis_tree1', 'dead_tree', 3, 3, 'Palm Stump'));
    entities.push(env('oasis_tree2', 'dead_tree', 20, 8, 'Twisted Tree'));
    entities.push(env('oasis_tree3', 'dead_tree', 8, 17, 'Dead Palm'));
    entities.push(env('oasis_cactus1', 'cactus', 1, 10, 'Cactus'));
    entities.push(env('oasis_cactus2', 'cactus', 22, 16, 'Barrel Cactus'));
    entities.push(env('oasis_rocks1', 'rock_formation', 9, 19, 'Bunker Entrance Rocks'));
    entities.push(env('oasis_rocks2', 'rock_formation', 14, 19, 'Stone Marker'));
    entities.push(env('oasis_campfire', 'campfire', 12, 9, 'Trading Post Fire', false));
    entities.push(env('oasis_sign', 'signpost', 11, 22, 'Road Sign', false));
    entities.push(env('oasis_bones', 'bones', 21, 19, 'Bleached Bones', false));
    entities.push(env('oasis_wreck1', 'wreckage', 1, 20, 'Rusted Truck'));
    entities.push(env('oasis_ruins1', 'ruins', 15, 3, 'Old Foundation'));

    const transitions = [
        {
            x: 11, y: 23,
            label: 'To Village Road',
            targetArea: 'village',
            targetX: 0, targetY: 12,
        },
        {
            x: 12, y: 23,
            label: 'To Village Road',
            targetArea: 'village',
            targetX: 0, targetY: 12,
        },
        {
            x: 10, y: 19,
            label: 'Enter Bunker',
            targetArea: 'bunker',
            targetX: 7, targetY: 2,
        },
    ];

    return {
        id: 'oasis',
        name: 'Desert Oasis - Trading Post',
        map,
        heights,
        blocked,
        entities,
        transitions,
        playerStart: { x: 12, y: 22 },
        ambientColor: '#c4943a11',
    };
}
