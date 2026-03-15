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

    // Environmental objects - wreckage, ruins, trees, buildings
    const env = (id, sprite, x, y, name, blocking = true) => ({
        id, name: name || sprite, type: 'environment', spriteType: sprite,
        x, y, facing: 'south', isHostile: false, blocking,
    });
    // Ruined structures and wreckage
    entities.push(env('ruins1', 'ruins', 3, 4, 'Collapsed Wall'));
    entities.push(env('ruins2', 'ruins', 5, 8, 'Ruined Building'));
    entities.push(env('ruins3', 'ruins', 18, 3, 'Crumbling Archway'));
    entities.push(env('wreck1', 'wreckage', 2, 12, 'Rusted Vehicle'));
    entities.push(env('wreck2', 'wreckage', 7, 16, 'Junk Pile'));
    entities.push(env('wreck3', 'wreckage', 19, 17, 'Overturned Barrel'));
    entities.push(env('wreck4', 'wreckage', 4, 18, 'Scrap Heap'));
    // Dead trees and desert plants
    entities.push(env('tree1', 'dead_tree', 1, 6, 'Dead Tree'));
    entities.push(env('tree2', 'dead_tree', 19, 9, 'Charred Tree'));
    entities.push(env('tree3', 'dead_tree', 9, 3, 'Withered Tree'));
    entities.push(env('cactus1', 'cactus', 6, 2, 'Cactus'));
    entities.push(env('cactus2', 'cactus', 20, 13, 'Cactus'));
    entities.push(env('cactus3', 'cactus', 1, 16, 'Saguaro'));
    // Raider camp structures
    entities.push(env('tower1', 'watchtower', 10, 5, 'Lookout Tower'));
    entities.push(env('shack1', 'building', 17, 12, 'Raider Shack'));
    // Rocks and campfire
    entities.push(env('rocks1', 'rock_formation', 3, 9, 'Boulder'));
    entities.push(env('rocks2', 'rock_formation', 16, 18, 'Rocks'));
    entities.push(env('campfire1', 'campfire', 13, 10, 'Raider Campfire', false));
    entities.push(env('sign1', 'signpost', 10, 19, 'Warning Sign', false));
    entities.push(env('bones1', 'bones', 6, 13, 'Skeletal Remains', false));
    entities.push(env('bones2', 'bones', 11, 4, 'Old Bones', false));

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
