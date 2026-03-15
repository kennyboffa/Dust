// ============================================
// Dustwalker - Random Encounter Area Generator
// ============================================

function generateEncounterArea(fromArea, toArea, encounterType) {
    const width = 20;
    const height = 20;

    // Generate a basic desert/wasteland terrain
    const map = [];
    const heights = [];

    for (let y = 0; y < height; y++) {
        const row = [];
        const hRow = [];
        for (let x = 0; x < width; x++) {
            // Border is sand, interior mix of dirt/sand/grass
            if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                row.push('sand');
            } else {
                const r = Utils.randInt(0, 100);
                if (r < 50) row.push('dirt');
                else if (r < 80) row.push('sand');
                else if (r < 90) row.push('grass');
                else row.push('road');
            }
            hRow.push(0);
        }
        map.push(row);
        heights.push(hRow);
    }

    // Add a rough path through the middle
    const pathY = Math.floor(height / 2);
    for (let x = 0; x < width; x++) {
        const py = pathY + Utils.randInt(-1, 1);
        for (let dy = -1; dy <= 1; dy++) {
            const yy = Utils.clamp(py + dy, 1, height - 2);
            map[yy][x] = 'road';
        }
    }

    // Scatter some rocks/water as obstacles
    for (let y = 2; y < height - 2; y++) {
        for (let x = 2; x < width - 2; x++) {
            if (map[y][x] === 'road') continue;
            if (Utils.randInt(0, 100) < 3) {
                map[y][x] = 'wall'; // rock
                heights[y][x] = 1;
            }
        }
    }

    const blocked = new Set(['wall', 'water', 'void']);
    const entities = [];

    // Environmental objects
    const env = (id, sprite, x, y, name, blocking = true) => ({
        id, name: name || sprite, type: 'environment', spriteType: sprite,
        x, y, facing: 'south', isHostile: false, blocking,
    });

    // Scatter trees and cacti
    const envCount = Utils.randInt(4, 8);
    for (let i = 0; i < envCount; i++) {
        const ex = Utils.randInt(2, width - 3);
        const ey = Utils.randInt(2, height - 3);
        if (map[ey][ex] === 'road') continue;
        const type = Utils.randChoice(['dead_tree', 'cactus', 'rock_formation']);
        const names = { dead_tree: 'Dead Tree', cactus: 'Cactus', rock_formation: 'Rocks' };
        entities.push(env(`enc_env_${i}`, type, ex, ey, names[type]));
    }

    // Add encounter-specific content
    if (encounterType === 'combat') {
        // Spawn 2-4 enemies
        const enemyCount = Utils.randInt(2, 4);
        const possibleEnemies = ['raider', 'raider_scout', 'cave_rat', 'giant_rat'];
        for (let i = 0; i < enemyCount; i++) {
            const templateKey = Utils.randChoice(possibleEnemies);
            const template = EnemyTemplates[templateKey];
            const ex = Utils.randInt(8, width - 4);
            const ey = Utils.randInt(5, height - 5);
            entities.push(CharacterSystem.createEnemy(template, ex, ey));
        }
    } else if (encounterType === 'trader') {
        // Spawn a wandering trader NPC
        const traderX = Math.floor(width / 2);
        const traderY = Math.floor(height / 2);
        entities.push(CharacterSystem.createNPC({
            id: 'encounter_trader',
            name: 'Wasteland Trader',
            spriteType: 'merchant',
            x: traderX, y: traderY,
            dialogueId: 'wasteland_trader',
        }));
        // Trader's pack mule (environmental)
        entities.push(env('trader_pack', 'crate', traderX + 1, traderY, 'Pack Brahmin', true));
    } else if (encounterType === 'empty') {
        // Just the terrain, maybe some bones
        if (Utils.percentCheck(50)) {
            entities.push(env('enc_bones', 'bones', Utils.randInt(5, 14), Utils.randInt(5, 14), 'Scattered Bones', false));
        }
    }

    // Transitions: continue forward or go back
    // The exit is on the far side, entrance on the near side
    const transitions = [
        {
            x: width - 1, y: Math.floor(height / 2),
            label: `Continue to ${toArea === 'wasteland' ? 'Raider Camp' : toArea === 'cave' ? 'Caves' : 'destination'}`,
            targetArea: toArea,
            targetX: 1, targetY: 10,
        },
        {
            x: 0, y: Math.floor(height / 2),
            label: `Return to ${fromArea === 'village' ? 'Village' : 'previous area'}`,
            targetArea: fromArea,
            targetX: 10, targetY: 10,
        },
    ];

    return {
        id: 'encounter',
        name: 'Wasteland',
        map,
        heights,
        blocked,
        entities,
        transitions,
        playerStart: { x: 1, y: Math.floor(height / 2) },
        ambientColor: '#c4943a22',
        isEncounter: true,
        encounterType,
        fromArea,
        toArea,
    };
}
