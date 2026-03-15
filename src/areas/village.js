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

    const villageChest = CharacterSystem.createContainer(
        'village_chest', 'Old Chest', 20, 5,
        [
            { ...ItemDatabase.knife, quantity: 1 },
            { ...ItemDatabase.ragged_clothes, quantity: 1 },
            { ...ItemDatabase.nuka_cola, quantity: 2 },
            { ...ItemDatabase.lockpick, quantity: 2 },
        ],
        'chest'
    );
    entities.push(villageChest);

    // Locked storage in merchant's building
    const lockedSupply = CharacterSystem.createContainer(
        'village_locked_chest', 'Merchant\'s Lockbox', 21, 16,
        [
            { ...ItemDatabase.stimpak, quantity: 2 },
            { ...ItemDatabase.bottle_caps, quantity: 100 },
            { ...ItemDatabase.lockpick, quantity: 3 },
            { ...ItemDatabase.ammo_9mm, quantity: 10 },
        ],
        'chest'
    );
    lockedSupply.locked = true;
    lockedSupply.lockDifficulty = 40;
    entities.push(lockedSupply);

    // Environmental objects - trees, signposts, etc.
    const env = (id, sprite, x, y, name, blocking = true) => ({
        id, name: name || sprite, type: 'environment', spriteType: sprite,
        x, y, facing: 'south', isHostile: false, blocking,
    });
    entities.push(env('tree1', 'dead_tree', 2, 3, 'Dead Tree'));
    entities.push(env('tree2', 'dead_tree', 22, 4, 'Dead Tree'));
    entities.push(env('tree3', 'dead_tree', 1, 18, 'Withered Tree'));
    entities.push(env('tree4', 'dead_tree', 23, 19, 'Dead Tree'));
    entities.push(env('tree5', 'dead_tree', 6, 21, 'Gnarled Tree'));
    entities.push(env('cactus1', 'cactus', 0, 8, 'Cactus'));
    entities.push(env('cactus2', 'cactus', 24, 9, 'Cactus'));
    entities.push(env('cactus3', 'cactus', 3, 14, 'Barrel Cactus'));
    entities.push(env('sign1', 'signpost', 13, 3, 'Signpost', false));
    entities.push(env('rocks1', 'rock_formation', 19, 20, 'Rocks', true));
    entities.push(env('rocks2', 'rock_formation', 1, 12, 'Boulders', true));
    entities.push(env('campfire1', 'campfire', 10, 10, 'Campfire', false));

    // Area transitions
    const transitions = [
        {
            x: 12, y: 0,
            label: 'To Caves',
            targetArea: 'cave',
            targetX: 7, targetY: 18,
        },
        {
            x: 24, y: 12,
            label: 'To Wasteland East',
            targetArea: 'wasteland',
            targetX: 10, targetY: 20,
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
