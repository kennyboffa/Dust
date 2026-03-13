// ============================================
// Dustwalker - Utility Functions
// ============================================

const Utils = {
    // Isometric coordinate conversion
    // World coords (grid x,y) -> Screen coords (pixel x,y)
    toScreen(gridX, gridY, tileWidth, tileHeight) {
        return {
            x: (gridX - gridY) * (tileWidth / 2),
            y: (gridX + gridY) * (tileHeight / 2)
        };
    },

    // Screen coords -> World grid coords
    toGrid(screenX, screenY, tileWidth, tileHeight) {
        const gx = (screenX / (tileWidth / 2) + screenY / (tileHeight / 2)) / 2;
        const gy = (screenY / (tileHeight / 2) - screenX / (tileWidth / 2)) / 2;
        return { x: Math.floor(gx), y: Math.floor(gy) };
    },

    // Distance between two grid points
    gridDistance(x1, y1, x2, y2) {
        return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    },

    // Manhattan distance
    manhattanDistance(x1, y1, x2, y2) {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    },

    // Dice roll: "2d6+3" format
    rollDice(formula) {
        const match = formula.match(/(\d+)d(\d+)([+-]\d+)?/);
        if (!match) return parseInt(formula) || 0;
        const [, count, sides, modifier] = match;
        let total = 0;
        for (let i = 0; i < parseInt(count); i++) {
            total += Math.floor(Math.random() * parseInt(sides)) + 1;
        }
        return total + (parseInt(modifier) || 0);
    },

    // Random integer [min, max] inclusive
    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Random element from array
    randChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    // Percentage check
    percentCheck(chance) {
        return Math.random() * 100 < chance;
    },

    // Clamp value
    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    },

    // Lerp
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    // Simple A* pathfinding
    findPath(startX, startY, endX, endY, isWalkable, maxSteps = 50) {
        const openSet = [];
        const closedSet = new Set();
        const start = { x: startX, y: startY, g: 0, h: 0, f: 0, parent: null };
        start.h = Utils.manhattanDistance(startX, startY, endX, endY);
        start.f = start.h;
        openSet.push(start);

        while (openSet.length > 0) {
            // Find lowest f
            let lowestIdx = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].f < openSet[lowestIdx].f) lowestIdx = i;
            }
            const current = openSet.splice(lowestIdx, 1)[0];

            if (current.x === endX && current.y === endY) {
                const path = [];
                let node = current;
                while (node.parent) {
                    path.unshift({ x: node.x, y: node.y });
                    node = node.parent;
                }
                return path;
            }

            closedSet.add(`${current.x},${current.y}`);

            // 8-directional neighbors
            const dirs = [
                [-1,0],[1,0],[0,-1],[0,1],
                [-1,-1],[-1,1],[1,-1],[1,1]
            ];

            for (const [dx, dy] of dirs) {
                const nx = current.x + dx;
                const ny = current.y + dy;
                const key = `${nx},${ny}`;

                if (closedSet.has(key) || !isWalkable(nx, ny)) continue;

                const g = current.g + (dx !== 0 && dy !== 0 ? 1.4 : 1);
                const existing = openSet.find(n => n.x === nx && n.y === ny);

                if (!existing) {
                    const h = Utils.manhattanDistance(nx, ny, endX, endY);
                    openSet.push({ x: nx, y: ny, g, h, f: g + h, parent: current });
                } else if (g < existing.g) {
                    existing.g = g;
                    existing.f = g + existing.h;
                    existing.parent = current;
                }
            }

            if (closedSet.size > maxSteps) return null; // Too far
        }

        return null; // No path found
    },

    // Deep clone
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    // Generate unique ID
    uid() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
};
