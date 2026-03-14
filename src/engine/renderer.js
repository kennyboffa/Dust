// ============================================
// Dustwalker - Isometric Renderer (Enhanced)
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
        this.time = 0; // global animation time

        // Dust particles
        this.particles = [];
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: Math.random() * 2000 - 1000,
                y: Math.random() * 2000 - 1000,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -Math.random() * 0.2 - 0.05,
                size: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.3 + 0.1,
                life: Math.random() * 200 + 100,
            });
        }

        // Precompute noise for tile detail
        this.noiseMap = [];
        for (let i = 0; i < 256; i++) {
            this.noiseMap.push(Math.random());
        }

        // Tile color palette
        this.tileColors = {
            'dirt':        { top: '#8B7355', left: '#6B5335', right: '#7B6345', stroke: '#5B4325' },
            'sand':        { top: '#C2B280', left: '#A29260', right: '#B2A270', stroke: '#928250' },
            'grass':       { top: '#5B7B3A', left: '#3B5B1A', right: '#4B6B2A', stroke: '#2B4B0A' },
            'stone':       { top: '#808080', left: '#606060', right: '#707070', stroke: '#505050' },
            'wood':        { top: '#8B6914', left: '#6B4904', right: '#7B590A', stroke: '#5B3900' },
            'water':       { top: '#2244AA', left: '#1234AA', right: '#1A3CAA', stroke: '#0A24AA' },
            'road':        { top: '#6B6B5B', left: '#4B4B3B', right: '#5B5B4B', stroke: '#3B3B2B' },
            'cave_floor':  { top: '#4A4040', left: '#3A3030', right: '#403838', stroke: '#2A2020' },
            'cave_wall':   { top: '#5A5050', left: '#3A3030', right: '#4A4040', stroke: '#2A2020' },
            'cave_rock':   { top: '#656058', left: '#454038', right: '#555048', stroke: '#353028' },
            'lava':        { top: '#CC4400', left: '#AA2200', right: '#BB3300', stroke: '#881100' },
            'crystal':     { top: '#66AACC', left: '#4488AA', right: '#5599BB', stroke: '#337799' },
            'wall':        { top: '#9A8A6A', left: '#6A5A3A', right: '#7A6A4A', stroke: '#5A4A2A' },
            'wall_top':    { top: '#AA9A7A', left: '#7A6A4A', right: '#8A7A5A', stroke: '#6A5A3A' },
            'door':        { top: '#6B4914', left: '#4B2904', right: '#5B390A', stroke: '#3B1900' },
            'void':        { top: '#000000', left: '#000000', right: '#000000', stroke: '#000000' },
        };

        // Entity sprites (drawn procedurally)
        this.entityColors = {
            'player':     { body: '#C4943A', body2: '#A07828', head: '#E0C080', hair: '#6B4E1F', outline: '#4B3510', eyes: '#222', accent: '#D4A44A' },
            'villager':   { body: '#8899AA', body2: '#6A7B8C', head: '#CCBB99', hair: '#886644', outline: '#445566', eyes: '#333', accent: '#7788AA' },
            'merchant':   { body: '#AA8855', body2: '#8A6835', head: '#CCBB99', hair: '#554422', outline: '#554422', eyes: '#333', accent: '#CC9955' },
            'elder':      { body: '#9966CC', body2: '#7744AA', head: '#CCBB99', hair: '#CCCCCC', outline: '#553388', eyes: '#333', accent: '#BB88EE' },
            'guard':      { body: '#668844', body2: '#446622', head: '#CCBB99', hair: '#443322', outline: '#334411', eyes: '#333', accent: '#88AA66' },
            'rat':        { body: '#6B5B4B', body2: '#5B4B3B', head: '#7B6B5B', hair: '#6B5B4B', outline: '#3B2B1B', eyes: '#111', accent: '#8B7B6B' },
            'scorpion':   { body: '#8B4513', body2: '#6B2503', head: '#A0522D', hair: '#8B4513', outline: '#3B1503', eyes: '#FF4400', accent: '#BB6533' },
            'raider':     { body: '#8B0000', body2: '#6B0000', head: '#CC9977', hair: '#333333', outline: '#3B0000', eyes: '#333', accent: '#BB2222' },
            'mutant':     { body: '#4B8B00', body2: '#2B6B00', head: '#6BAB20', hair: '#4B8B00', outline: '#1B4B00', eyes: '#FF0', accent: '#6BAB20' },
            'cave_spider':{ body: '#2B2B2B', body2: '#1B1B1B', head: '#3B3B3B', hair: '#2B2B2B', outline: '#0B0B0B', eyes: '#FF0000', accent: '#4B4B4B' },
            'chest':      { body: '#8B6914', body2: '#6B4904', head: '#AA8834', hair: '#8B6914', outline: '#3B2900', eyes: '#000', accent: '#CCAA44' },
            'crate':      { body: '#7B5B0A', body2: '#5B3B00', head: '#8B6B1A', hair: '#7B5B0A', outline: '#3B2B00', eyes: '#000', accent: '#9B7B2A' },
            'bones':      { body: '#CCBBAA', body2: '#BBAA99', head: '#DDCCBB', hair: '#CCBBAA', outline: '#887766', eyes: '#000', accent: '#EEDDCC' },
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

    noise(x, y) {
        return this.noiseMap[((x * 73 + y * 137) & 255)];
    }

    worldToScreen(gx, gy) {
        const iso = Utils.toScreen(gx, gy, this.tileWidth, this.tileHeight);
        return {
            x: (iso.x - this.camera.x) * this.camera.zoom + this.canvas.width / 2,
            y: (iso.y - this.camera.y) * this.camera.zoom + this.canvas.height / 2
        };
    }

    screenToWorld(sx, sy) {
        const worldX = (sx - this.canvas.width / 2) / this.camera.zoom + this.camera.x;
        const worldY = (sy - this.canvas.height / 2) / this.camera.zoom + this.camera.y;
        return Utils.toGrid(worldX, worldY, this.tileWidth, this.tileHeight);
    }

    centerOn(gx, gy) {
        const iso = Utils.toScreen(gx, gy, this.tileWidth, this.tileHeight);
        this.camera.x = iso.x;
        this.camera.y = iso.y;
    }

    // Helper to parse hex and darken/lighten
    adjustColor(hex, amount) {
        const r = Math.min(255, Math.max(0, parseInt(hex.slice(1,3), 16) + amount));
        const g = Math.min(255, Math.max(0, parseInt(hex.slice(3,5), 16) + amount));
        const b = Math.min(255, Math.max(0, parseInt(hex.slice(5,7), 16) + amount));
        return `rgb(${r},${g},${b})`;
    }

    drawTile(gx, gy, tileType, height = 0) {
        const colors = this.tileColors[tileType] || this.tileColors['dirt'];
        const screen = this.worldToScreen(gx, gy);
        const tw = this.tileWidth * this.camera.zoom / 2;
        const th = this.tileHeight * this.camera.zoom / 2;
        const hOffset = height * 8 * this.camera.zoom;
        const ctx = this.ctx;
        const z = this.camera.zoom;
        const n = this.noise(gx, gy);

        // Top face
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - th - hOffset);
        ctx.lineTo(screen.x + tw, screen.y - hOffset);
        ctx.lineTo(screen.x, screen.y + th - hOffset);
        ctx.lineTo(screen.x - tw, screen.y - hOffset);
        ctx.closePath();
        ctx.fillStyle = colors.top;
        ctx.fill();

        // Tile detail overlay based on type
        ctx.save();
        ctx.clip();
        this.drawTileDetail(ctx, screen, tw, th, hOffset, z, gx, gy, tileType, n);
        ctx.restore();

        // Tile edge
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - th - hOffset);
        ctx.lineTo(screen.x + tw, screen.y - hOffset);
        ctx.lineTo(screen.x, screen.y + th - hOffset);
        ctx.lineTo(screen.x - tw, screen.y - hOffset);
        ctx.closePath();
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

            // Left face brick/stone detail
            if (tileType === 'wall' || tileType === 'wall_top' || tileType === 'cave_wall') {
                ctx.save();
                ctx.clip();
                const brickH = 4 * z;
                for (let i = 0; i < height * 2 + 1; i++) {
                    const by = screen.y + th - i * brickH;
                    ctx.strokeStyle = this.adjustColor(colors.left, -15);
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(screen.x - tw, by);
                    ctx.lineTo(screen.x, by - th / (height * 2));
                    ctx.stroke();
                }
                ctx.restore();
            }

            ctx.strokeStyle = colors.stroke;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(screen.x - tw, screen.y - hOffset);
            ctx.lineTo(screen.x, screen.y + th - hOffset);
            ctx.lineTo(screen.x, screen.y + th);
            ctx.lineTo(screen.x - tw, screen.y);
            ctx.closePath();
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

            // Right face brick detail
            if (tileType === 'wall' || tileType === 'wall_top' || tileType === 'cave_wall') {
                ctx.save();
                ctx.clip();
                const brickH = 4 * z;
                for (let i = 0; i < height * 2 + 1; i++) {
                    const by = screen.y + th - i * brickH;
                    ctx.strokeStyle = this.adjustColor(colors.right, -15);
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(screen.x, by);
                    ctx.lineTo(screen.x + tw, by - th / (height * 2));
                    ctx.stroke();
                }
                ctx.restore();
            }

            ctx.strokeStyle = colors.stroke;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(screen.x + tw, screen.y - hOffset);
            ctx.lineTo(screen.x, screen.y + th - hOffset);
            ctx.lineTo(screen.x, screen.y + th);
            ctx.lineTo(screen.x + tw, screen.y);
            ctx.closePath();
            ctx.stroke();
        }
    }

    drawTileDetail(ctx, screen, tw, th, hOff, z, gx, gy, type, n) {
        const cx = screen.x;
        const cy = screen.y - hOff;

        if (type === 'grass') {
            // Draw small grass blades
            ctx.strokeStyle = `rgba(80, 140, 50, ${0.4 + n * 0.3})`;
            ctx.lineWidth = 0.8 * z;
            const count = 5;
            for (let i = 0; i < count; i++) {
                const nx = this.noise(gx * 10 + i, gy);
                const ny = this.noise(gx, gy * 10 + i);
                const bx = cx + (nx - 0.5) * tw * 1.2;
                const by = cy + (ny - 0.5) * th * 1.2;
                const sway = Math.sin(this.time * 0.03 + gx + i) * 1.5 * z;
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + sway, by - 4 * z);
                ctx.stroke();
            }
            // Subtle color variation
            ctx.fillStyle = `rgba(70, 130, 45, ${0.1 + n * 0.1})`;
            ctx.beginPath();
            ctx.arc(cx + (n - 0.5) * 10, cy + (n - 0.3) * 6, 4 * z, 0, Math.PI * 2);
            ctx.fill();
        }

        if (type === 'sand' || type === 'dirt') {
            // Speckles
            const speckleAlpha = 0.08 + n * 0.08;
            ctx.fillStyle = type === 'sand'
                ? `rgba(160, 140, 90, ${speckleAlpha})`
                : `rgba(100, 80, 50, ${speckleAlpha})`;
            for (let i = 0; i < 3; i++) {
                const sx = cx + (this.noise(gx * 7 + i, gy * 3) - 0.5) * tw;
                const sy = cy + (this.noise(gx * 3, gy * 7 + i) - 0.5) * th;
                ctx.fillRect(sx, sy, 2 * z, 1 * z);
            }
        }

        if (type === 'road') {
            // Road cracks
            ctx.strokeStyle = 'rgba(80, 70, 50, 0.2)';
            ctx.lineWidth = 0.5 * z;
            if (n > 0.6) {
                ctx.beginPath();
                ctx.moveTo(cx - 5 * z, cy - 2 * z);
                ctx.lineTo(cx + 3 * z, cy + 1 * z);
                ctx.stroke();
            }
        }

        if (type === 'water') {
            // Animated water ripples
            const wave = Math.sin(this.time * 0.05 + gx * 2 + gy) * 0.15 + 0.1;
            ctx.fillStyle = `rgba(100, 160, 255, ${wave})`;
            ctx.beginPath();
            const rx = cx + Math.sin(this.time * 0.03 + gy) * 3 * z;
            ctx.ellipse(rx, cy, 6 * z, 2 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Second ripple
            const wave2 = Math.sin(this.time * 0.04 + gx + gy * 3) * 0.1 + 0.05;
            ctx.fillStyle = `rgba(150, 200, 255, ${wave2})`;
            ctx.beginPath();
            ctx.ellipse(cx - 4 * z, cy + 2 * z, 4 * z, 1.5 * z, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        if (type === 'cave_floor') {
            // Small pebbles
            ctx.fillStyle = `rgba(80, 70, 60, ${0.15 + n * 0.15})`;
            for (let i = 0; i < 2; i++) {
                const px = cx + (this.noise(gx * 5 + i, gy * 9) - 0.5) * tw * 0.8;
                const py = cy + (this.noise(gx * 9 + i, gy * 5) - 0.5) * th * 0.8;
                ctx.beginPath();
                ctx.arc(px, py, (1 + n) * z, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (type === 'crystal') {
            // Glowing crystal effect
            const glow = 0.2 + Math.sin(this.time * 0.06 + gx + gy) * 0.15;
            ctx.fillStyle = `rgba(120, 200, 255, ${glow})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 8 * z, 0, Math.PI * 2);
            ctx.fill();
            // Inner bright point
            ctx.fillStyle = `rgba(200, 240, 255, ${glow * 0.7})`;
            ctx.beginPath();
            ctx.arc(cx, cy - 1 * z, 3 * z, 0, Math.PI * 2);
            ctx.fill();
        }

        if (type === 'wood') {
            // Wood grain lines
            ctx.strokeStyle = 'rgba(90, 60, 10, 0.2)';
            ctx.lineWidth = 0.5 * z;
            ctx.beginPath();
            ctx.moveTo(cx - tw * 0.6, cy);
            ctx.lineTo(cx + tw * 0.6, cy);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - tw * 0.4, cy - 2 * z);
            ctx.lineTo(cx + tw * 0.4, cy - 2 * z);
            ctx.stroke();
        }

        if (type === 'door') {
            // Door handle
            ctx.fillStyle = '#AA8844';
            ctx.beginPath();
            ctx.arc(cx + 3 * z, cy, 1.5 * z, 0, Math.PI * 2);
            ctx.fill();
        }
    }

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

    drawEntity(gx, gy, entityType, facing = 'south', isSelected = false, hp = null, maxHp = null) {
        const colors = this.entityColors[entityType] || this.entityColors['villager'];
        const screen = this.worldToScreen(gx, gy);
        const ctx = this.ctx;
        const z = this.camera.zoom;

        if (isSelected) {
            this.drawTileHighlight(gx, gy, 'rgba(100, 200, 100, 0.2)', 'rgba(100, 200, 100, 0.5)');
        }

        if (entityType === 'chest' || entityType === 'crate') {
            this.drawContainer(ctx, screen, z, entityType, colors);
            return;
        }

        if (entityType === 'bones') {
            this.drawBones(ctx, screen, z, colors);
            return;
        }

        if (['rat', 'scorpion', 'cave_spider'].includes(entityType)) {
            this.drawCreature(ctx, screen, z, entityType, colors);
        } else {
            this.drawHumanoid(ctx, screen, z, entityType, colors, facing);
        }

        // HP bar
        if (hp !== null && maxHp !== null && hp < maxHp) {
            const isSmall = ['rat', 'scorpion', 'cave_spider'].includes(entityType);
            const barW = 24 * z;
            const barH = 3 * z;
            const barY = screen.y - (isSmall ? 16 : 36) * z;

            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(screen.x - barW/2 - 1, barY - 1, barW + 2, barH + 2);

            const hpRatio = hp / maxHp;
            const r = Math.floor(255 * (1 - hpRatio));
            const g = Math.floor(200 * hpRatio);
            ctx.fillStyle = `rgb(${r},${g},40)`;
            ctx.fillRect(screen.x - barW/2, barY, barW * hpRatio, barH);

            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(screen.x - barW/2, barY, barW, barH);
        }
    }

    drawContainer(ctx, screen, z, type, colors) {
        const x = screen.x;
        const y = screen.y;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(x, y, 8 * z, 3 * z, 0, 0, Math.PI * 2);
        ctx.fill();

        if (type === 'chest') {
            const bw = 14 * z, bh = 10 * z;
            const by = y - bh - 2 * z;
            // Body
            ctx.fillStyle = colors.body;
            ctx.fillRect(x - bw/2, by, bw, bh);
            // Lid (slightly lighter)
            ctx.fillStyle = colors.head;
            ctx.fillRect(x - bw/2, by, bw, 3.5 * z);
            // Metal bands
            ctx.fillStyle = colors.accent || '#CCAA44';
            ctx.fillRect(x - bw/2, by + 3 * z, bw, 1.2 * z);
            ctx.fillRect(x - 1 * z, by, 2 * z, bh);
            // Lock
            ctx.fillStyle = '#888';
            ctx.fillRect(x - 1.5 * z, by + 3.5 * z, 3 * z, 2.5 * z);
            // Outline
            ctx.strokeStyle = colors.outline;
            ctx.lineWidth = 1;
            ctx.strokeRect(x - bw/2, by, bw, bh);
        } else {
            // Crate with slats
            const bw = 12 * z, bh = 11 * z;
            const by = y - bh - 2 * z;
            ctx.fillStyle = colors.body;
            ctx.fillRect(x - bw/2, by, bw, bh);
            // Slats
            ctx.strokeStyle = colors.outline;
            ctx.lineWidth = 0.8;
            for (let i = 0; i < 4; i++) {
                const sy = by + (bh / 4) * i + bh / 8;
                ctx.beginPath();
                ctx.moveTo(x - bw/2, sy);
                ctx.lineTo(x + bw/2, sy);
                ctx.stroke();
            }
            // Cross brace
            ctx.strokeStyle = this.adjustColor(colors.body, 15);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x - bw/2 + 1, by + 1);
            ctx.lineTo(x + bw/2 - 1, by + bh - 1);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + bw/2 - 1, by + 1);
            ctx.lineTo(x - bw/2 + 1, by + bh - 1);
            ctx.stroke();
            ctx.strokeStyle = colors.outline;
            ctx.lineWidth = 1;
            ctx.strokeRect(x - bw/2, by, bw, bh);
        }
    }

    drawBones(ctx, screen, z, colors) {
        const x = screen.x;
        const y = screen.y;
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(x, y, 6 * z, 3 * z, 0, 0, Math.PI * 2);
        ctx.fill();

        // Skull
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.arc(x, y - 3 * z, 3.5 * z, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colors.outline;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        // Eye sockets
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(x - 1.2 * z, y - 3.5 * z, 0.8 * z, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 1.2 * z, y - 3.5 * z, 0.8 * z, 0, Math.PI * 2);
        ctx.fill();
        // Crossbones
        ctx.strokeStyle = colors.body;
        ctx.lineWidth = 1.5 * z;
        ctx.beginPath();
        ctx.moveTo(x - 6 * z, y - 1 * z);
        ctx.lineTo(x + 6 * z, y + 1 * z);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 6 * z, y - 1 * z);
        ctx.lineTo(x - 6 * z, y + 1 * z);
        ctx.stroke();
    }

    drawCreature(ctx, screen, z, type, colors) {
        const x = screen.x;
        const y = screen.y;
        const t = this.time;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y, 7 * z, 3 * z, 0, 0, Math.PI * 2);
        ctx.fill();

        if (type === 'rat') {
            const bob = Math.sin(t * 0.1) * z;
            // Body (elongated)
            ctx.fillStyle = colors.body;
            ctx.beginPath();
            ctx.ellipse(x, y - 5 * z + bob, 6 * z, 3.5 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = colors.outline;
            ctx.lineWidth = 0.8;
            ctx.stroke();
            // Head
            ctx.fillStyle = colors.head;
            ctx.beginPath();
            ctx.ellipse(x + 5 * z, y - 6 * z + bob, 3 * z, 2.5 * z, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Eyes
            ctx.fillStyle = colors.eyes;
            ctx.beginPath();
            ctx.arc(x + 6.5 * z, y - 7 * z + bob, 0.8 * z, 0, Math.PI * 2);
            ctx.fill();
            // Ears
            ctx.fillStyle = this.adjustColor(colors.head, 20);
            ctx.beginPath();
            ctx.arc(x + 4 * z, y - 9 * z + bob, 1.5 * z, 0, Math.PI * 2);
            ctx.fill();
            // Tail
            ctx.strokeStyle = colors.outline;
            ctx.lineWidth = 1 * z;
            ctx.beginPath();
            ctx.moveTo(x - 6 * z, y - 5 * z + bob);
            ctx.quadraticCurveTo(x - 10 * z, y - 8 * z, x - 9 * z, y - 11 * z + bob);
            ctx.stroke();
        }

        if (type === 'scorpion') {
            const bob = Math.sin(t * 0.08) * 0.5 * z;
            // Body segments
            ctx.fillStyle = colors.body;
            ctx.beginPath();
            ctx.ellipse(x, y - 4 * z + bob, 7 * z, 4 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = colors.outline;
            ctx.lineWidth = 0.8;
            ctx.stroke();
            // Head/pincers
            ctx.fillStyle = colors.head;
            ctx.beginPath();
            ctx.ellipse(x + 6 * z, y - 5 * z + bob, 3 * z, 2.5 * z, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Pincers
            ctx.strokeStyle = colors.body;
            ctx.lineWidth = 1.5 * z;
            ctx.beginPath();
            ctx.moveTo(x + 8 * z, y - 6 * z + bob);
            ctx.lineTo(x + 12 * z, y - 8 * z + bob);
            ctx.lineTo(x + 11 * z, y - 6 * z + bob);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 8 * z, y - 4 * z + bob);
            ctx.lineTo(x + 12 * z, y - 2 * z + bob);
            ctx.lineTo(x + 11 * z, y - 4 * z + bob);
            ctx.stroke();
            // Tail (curving up)
            ctx.strokeStyle = colors.body;
            ctx.lineWidth = 2 * z;
            ctx.beginPath();
            ctx.moveTo(x - 6 * z, y - 4 * z + bob);
            ctx.quadraticCurveTo(x - 10 * z, y - 12 * z, x - 6 * z, y - 16 * z + bob);
            ctx.stroke();
            // Stinger
            ctx.fillStyle = '#FF4400';
            ctx.beginPath();
            ctx.arc(x - 6 * z, y - 17 * z + bob, 1.5 * z, 0, Math.PI * 2);
            ctx.fill();
            // Eyes
            ctx.fillStyle = colors.eyes;
            ctx.beginPath();
            ctx.arc(x + 7 * z, y - 6 * z + bob, 1 * z, 0, Math.PI * 2);
            ctx.fill();
            // Legs
            ctx.strokeStyle = colors.outline;
            ctx.lineWidth = 0.8 * z;
            for (let i = 0; i < 4; i++) {
                const lx = x - 3 * z + i * 3 * z;
                const sway = Math.sin(t * 0.12 + i) * z;
                ctx.beginPath();
                ctx.moveTo(lx, y - 3 * z + bob);
                ctx.lineTo(lx - 4 * z + sway, y + 1 * z);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(lx, y - 3 * z + bob);
                ctx.lineTo(lx + 4 * z - sway, y + 1 * z);
                ctx.stroke();
            }
        }

        if (type === 'cave_spider') {
            const bob = Math.sin(t * 0.12) * 0.5 * z;
            // Body
            ctx.fillStyle = colors.body;
            ctx.beginPath();
            ctx.ellipse(x, y - 5 * z + bob, 5 * z, 4 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Smaller front body
            ctx.fillStyle = colors.head;
            ctx.beginPath();
            ctx.ellipse(x + 4 * z, y - 6 * z + bob, 3 * z, 2.5 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Eyes (multiple, red)
            ctx.fillStyle = colors.eyes;
            for (let i = 0; i < 4; i++) {
                const ex = x + 5 * z + (i % 2) * 2 * z;
                const ey = y - 7 * z + Math.floor(i / 2) * 1.5 * z + bob;
                ctx.beginPath();
                ctx.arc(ex, ey, 0.7 * z, 0, Math.PI * 2);
                ctx.fill();
            }
            // Legs
            ctx.strokeStyle = colors.outline;
            ctx.lineWidth = 1 * z;
            for (let i = 0; i < 4; i++) {
                const lx = x - 2 * z + i * 2.5 * z;
                const sway = Math.sin(t * 0.15 + i * 1.2) * 1.5 * z;
                // Left leg
                ctx.beginPath();
                ctx.moveTo(lx, y - 4 * z + bob);
                ctx.quadraticCurveTo(lx - 6 * z, y - 8 * z + bob, lx - 8 * z + sway, y + 0.5 * z);
                ctx.stroke();
                // Right leg
                ctx.beginPath();
                ctx.moveTo(lx, y - 4 * z + bob);
                ctx.quadraticCurveTo(lx + 6 * z, y - 8 * z + bob, lx + 8 * z - sway, y + 0.5 * z);
                ctx.stroke();
            }
        }
    }

    drawHumanoid(ctx, screen, z, type, colors, facing) {
        const x = screen.x;
        const y = screen.y;
        const t = this.time;
        const bob = Math.sin(t * 0.08) * 0.5 * z;
        const isMutant = type === 'mutant';
        const scale = isMutant ? 1.4 : 1;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y, (isMutant ? 12 : 9) * z, (isMutant ? 5 : 4) * z, 0, 0, Math.PI * 2);
        ctx.fill();

        const bodyW = 10 * z * scale;
        const bodyH = 14 * z * scale;
        const headR = 5 * z * scale;
        const baseY = y - 2 * z;

        // Legs
        const legW = 3 * z * scale;
        const legH = 5 * z * scale;
        ctx.fillStyle = colors.body2;
        ctx.fillRect(x - 3.5 * z * scale, baseY - legH, legW, legH);
        ctx.fillRect(x + 0.5 * z * scale, baseY - legH, legW, legH);

        // Boots
        ctx.fillStyle = this.adjustColor(colors.outline, 10);
        ctx.fillRect(x - 4 * z * scale, baseY - 2.5 * z, legW + 1 * z, 2.5 * z * scale);
        ctx.fillRect(x + 0 * z * scale, baseY - 2.5 * z, legW + 1 * z, 2.5 * z * scale);

        // Body (torso)
        const torsoY = baseY - legH - bodyH + 3 * z;
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.moveTo(x - bodyW / 2, torsoY + bodyH);
        ctx.lineTo(x - bodyW / 2 - 1 * z, torsoY + 3 * z);
        ctx.lineTo(x - bodyW / 2 + 2 * z, torsoY);
        ctx.lineTo(x + bodyW / 2 - 2 * z, torsoY);
        ctx.lineTo(x + bodyW / 2 + 1 * z, torsoY + 3 * z);
        ctx.lineTo(x + bodyW / 2, torsoY + bodyH);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = colors.outline;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Belt
        ctx.fillStyle = colors.outline;
        ctx.fillRect(x - bodyW / 2, torsoY + bodyH - 3 * z, bodyW, 2 * z);

        // Belt buckle
        ctx.fillStyle = colors.accent;
        ctx.fillRect(x - 1.5 * z, torsoY + bodyH - 3 * z, 3 * z, 2 * z);

        // Arms
        const armW = 3 * z * scale;
        const armH = 10 * z * scale;
        const armY = torsoY + 1 * z;
        // Left arm
        ctx.fillStyle = colors.body;
        ctx.fillRect(x - bodyW / 2 - armW, armY + bob, armW, armH);
        // Right arm
        ctx.fillRect(x + bodyW / 2, armY + bob, armW, armH);
        // Hands
        ctx.fillStyle = colors.head;
        ctx.fillRect(x - bodyW / 2 - armW, armY + armH + bob, armW, 2.5 * z);
        ctx.fillRect(x + bodyW / 2, armY + armH + bob, armW, 2.5 * z);

        // Weapon on player/raider/guard
        if (type === 'player' || type === 'raider' || type === 'guard') {
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 1.5 * z;
            ctx.beginPath();
            ctx.moveTo(x + bodyW / 2 + armW / 2, armY + armH + 2 * z + bob);
            ctx.lineTo(x + bodyW / 2 + armW / 2 + 2 * z, armY - 4 * z + bob);
            ctx.stroke();
            // Blade tip
            ctx.fillStyle = '#AAA';
            ctx.beginPath();
            ctx.moveTo(x + bodyW / 2 + armW / 2 + 2 * z, armY - 4 * z + bob);
            ctx.lineTo(x + bodyW / 2 + armW / 2 + 3.5 * z, armY - 7 * z + bob);
            ctx.lineTo(x + bodyW / 2 + armW / 2 + 0.5 * z, armY - 5 * z + bob);
            ctx.fill();
        }

        // Merchant sack
        if (type === 'merchant') {
            ctx.fillStyle = '#886633';
            ctx.beginPath();
            ctx.arc(x - bodyW / 2 - armW - 3 * z, armY + armH * 0.6 + bob, 4 * z, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#553311';
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }

        // Neck
        ctx.fillStyle = colors.head;
        const neckY = torsoY - 1 * z;
        ctx.fillRect(x - 2 * z * scale, neckY + bob, 4 * z * scale, 3 * z);

        // Head
        const headY = neckY - headR * 1.5 + bob;
        ctx.fillStyle = colors.head;
        ctx.beginPath();
        ctx.arc(x, headY, headR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colors.outline;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Hair
        if (!isMutant) {
            ctx.fillStyle = colors.hair;
            ctx.beginPath();
            ctx.arc(x, headY - 1 * z, headR, Math.PI, Math.PI * 2);
            ctx.fill();
            // Side hair
            ctx.fillRect(x - headR, headY - 2 * z, 2 * z, 4 * z);
            ctx.fillRect(x + headR - 2 * z, headY - 2 * z, 2 * z, 4 * z);
        }

        // Eyes
        ctx.fillStyle = colors.eyes;
        ctx.beginPath();
        ctx.arc(x - 1.8 * z * scale, headY - 0.5 * z, 0.9 * z, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 1.8 * z * scale, headY - 0.5 * z, 0.9 * z, 0, Math.PI * 2);
        ctx.fill();
        // Eye whites/highlights
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x - 1.5 * z * scale, headY - 0.8 * z, 0.4 * z, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 2.1 * z * scale, headY - 0.8 * z, 0.4 * z, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        ctx.strokeStyle = this.adjustColor(colors.head, -30);
        ctx.lineWidth = 0.6 * z;
        ctx.beginPath();
        ctx.arc(x, headY + 2 * z * scale, 1.5 * z, 0, Math.PI);
        ctx.stroke();

        // Elder staff
        if (type === 'elder') {
            ctx.strokeStyle = '#886644';
            ctx.lineWidth = 2 * z;
            ctx.beginPath();
            ctx.moveTo(x - bodyW / 2 - armW - 1 * z, baseY);
            ctx.lineTo(x - bodyW / 2 - armW - 1 * z, headY - headR - 8 * z);
            ctx.stroke();
            // Staff orb
            ctx.fillStyle = '#BB88EE';
            ctx.beginPath();
            ctx.arc(x - bodyW / 2 - armW - 1 * z, headY - headR - 9 * z, 2.5 * z, 0, Math.PI * 2);
            ctx.fill();
            // Glow
            ctx.fillStyle = `rgba(187, 136, 238, ${0.15 + Math.sin(t * 0.05) * 0.1})`;
            ctx.beginPath();
            ctx.arc(x - bodyW / 2 - armW - 1 * z, headY - headR - 9 * z, 5 * z, 0, Math.PI * 2);
            ctx.fill();
        }

        // Name label for NPCs
        if (type !== 'player' && type !== 'raider') {
            ctx.font = `${9 * z}px 'Courier New'`;
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            // Name tag removed to reduce clutter — shown via Look action
        }
    }

    drawFloatingText(gx, gy, text, color = '#fff', offsetY = 0) {
        const screen = this.worldToScreen(gx, gy);
        const ctx = this.ctx;
        const z = this.camera.zoom;

        ctx.font = `bold ${14 * z}px 'Courier New'`;
        ctx.textAlign = 'center';
        // Outline
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3 * z;
        ctx.strokeText(text, screen.x, screen.y - 30 * z + offsetY);
        ctx.fillStyle = color;
        ctx.fillText(text, screen.x, screen.y - 30 * z + offsetY);
    }

    drawPath(path, color = 'rgba(100, 200, 100, 0.4)') {
        for (const point of path) {
            this.drawTileHighlight(point.x, point.y, color, 'rgba(100, 200, 100, 0.6)');
        }
    }

    drawMovementRange(tiles, color = 'rgba(100, 200, 100, 0.15)') {
        for (const tile of tiles) {
            this.drawTileHighlight(tile.x, tile.y, color, 'rgba(100, 200, 100, 0.3)');
        }
    }

    drawAttackRange(tiles) {
        for (const tile of tiles) {
            this.drawTileHighlight(tile.x, tile.y, 'rgba(200, 50, 50, 0.15)', 'rgba(200, 50, 50, 0.4)');
        }
    }

    drawTransition(gx, gy, label) {
        const screen = this.worldToScreen(gx, gy);
        const ctx = this.ctx;
        const z = this.camera.zoom;
        const pulse = 0.2 + Math.sin(this.time * 0.05) * 0.1;

        this.drawTileHighlight(gx, gy,
            `rgba(100, 150, 255, ${pulse})`,
            'rgba(100, 150, 255, 0.6)'
        );

        // Arrow indicator
        const arrowY = screen.y - 12 * z + Math.sin(this.time * 0.08) * 2 * z;
        ctx.fillStyle = '#6a9ac4';
        ctx.beginPath();
        ctx.moveTo(screen.x, arrowY - 4 * z);
        ctx.lineTo(screen.x + 4 * z, arrowY);
        ctx.lineTo(screen.x - 4 * z, arrowY);
        ctx.closePath();
        ctx.fill();

        ctx.font = `bold ${10 * z}px 'Courier New'`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText(label, screen.x, arrowY - 6 * z);
        ctx.fillStyle = '#8ac4ff';
        ctx.fillText(label, screen.x, arrowY - 6 * z);
    }

    drawParticles(ctx) {
        const camX = this.camera.x;
        const camY = this.camera.y;
        const z = this.camera.zoom;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            if (p.life <= 0) {
                p.x = camX + (Math.random() - 0.5) * cw / z;
                p.y = camY + (Math.random() - 0.5) * ch / z;
                p.life = Math.random() * 200 + 100;
                p.alpha = Math.random() * 0.3 + 0.1;
            }

            const sx = (p.x - camX) * z + cw / 2;
            const sy = (p.y - camY) * z + ch / 2;

            if (sx < -10 || sx > cw + 10 || sy < -10 || sy > ch + 10) continue;

            ctx.fillStyle = `rgba(196, 168, 120, ${p.alpha * (p.life / 200)})`;
            ctx.beginPath();
            ctx.arc(sx, sy, p.size * z, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderArea(area, entities, playerPos, gameState) {
        this.clear();
        this.updateAnimation();
        this.time++;

        const map = area.map;
        const heights = area.heights;

        const renderList = [];

        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[0].length; x++) {
                const tile = map[y][x];
                if (tile === 'void') continue;
                const h = heights ? (heights[y] ? heights[y][x] || 0 : 0) : 0;
                renderList.push({
                    type: 'tile', x, y,
                    depth: x + y,
                    tileType: tile, height: h
                });
            }
        }

        for (const ent of entities) {
            renderList.push({
                type: 'entity',
                x: ent.x, y: ent.y,
                depth: ent.x + ent.y + 0.5,
                entity: ent
            });
        }

        renderList.sort((a, b) => a.depth - b.depth);

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

        // Transitions
        if (area.transitions) {
            for (const t of area.transitions) {
                this.drawTransition(t.x, t.y, t.label || 'Exit');
            }
        }

        // Highlights
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

        // Hover
        if (gameState.hoverTile) {
            this.drawTileHighlight(
                gameState.hoverTile.x, gameState.hoverTile.y,
                'rgba(196, 148, 58, 0.15)', 'rgba(196, 148, 58, 0.4)'
            );
        }

        // Dust particles
        this.drawParticles(this.ctx);

        // Ambient overlay for caves
        if (area.ambientColor && area.ambientColor !== '#c4943a22') {
            this.ctx.fillStyle = area.ambientColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
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

    drawWorldMap(ctx, locations, currentLocation) {
        ctx.fillStyle = '#1a1209';
        ctx.fillRect(0, 0, 400, 300);

        // Terrain dots
        ctx.fillStyle = '#2a1f0e';
        for (let i = 0; i < 80; i++) {
            const x = (i * 37 + i * i * 3) % 400;
            const y = (i * 53 + i * 7) % 300;
            ctx.fillRect(x, y, 1 + (i % 3), 1 + (i % 2));
        }

        for (const loc of locations) {
            const isCurrent = loc.id === currentLocation;

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

            // Glow for current
            if (isCurrent) {
                ctx.fillStyle = 'rgba(196, 148, 58, 0.15)';
                ctx.beginPath();
                ctx.arc(loc.mapX, loc.mapY, 16, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(loc.mapX, loc.mapY, isCurrent ? 8 : 5, 0, Math.PI * 2);
            ctx.fillStyle = isCurrent ? '#c4943a' : (loc.discovered ? '#6b5a3a' : '#3a2a1a');
            ctx.fill();
            ctx.strokeStyle = isCurrent ? '#e0d5c0' : '#4a3a20';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            if (loc.discovered || isCurrent) {
                ctx.font = '10px Courier New';
                ctx.textAlign = 'center';
                ctx.fillStyle = isCurrent ? '#c4943a' : '#6b5a3a';
                ctx.fillText(loc.name, loc.mapX, loc.mapY + 18);
            }
        }
    }
}
