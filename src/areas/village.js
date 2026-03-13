// ============================================
// Dustwalker - Dusthaven Village Area
// ============================================

function createVillageArea() {
    // 25x25 tile map - a small desert village with buildings, a well, garden, and paths
    // Legend:
    // d=dirt, s=sand, g=grass, r=road, S=stone, w=wall, W=wall_top, D=door, t=water, v=void, o=wood
    const tileKey = {
        'd': 'dirt',    's': 'sand',     'g': 'grass',   'r': 'road',
        'S': 'stone',   'w': 'wall',     'W': 'wall_top','D': 'door',
        't': 'water',   'v': 'void',     'o': 'wood',
    };

    const mapRaw = [
        'sssssssssssssssssssssssss',
        'ssssddddddsssssdddddddsss',
        'sssddddddddsssdddddddddss',
        'ssddddddddddrdddddddddddss',
        'ssddwwwwddddrdddddwwwwddss',
        'ssdwWWWWwdddrdddddwWWWwdss',
        'ssdwWWWWwdddrddddgwWWWwdss',
        'ssdwWDWWwdddrddddgwWDWwdss',
        'ssdddDddddddrddddgddDddss',
        'ssddddddddddrdddggddddddss',
        'sssdddddddddrdddgggdddddss',
        'sssddddrrrrrrrrrrddddddss',
        'sssddddrddddddddrddddddss',
        'ssdddddrddttttddrdddddddss',
        'ssdddddrdtttttddrddwwwwdss',
        'ssdddddrdtttttddrddwWWwdss',
        'ssdddddrdddttdddrdwWWWwdss',
        'ssdddddrddddddddrdwWDWwdss',
        'sssddddrrrrrrrrrrddddddss',
        'sssdddddddddddddddddddsss',
        'ssssddddddddddddddddddsss',
        'sssssdddddddddddddddddss',
        'ssssssdddddddddddddddss',
        'ssssssssddddddddddddssss',
        'sssssssssssssssssssssssss',
    ];

    const map = mapRaw.map(row =>
        row.split('').map(c => tileKey[c] || 'sand')
    );

    // Heights - walls are raised
    const heights = mapRaw.map(row =>
        row.split('').map(c => {
            if (c === 'w') return 2;
            if (c === 'W') return 3;
            if (c === 'D') return 0;
            return 0;
        })
    );

    // Walkability: walls and water are not walkable
    const blocked = new Set(['wall', 'wall_top', 'water', 'void']);

    // NPCs
    const entities = [
        CharacterSystem.createNPC({
            id: 'elder_mara',
            name: 'Elder Mara',
            spriteType: 'elder',
            x: 6, y: 6,
            dialogueId: 'elder_mara',
        }),
        CharacterSystem.createNPC({
            id: 'merchant_hank',
            name: 'Hank the Merchant',
            spriteType: 'merchant',
            x: 19, y: 16,
            dialogueId: 'merchant_hank',
        }),
        CharacterSystem.createNPC({
            id: 'guard_rook',
            name: 'Rook',
            spriteType: 'guard',
            x: 12, y: 3,
            dialogueId: 'guard_rook',
        }),
        CharacterSystem.createNPC({
            id: 'sarah',
            name: 'Sarah',
            spriteType: 'villager',
            x: 17, y: 9,
            dialogueId: 'villager_sarah',
        }),
        CharacterSystem.createNPC({
            id: 'villager1',
            name: 'Dusthaven Settler',
            spriteType: 'villager',
            x: 8, y: 11,
        }),
        CharacterSystem.createNPC({
            id: 'villager2',
            name: 'Dusthaven Settler',
            spriteType: 'villager',
            x: 15, y: 19,
        }),
    ];

    // Containers
    entities.push(CharacterSystem.createContainer(
        'village_crate1', 'Supply Crate', 5, 5,
        [
            { ...ItemDatabase.healing_powder, quantity: 2 },
            { ...ItemDatabase.bottle_caps, quantity: 30 },
        ],
        'crate'
    ));

    entities.push(CharacterSystem.createContainer(
        'village_chest', 'Old Chest', 20, 6,
        [
            { ...ItemDatabase.knife, quantity: 1 },
            { ...ItemDatabase.ragged_clothes, quantity: 1 },
            { ...ItemDatabase.nuka_cola, quantity: 2 },
        ],
        'chest'
    ));

    // Area transitions
    const transitions = [
        {
            x: 12, y: 0,
            label: 'To Caves',
            targetArea: 'cave',
            targetX: 7, targetY: 18,
        },
    ];

    return {
        id: 'village',
        name: 'Dusthaven Village',
        map,
        heights,
        blocked,
        entities,
        transitions,
        playerStart: { x: 12, y: 12 },
        ambientColor: '#c4943a22',
    };
}
