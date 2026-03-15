// ============================================
// Dustwalker - Wasteland East (Raider Camp)
// ============================================

function createWastelandArea() {
    // 22x22 wasteland map with a raider camp in the center-east
    // Legend:
    // s=sand, d=dirt, r=road, g=grass, w=wall, D=door, o=wood, S=stone, v=void, b=barricade
    const tileKey = {
        's': 'sand',    'd': 'dirt',     'r': 'road',    'g': 'grass',
        'w': 'wall',    'D': 'door',     'o': 'wood',    'S': 'stone',
        'v': 'void',    'b': 'barricade',
    };

    const mapRaw = [
        'ssssssssssssssssssssss',
        'ssssddddsssssssdddsss',
        'sssddddddsssssdddddss',
        'ssddddddddssddddddds',
        'sddddddddddddddddddss',
        'sdddddddddddddwwwddss',
        'sddddddddddddwooowdss',
        'sddddddddddddwooowdss',
        'sdddddddddddddDddddss',
        'sddddddSSSddddddddds',
        'sddddddSSSSdddddddds',
        'sdddddddSSddddddddss',
        'sddddddddddddddddddss',
        'sdddddddddddwwwwwddss',
        'sddddddddddwooooowdss',
        'sddddddddddwooooowd ss',
        'sdddddddddddDddddddss',
        'sdddddddddddddddddss',
        'ssddddddddddddddddss',
        'sssddddddddddddddss',
        'ssssdddddrrrddddssss',
        'sssssssssrrrsssssssss',
    ];

    const map = mapRaw.map(row =>
        row.split('').map(c => tileKey[c.trim()] || 'sand')
    );

    const heights = mapRaw.map(row =>
        row.split('').map(c => {
            if (c === 'w') return 2;
            if (c === 'S') return 1;
            if (c === 'b') return 1;
            return 0;
        })
    );

    const blocked = new Set(['wall', 'void', 'barricade']);

    const entities = [];

    // Raiders scattered around camp
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.raider_scout, 12, 8));
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.raider, 16, 6));
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.raider_gunner, 15, 10));
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.raider_scout, 10, 12));
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.raider, 14, 14));

    // Boss inside the main building
    entities.push(CharacterSystem.createEnemy(EnemyTemplates.raider_boss, 14, 15));

    // Loot containers
    entities.push(CharacterSystem.createContainer(
        'raider_chest1', 'Raider Stash', 14, 7,
        [
            { ...ItemDatabase.stimpak, quantity: 2 },
            { ...ItemDatabase.ammo_9mm, quantity: 15 },
            { ...ItemDatabase.bottle_caps, quantity: 40 },
            { ...ItemDatabase.jet, quantity: 1 },
        ],
        'crate'
    ));

    entities.push(CharacterSystem.createContainer(
        'raider_chest2', 'Weapon Rack', 15, 15,
        [
            { ...ItemDatabase.pipe_pistol, quantity: 1 },
            { ...ItemDatabase.ammo_12ga, quantity: 8 },
            { ...ItemDatabase.buffout, quantity: 1 },
        ],
        'crate'
    ));

    entities.push(CharacterSystem.createContainer(
        'raider_main_chest', 'Warlord\'s Strongbox', 13, 14,
        [
            { ...ItemDatabase.hunting_rifle, quantity: 1 },
            { ...ItemDatabase.ammo_308, quantity: 15 },
            { ...ItemDatabase.stimpak, quantity: 3 },
            { ...ItemDatabase.bottle_caps, quantity: 200 },
            { ...ItemDatabase.metal_armor, quantity: 1 },
            { ...ItemDatabase.lucky_charm, quantity: 1 },
        ],
        'chest'
    ));

    // Rubble / old structure remains
    entities.push(CharacterSystem.createContainer(
        'rubble_cache', 'Rubble Pile', 8, 10,
        [
            { ...ItemDatabase.scrap_metal, quantity: 3 },
            { ...ItemDatabase.healing_powder, quantity: 2 },
            { ...ItemDatabase.scout_goggles, quantity: 1 },
        ],
        'crate'
    ));

    const transitions = [
        {
            x: 10, y: 21,
            label: 'To Village',
            targetArea: 'village',
            targetX: 22, targetY: 12,
        },
        {
            x: 11, y: 21,
            label: 'To Village',
            targetArea: 'village',
            targetX: 22, targetY: 12,
        },
    ];

    return {
        id: 'wasteland',
        name: 'Wasteland East - Raider Camp',
        map,
        heights,
        blocked,
        entities,
        transitions,
        playerStart: { x: 10, y: 20 },
        ambientColor: '#c4943a11',
    };
}
