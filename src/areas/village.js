// ============================================
// Dustwalker - Dusthaven Village Area
// ============================================

function createVillageArea() {
    // 25x25 tile map - a small desert village with buildings, a well, garden, and paths
    // Legend:
    // d=dirt, s=sand, g=grass, r=road, S=stone, w=wall, D=door, t=water, v=void, o=wood
    const tileKey = {
        'd': 'dirt',    's': 'sand',     'g': 'grass',   'r': 'road',
        'S': 'stone',   'w': 'wall',     'D': 'door',
        't': 'water',   'v': 'void',     'o': 'wood',
    };

    // Buildings now have wood (o) floors inside, walls around edges
    // Doors (D) provide entry
    const mapRaw = [
        'sssssssssssssssssssssssss',
        'ssssddddddsssssdddddddsss',
        'sssddddddddsssdddddddddss',
        'ssddddddddddrdddddddddddss',
        'ssddwwwwddddrdddddwwwwddss',
        'ssdwoooowd ddrdddddwooowd ss',
        'ssdwoooowdddrddddgwooowd ss',
        'ssdwoDoowd ddrddddgwoDowdss',
        'ssdddDddddddrddddgddDddss',
        'ssddddddddddrdddggddddddss',
        'sssdddddddddrdddgggdddddss',
        'sssddddrrrrrrrrrrddddddss',
        'sssddddrddddddddrddddddss',
        'ssdddddrddttttddrdddddddss',
        'ssdddddrdtttttddrddwwwwdss',
        'ssdddddrdtttttddrddwoowdss',
        'ssdddddrdddttdddrdwooowd ss',
        'ssdddddrddddddddrdwoDowdss',
        'sssddddrrrrrrrrrrddddddss',
        'sssdddddddddddddddddddsss',
        'ssssddddddddddddddddddsss',
        'sssssdddddddddddddddddss',
        'ssssssdddddddddddddddss',
        'ssssssssddddddddddddssss',
        'sssssssssssssssssssssssss',
    ];

    const map = mapRaw.map(row =>
        row.split('').map(c => tileKey[c.trim()] || 'sand')
    );

    // Heights - only walls are raised
    const heights = mapRaw.map(row =>
        row.split('').map(c => {
            if (c === 'w') return 2;
            return 0;
        })
    );

    // Walkability: walls and water are not walkable (wood floors & doors ARE walkable now)
    const blocked = new Set(['wall', 'water', 'void']);

    // NPCs - move elder inside building
    const entities = [
        CharacterSystem.createNPC({
            id: 'elder_mara',
            name: 'Elder Mara',
            spriteType: 'elder',
            x: 5, y: 6,
            dialogueId: 'elder_mara',
        }),
        CharacterSystem.createNPC({
            id: 'merchant_hank',
            name: 'Hank the Merchant',
            spriteType: 'merchant',
            x: 20, y: 16,
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

    // Containers - place inside buildings
    entities.push(CharacterSystem.createContainer(
        'village_crate1', 'Supply Crate', 4, 5,
        [
            { ...ItemDatabase.healing_powder, quantity: 2 },
            { ...ItemDatabase.bottle_caps, quantity: 30 },
        ],
        'crate'
    ));

    entities.push(CharacterSystem.createContainer(
        'village_chest', 'Old Chest', 20, 5,
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
