// ============================================
// Dustwalker - Isometric Renderer
// ============================================

class IsometricRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tileWidth = 64;
        this.tileHeight = 32;
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.animationFrame = 0;
        this.animationTimer = 0;

        // Tile color palette
        this.tileColors = {
            // Village tiles
            'dirt':        { top: '#8B7355', left: '#6B5335', right: '#7B6345', stroke: '#5B4325' },
            'sand':        { top: '#C2B280', left: '#A29260', right: '#B2A270', stroke: '#928250' },
            'grass':       { top: '#5B7B3A', left: '#3B5B1A', right: '#4B6B2A', stroke: '#2B4B0A' },
            'stone':       { top: '#808080', left: '#606060', right: '#707070', stroke: '#505050' },
            'wood':        { top: '#8B6914', left: '#6B4904', right: '#7B590A', stroke: '#5B3900' },
            'water':       { top: '#2244AA', left: '#1234AA', right: '#1A3CAA', stroke: '#0A24AA' },
            'road':        { top: '#6B6B5B', left: '#4B4B3B', right: '#5B5B4B', stroke: '#3B3B2B' },
            // Cave tiles
            'cave_floor':  { top: '#4A4040', left: '#3A3030', right: '#403838', stroke: '#2A2020' },
            'cave_wall':   { top: '#5A5050', left: '#3A3030', right: '#4A4040', stroke: '#2A2020' },
            'cave_rock':   { top: '#656058', left: '#454038', right: '#555048', stroke: '#353028' },
            'lava':        { top: '#CC4400', left: '#AA2200', right: '#BB3300', stroke: '#881100' },
            'crystal':     { top: '#66AACC', left: '#4488AA', right: '#5599BB', stroke: '#337799' },
            // Shared
            'wall':        { top: '#9A8A6A', left: '#6A5A3A', right: '#7A6A4A', stroke: '#5A4A2A' },
            'wall_top':    { top: '#AA9A7A', left: '#7A6A4A', right: '#8A7A5A', stroke: '#6A5A3A' },
            'door':        { top: '#6B4914', left: '#4B2904', right: '#5B390A', stroke: '#3B1900' },
            'void':        { top: '#000000', left: '#000000', right: '#000000', stroke: '#000000' },
        };

        // Entity sprites (drawn procedurally)
        this.entityColors = {
            'player':     { body: '#C4943A', head: '#E0C080', outline: '#6B4E1F' },
            'villager':   { body: '#8899AA', head: '#CCBB99', outline: '#556677' },
            'merchant':   { body: '#AA8855', head: '#CCBB99', outline: '#665533' },
            'elder':      { body: '#9966CC', head: '#CCBB99', outline: '#664499' },
            'guard':      { body: '#668844', head: '#CCBB99', outline: '#445522' },
            'rat':        { body: '#6B5B4B', head: '#7B6B5B', outline: '#4B3B2B' },
            'scorpion':   { body: '#8B4513', head: '#A0522D', outline: '#5B2503' },
            'raider':     { body: '#8B0000', head: '#CC9977', outline: '#5B0000' },
            'mutant':     { body: '#4B8B00', head: '#6BAB20', outline: '#2B5B00' },
            'cave_spider':{ body: '#2B2B2B', head: '#3B3B3B', outline: '#1B1B1B' },
            'chest':      { body: '#8B6914', head: '#AA8834', outline: '#5B3900' },
            'crate':      { body: '#7B5B0A', head: '#8B6B1A', outline: '#4B3B00' },
            'bones':      { body: '#CCBBAA', head: '#DDCCBB', outline: '#998877' },
        };

        this.resize();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    clear() {
        this.ctx.fillStyle = '#0a0600';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Convert world grid position to screen position with camera
    worldToScreen(gx, gy) {
        const iso = Utils.toScreen(gx, gy, this.tileWidth, this.tileHeight);
        return {
            x: (iso.x - this.camera.x) * this.camera.zoom + this.canvas.width / 2,
            y: (iso.y - this.camera.y) * this.camera.zoom + this.canvas.height / 2
        };
    }

    // Convert screen position to world grid
    screenToWorld(sx, sy) {
        const worldX = (sx - this.canvas.width / 2) / this.camera.zoom + this.camera.x;
        const worldY = (sy - this.canvas.height / 2) / this.camera.zoom + this.camera.y;
        return Utils.toGrid(worldX, worldY, this.tileWidth, this.tileHeight);
    }

    // Center camera on grid position
    centerOn(gx, gy) {
        const iso = Utils.toScreen(gx, gy, this.tileWidth, this.tileHeight);
        this.camera.x = iso.x;
        this.camera.y = iso.y;
    }

    // Draw an isometric tile
    drawTile(gx, gy, tileType, height = 0) {
        const colors = this.tileColors[tileType] || this.tileColors['dirt'];
        const screen = this.worldToScreen(gx, gy);
        const tw = this.tileWidth * this.camera.zoom / 2;
        const th = this.tileHeight * this.camera.zoom / 2;
        const hOffset = height * 8 * this.camera.zoom;

        const ctx = this.ctx;

        // Top face
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - th - hOffset);
        ctx.lineTo(screen.x + tw, screen.y - hOffset);
        ctx.lineTo(screen.x, screen.y + th - hOffset);
        ctx.lineTo(screen.x - tw, screen.y - hOffset);
        ctx.closePath();
        ctx.fillStyle = colors.top;
        ctx.fill();
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        if (height > 0) {
            // Left face
            ctx.beginPath();
            ctx.moveTo(screen.x - tw, screen.y - hOffset);
            ctx.lineTo(screen.x, screen.y + th - hOffset);
            ctx.lineTo(screen.x, screen.y + th);
            ctx.lineTo(screen.x - tw, screen.y);
            ctx.closePath();
            ctx.fillStyle = colors.left;
            ctx.fill();
            ctx.strokeStyle = colors.stroke;
            ctx.stroke();

            // Right face
            ctx.beginPath();
            ctx.moveTo(screen.x + tw, screen.y - hOffset);
            ctx.lineTo(screen.x, screen.y + th - hOffset);
            ctx.lineTo(screen.x, screen.y + th);
            ctx.lineTo(screen.x + tw, screen.y);
            ctx.closePath();
            ctx.fillStyle = colors.right;
            ctx.fill();
            ctx.strokeStyle = colors.stroke;
            ctx.stroke();
        }
    }

    // Draw a highlighted tile (for movement range, targeting, etc.)
    drawTileHighlight(gx, gy, color = 'rgba(196, 148, 58, 0.3)', borderColor = 'rgba(196, 148, 58, 0.6)') {
        const screen = this.worldToScreen(gx, gy);
        const tw = this.tileWidth * this.camera.zoom / 2;
        const th = this.tileHeight * this.camera.zoom / 2;

        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - th);
        ctx.lineTo(screen.x + tw, screen.y);
        ctx.lineTo(screen.x, screen.y + th);
        ctx.lineTo(screen.x - tw, screen.y);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Draw entity (character, NPC, enemy, object)
    drawEntity(gx, gy, entityType, facing = 'south', isSelected = false, hp = null, maxHp = null) {
        const colors = this.entityColors[entityType] || this.entityColors['villager'];
        const screen = this.worldToScreen(gx, gy);
        const ctx = this.ctx;
        const z = this.camera.zoom;

        // Selection indicator
        if (isSelected) {
            this.drawTileHighlight(gx, gy, 'rgba(100, 200, 100, 0.2)', 'rgba(100, 200, 100, 0.5)');
        }

        if (entityType === 'chest' || entityType === 'crate') {
            // Draw container as a small box
            const bw = 12 * z;
            const bh = 10 * z;
            ctx.fillStyle = colors.body;
            ctx.fillRect(screen.x - bw/2, screen.y - bh - 4*z, bw, bh);
            ctx.fillStyle = colors.head;
            ctx.fillRect(screen.x - bw/2, screen.y - bh - 4*z, bw, 3*z);
            ctx.strokeStyle = colors.outline;
            ctx.lineWidth = 1;
            ctx.strokeRect(screen.x - bw/2, screen.y - bh - 4*z, bw, bh);
            return;
        }

        if (entityType === 'bones') {
            ctx.fillStyle = colors.body;
            ctx.beginPath();
            ctx.arc(screen.x, screen.y - 4*z, 4*z, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = colors.outline;
            ctx.fillRect(screen.x - 6*z, screen.y - 2*z, 12*z, 1.5*z);
            return;
        }

        const isSmallCreature = ['rat', 'scorpion', 'cave_spider'].includes(entityType);
        const bodyW = isSmallCreature ? 8 * z : 10 * z;
        const bodyH = isSmallCreature ? 6 * z : 16 * z;
        const headR = isSmallCreature ? 3 * z : 5 * z;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(screen.x, screen.y, 8 * z, 4 * z, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = colors.body;
        ctx.fillRect(screen.x - bodyW/2, screen.y - bodyH - 2*z, bodyW, bodyH);

        // Head
        ctx.fillStyle = colors.head;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y - bodyH - 2*z - headR, headR, 0, Math.PI * 2);
        ctx.fill();

        // Outline
        ctx.strokeStyle = colors.outline;
        ctx.lineWidth = 1;
        ctx.strokeRect(screen.x - bodyW/2, screen.y - bodyH - 2*z, bodyW, bodyH);
        ctx.beginPath();
        ctx.arc(screen.x, screen.y - bodyH - 2*z - headR, headR, 0, Math.PI * 2);
        ctx.stroke();

        // HP bar (if applicable and damaged)
        if (hp !== null && maxHp !== null && hp < maxHp) {
            const barW = 20 * z;
            const barH = 3 * z;
            const barY = screen.y - bodyH - 2*z - headR * 2 - 6*z;

            ctx.fillStyle = '#333';
            ctx.fillRect(screen.x - barW/2, barY, barW, barH);

            const hpRatio = hp / maxHp;
            ctx.fillStyle = hpRatio > 0.5 ? '#4a4' : hpRatio > 0.25 ? '#aa4' : '#a44';
            ctx.fillRect(screen.x - barW/2, barY, barW * hpRatio, barH);

            ctx.strokeStyle = '#222';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(screen.x - barW/2, barY, barW, barH);
        }
    }

    // Draw floating text (damage numbers, XP gained, etc.)
    drawFloatingText(gx, gy, text, color = '#fff', offsetY = 0) {
        const screen = this.worldToScreen(gx, gy);
        const ctx = this.ctx;
        const z = this.camera.zoom;

        ctx.font = `bold ${12 * z}px 'Courier New'`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000';
        ctx.fillText(text, screen.x + 1, screen.y - 30 * z + offsetY + 1);
        ctx.fillStyle = color;
        ctx.fillText(text, screen.x, screen.y - 30 * z + offsetY);
    }

    // Draw path indicator
    drawPath(path, color = 'rgba(100, 200, 100, 0.4)') {
        for (const point of path) {
            this.drawTileHighlight(point.x, point.y, color, 'rgba(100, 200, 100, 0.6)');
        }
    }

    // Draw movement range
    drawMovementRange(tiles, color = 'rgba(100, 200, 100, 0.15)') {
        for (const tile of tiles) {
            this.drawTileHighlight(tile.x, tile.y, color, 'rgba(100, 200, 100, 0.3)');
        }
    }

    // Draw attack range
    drawAttackRange(tiles) {
        for (const tile of tiles) {
            this.drawTileHighlight(tile.x, tile.y, 'rgba(200, 50, 50, 0.15)', 'rgba(200, 50, 50, 0.4)');
        }
    }

    // Draw area transition indicator
    drawTransition(gx, gy, label) {
        const screen = this.worldToScreen(gx, gy);
        const ctx = this.ctx;
        const z = this.camera.zoom;

        // Glowing tile
        this.drawTileHighlight(gx, gy,
            `rgba(100, 150, 255, ${0.2 + Math.sin(Date.now() / 500) * 0.1})`,
            'rgba(100, 150, 255, 0.6)'
        );

        // Label
        ctx.font = `${10 * z}px 'Courier New'`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#6a9ac4';
        ctx.fillText(label, screen.x, screen.y - 8 * z);
    }

    // Render the complete area
    renderArea(area, entities, playerPos, gameState) {
        this.clear();
        this.updateAnimation();

        const map = area.map;
        const heights = area.heights;

        // Calculate visible tile range for culling
        const margin = 4;
        const topLeft = this.screenToWorld(0, 0);
        const bottomRight = this.screenToWorld(this.canvas.width, this.canvas.height);

        // Collect all renderable items and sort by depth
        const renderList = [];

        // Add tiles
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[0].length; x++) {
                const tile = map[y][x];
                if (tile === 'void') continue;
                const h = heights ? (heights[y] ? heights[y][x] || 0 : 0) : 0;
                renderList.push({
                    type: 'tile',
                    x, y,
                    depth: x + y,
                    tileType: tile,
                    height: h
                });
            }
        }

        // Add entities
        for (const ent of entities) {
            renderList.push({
                type: 'entity',
                x: ent.x,
                y: ent.y,
                depth: ent.x + ent.y + 0.5,
                entity: ent
            });
        }

        // Sort by depth (back to front)
        renderList.sort((a, b) => a.depth - b.depth);

        // Render
        for (const item of renderList) {
            if (item.type === 'tile') {
                this.drawTile(item.x, item.y, item.tileType, item.height);
            } else if (item.type === 'entity') {
                const ent = item.entity;
                this.drawEntity(
                    ent.x, ent.y,
                    ent.spriteType || ent.type,
                    ent.facing || 'south',
                    ent === gameState.selectedEntity,
                    ent.stats ? ent.stats.hp : null,
                    ent.stats ? ent.stats.maxHp : null
                );
            }
        }

        // Draw transitions
        if (area.transitions) {
            for (const t of area.transitions) {
                this.drawTransition(t.x, t.y, t.label || 'Exit');
            }
        }

        // Draw highlights based on game mode
        if (gameState.highlights) {
            for (const h of gameState.highlights) {
                if (h.type === 'move') {
                    this.drawTileHighlight(h.x, h.y, 'rgba(100, 200, 100, 0.15)', 'rgba(100, 200, 100, 0.3)');
                } else if (h.type === 'attack') {
                    this.drawTileHighlight(h.x, h.y, 'rgba(200, 50, 50, 0.15)', 'rgba(200, 50, 50, 0.4)');
                } else if (h.type === 'path') {
                    this.drawTileHighlight(h.x, h.y, 'rgba(100, 200, 100, 0.3)', 'rgba(100, 200, 100, 0.5)');
                }
            }
        }

        // Hover tile
        if (gameState.hoverTile) {
            this.drawTileHighlight(
                gameState.hoverTile.x, gameState.hoverTile.y,
                'rgba(196, 148, 58, 0.15)', 'rgba(196, 148, 58, 0.4)'
            );
        }

        // Floating texts
        if (gameState.floatingTexts) {
            for (const ft of gameState.floatingTexts) {
                this.drawFloatingText(ft.x, ft.y, ft.text, ft.color, ft.offsetY);
            }
        }
    }

    updateAnimation() {
        this.animationTimer++;
        if (this.animationTimer >= 30) {
            this.animationTimer = 0;
            this.animationFrame = (this.animationFrame + 1) % 4;
        }
    }

    // Draw the world map
    drawWorldMap(ctx, locations, currentLocation) {
        ctx.fillStyle = '#1a1209';
        ctx.fillRect(0, 0, 400, 300);

        // Draw wasteland background
        ctx.fillStyle = '#2a1f0e';
        for (let i = 0; i < 50; i++) {
            const x = (i * 37) % 400;
            const y = (i * 53) % 300;
            ctx.fillRect(x, y, 2, 2);
        }

        for (const loc of locations) {
            const isCurrent = loc.id === currentLocation;

            // Draw connection lines
            if (loc.connections) {
                for (const connId of loc.connections) {
                    const conn = locations.find(l => l.id === connId);
                    if (conn) {
                        ctx.beginPath();
                        ctx.moveTo(loc.mapX, loc.mapY);
                        ctx.lineTo(conn.mapX, conn.mapY);
                        ctx.strokeStyle = '#4a3a20';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([4, 4]);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                }
            }

            // Location dot
            ctx.beginPath();
            ctx.arc(loc.mapX, loc.mapY, isCurrent ? 8 : 5, 0, Math.PI * 2);
            ctx.fillStyle = isCurrent ? '#c4943a' : (loc.discovered ? '#6b5a3a' : '#3a2a1a');
            ctx.fill();
            ctx.strokeStyle = isCurrent ? '#e0d5c0' : '#4a3a20';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Label
            if (loc.discovered || isCurrent) {
                ctx.font = '10px Courier New';
                ctx.textAlign = 'center';
                ctx.fillStyle = isCurrent ? '#c4943a' : '#6b5a3a';
                ctx.fillText(loc.name, loc.mapX, loc.mapY + 18);
            }
        }
    }
}
