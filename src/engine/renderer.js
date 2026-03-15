// ============================================
// Dustwalker - Isometric Renderer (Gritty Pixel Art)
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
        this.time = 0;

        // Dust particles
        this.particles = [];
        for (let i = 0; i < 40; i++) {
            this.particles.push({
                x: Math.random() * 2000 - 1000,
                y: Math.random() * 2000 - 1000,
                vx: (Math.random() - 0.5) * 0.4,
                vy: -Math.random() * 0.15 - 0.02,
                size: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.2 + 0.05,
                life: Math.random() * 300 + 100,
            });
        }

        // Deterministic noise
        this.noiseSeed = [];
        for (let i = 0; i < 512; i++) {
            this.noiseSeed.push(Math.random());
        }

        // Gritty post-apocalyptic palette
        this.tileColors = {
            'dirt':        { top: '#7A6545', left: '#5A4525', right: '#6A5535', stroke: '#4A3515' },
            'sand':        { top: '#B0A070', left: '#908050', right: '#A09060', stroke: '#807040' },
            'grass':       { top: '#4A6A2A', left: '#2A4A0A', right: '#3A5A1A', stroke: '#1A3A00' },
            'stone':       { top: '#707070', left: '#505050', right: '#606060', stroke: '#404040' },
            'wood':        { top: '#6B5020', left: '#4B3010', right: '#5B4018', stroke: '#3B2008' },
            'water':       { top: '#1A3366', left: '#0A2356', right: '#122D60', stroke: '#081D4A' },
            'road':        { top: '#5A5A4A', left: '#3A3A2A', right: '#4A4A3A', stroke: '#2A2A1A' },
            'cave_floor':  { top: '#3A3030', left: '#2A2020', right: '#302828', stroke: '#1A1010' },
            'cave_wall':   { top: '#4A4040', left: '#2A2020', right: '#3A3030', stroke: '#1A1010' },
            'cave_rock':   { top: '#555048', left: '#353028', right: '#454038', stroke: '#252018' },
            'lava':        { top: '#AA3300', left: '#881100', right: '#992200', stroke: '#660000' },
            'crystal':     { top: '#5599AA', left: '#337788', right: '#448899', stroke: '#226677' },
            'wall':        { top: '#8A7A5A', left: '#5A4A2A', right: '#6A5A3A', stroke: '#4A3A1A' },
            'wall_top':    { top: '#9A8A6A', left: '#6A5A3A', right: '#7A6A4A', stroke: '#5A4A2A' },
            'door':        { top: '#5B3910', left: '#3B1900', right: '#4B2908', stroke: '#2B0F00' },
            'void':        { top: '#050505', left: '#020202', right: '#030303', stroke: '#000000' },
        };

        this.resize();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    clear() {
        this.ctx.fillStyle = '#080604';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    noise(x, y) {
        return this.noiseSeed[((x * 73 + y * 137) & 511)];
    }

    noise2(x, y) {
        return this.noiseSeed[((x * 31 + y * 97 + 200) & 511)];
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

    // Color utility
    hexToRgb(hex) {
        const r = parseInt(hex.slice(1,3), 16);
        const g = parseInt(hex.slice(3,5), 16);
        const b = parseInt(hex.slice(5,7), 16);
        return [r, g, b];
    }

    rgbStr(r, g, b, a) {
        r = Math.max(0, Math.min(255, r|0));
        g = Math.max(0, Math.min(255, g|0));
        b = Math.max(0, Math.min(255, b|0));
        if (a !== undefined) return `rgba(${r},${g},${b},${a})`;
        return `rgb(${r},${g},${b})`;
    }

    adjustColor(hex, amt) {
        const [r,g,b] = this.hexToRgb(hex);
        return this.rgbStr(r+amt, g+amt, b+amt);
    }

    // Mix two hex colors
    mixColor(hex1, hex2, t) {
        const [r1,g1,b1] = this.hexToRgb(hex1);
        const [r2,g2,b2] = this.hexToRgb(hex2);
        return this.rgbStr(
            r1 + (r2-r1)*t,
            g1 + (g2-g1)*t,
            b1 + (b2-b1)*t
        );
    }

    // ---- TILE RENDERING ----

    drawTile(gx, gy, tileType, height = 0) {
        const colors = this.tileColors[tileType] || this.tileColors['dirt'];
        const screen = this.worldToScreen(gx, gy);
        const tw = this.tileWidth * this.camera.zoom / 2;
        const th = this.tileHeight * this.camera.zoom / 2;
        const hOffset = height * 8 * this.camera.zoom;
        const ctx = this.ctx;
        const z = this.camera.zoom;
        const n = this.noise(gx, gy);
        const n2 = this.noise2(gx, gy);

        // Slight per-tile color variation for gritty look
        const variation = (n - 0.5) * 12;

        // Top face
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - th - hOffset);
        ctx.lineTo(screen.x + tw, screen.y - hOffset);
        ctx.lineTo(screen.x, screen.y + th - hOffset);
        ctx.lineTo(screen.x - tw, screen.y - hOffset);
        ctx.closePath();
        ctx.fillStyle = this.adjustColor(colors.top, variation);
        ctx.fill();

        // Tile texture overlay
        ctx.save();
        ctx.clip();
        this.drawTileTexture(ctx, screen, tw, th, hOffset, z, gx, gy, tileType, n, n2);
        ctx.restore();

        // Subtle edge line
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - th - hOffset);
        ctx.lineTo(screen.x + tw, screen.y - hOffset);
        ctx.lineTo(screen.x, screen.y + th - hOffset);
        ctx.lineTo(screen.x - tw, screen.y - hOffset);
        ctx.closePath();
        ctx.strokeStyle = this.adjustColor(colors.stroke, variation);
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Wall sides
        if (height > 0) {
            this.drawWallSides(ctx, screen, tw, th, hOffset, z, gx, gy, tileType, colors, height, n);
        }
    }

    drawWallSides(ctx, screen, tw, th, hOffset, z, gx, gy, tileType, colors, height, n) {
        // Left face
        ctx.beginPath();
        ctx.moveTo(screen.x - tw, screen.y - hOffset);
        ctx.lineTo(screen.x, screen.y + th - hOffset);
        ctx.lineTo(screen.x, screen.y + th);
        ctx.lineTo(screen.x - tw, screen.y);
        ctx.closePath();
        ctx.fillStyle = colors.left;
        ctx.fill();

        // Brick/stone detail on left
        ctx.save();
        ctx.clip();
        const brickH = 4 * z;
        const isStone = tileType === 'cave_wall' || tileType === 'cave_rock';
        for (let i = 0; i < height * 3; i++) {
            const by = screen.y + th - i * brickH;
            const offset = (i % 2) * 6 * z;
            ctx.strokeStyle = this.adjustColor(colors.left, -10 - this.noise(gx * 3 + i, gy) * 8);
            ctx.lineWidth = 0.5;
            // Horizontal mortar line
            ctx.beginPath();
            ctx.moveTo(screen.x - tw, by);
            ctx.lineTo(screen.x, by);
            ctx.stroke();
            // Vertical mortar lines (offset every other row)
            if (!isStone) {
                for (let j = 0; j < 3; j++) {
                    const bx = screen.x - tw + offset + j * 10 * z;
                    ctx.beginPath();
                    ctx.moveTo(bx, by);
                    ctx.lineTo(bx, by - brickH);
                    ctx.stroke();
                }
            }
        }
        // Weathering stains
        ctx.fillStyle = `rgba(0,0,0,${0.05 + n * 0.08})`;
        ctx.fillRect(screen.x - tw, screen.y + th - 8 * z, tw, 8 * z);
        ctx.restore();

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

        ctx.save();
        ctx.clip();
        for (let i = 0; i < height * 3; i++) {
            const by = screen.y + th - i * brickH;
            const offset = (i % 2) * 6 * z;
            ctx.strokeStyle = this.adjustColor(colors.right, -10 - this.noise(gx + i * 7, gy * 3) * 8);
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(screen.x, by);
            ctx.lineTo(screen.x + tw, by);
            ctx.stroke();
            if (!isStone) {
                for (let j = 0; j < 3; j++) {
                    const bx = screen.x + offset + j * 10 * z;
                    ctx.beginPath();
                    ctx.moveTo(bx, by);
                    ctx.lineTo(bx, by - brickH);
                    ctx.stroke();
                }
            }
        }
        ctx.fillStyle = `rgba(0,0,0,${0.04 + n * 0.06})`;
        ctx.fillRect(screen.x, screen.y + th - 6 * z, tw, 6 * z);
        ctx.restore();

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

    drawTileTexture(ctx, screen, tw, th, hOff, z, gx, gy, type, n, n2) {
        const cx = screen.x;
        const cy = screen.y - hOff;

        if (type === 'grass') {
            // Sparse, dry grass tufts (wasteland style)
            const count = 4 + Math.floor(n * 3);
            for (let i = 0; i < count; i++) {
                const nx = this.noise(gx * 11 + i, gy * 7);
                const ny = this.noise(gx * 7, gy * 11 + i);
                const bx = cx + (nx - 0.5) * tw * 1.1;
                const by = cy + (ny - 0.5) * th * 1.1;
                const sway = Math.sin(this.time * 0.02 + gx + i * 0.7) * z;
                const h = (2 + nx * 3) * z;
                // Dead/brown grass mixed with green
                const green = this.noise(gx + i * 3, gy + i * 5) > 0.4;
                ctx.strokeStyle = green
                    ? this.rgbStr(60 + n * 30, 90 + n * 20, 30, 0.6)
                    : this.rgbStr(100 + n * 20, 80 + n * 15, 40, 0.5);
                ctx.lineWidth = 0.8 * z;
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + sway, by - h);
                ctx.stroke();
            }
            // Dirt patches underneath
            ctx.fillStyle = `rgba(90, 70, 40, ${0.15 + n2 * 0.1})`;
            ctx.beginPath();
            ctx.ellipse(cx + (n - 0.5) * 8, cy + (n2 - 0.3) * 5, 5 * z, 2 * z, n * 3, 0, Math.PI * 2);
            ctx.fill();
        }

        if (type === 'sand') {
            // Wind-swept lines and pebbles
            ctx.strokeStyle = `rgba(140, 120, 80, ${0.08 + n * 0.06})`;
            ctx.lineWidth = 0.5 * z;
            for (let i = 0; i < 3; i++) {
                const y = cy + (i - 1) * 3 * z + n * 2;
                ctx.beginPath();
                ctx.moveTo(cx - tw * 0.5, y);
                ctx.quadraticCurveTo(cx, y - z, cx + tw * 0.5, y + n2 * z);
                ctx.stroke();
            }
            // Small stones
            for (let i = 0; i < 2; i++) {
                const sx = cx + (this.noise(gx * 9 + i, gy * 5) - 0.5) * tw * 0.7;
                const sy = cy + (this.noise(gx * 5, gy * 9 + i) - 0.5) * th * 0.7;
                ctx.fillStyle = `rgba(100, 85, 60, ${0.2 + n * 0.15})`;
                ctx.fillRect(sx, sy, 1.5 * z, 1 * z);
            }
        }

        if (type === 'dirt') {
            // Cracked, parched earth
            ctx.strokeStyle = `rgba(60, 45, 20, ${0.12 + n * 0.1})`;
            ctx.lineWidth = 0.6 * z;
            if (n > 0.3) {
                ctx.beginPath();
                ctx.moveTo(cx - 4 * z, cy - 1 * z);
                ctx.lineTo(cx + n * 3 * z, cy + n2 * 2 * z);
                ctx.lineTo(cx + 5 * z, cy - n2 * z);
                ctx.stroke();
            }
            if (n2 > 0.5) {
                ctx.beginPath();
                ctx.moveTo(cx + 2 * z, cy + 2 * z);
                ctx.lineTo(cx - 3 * z, cy + 4 * z);
                ctx.stroke();
            }
            // Tiny pebbles
            ctx.fillStyle = `rgba(80, 60, 35, ${0.15 + n2 * 0.1})`;
            ctx.fillRect(cx + n * 8 - 4, cy + n2 * 4 - 2, 1.5 * z, z);
        }

        if (type === 'road') {
            // Cracked asphalt look
            ctx.strokeStyle = `rgba(40, 35, 25, ${0.15 + n * 0.1})`;
            ctx.lineWidth = 0.6 * z;
            if (n > 0.4) {
                ctx.beginPath();
                ctx.moveTo(cx - 6 * z, cy - n2 * 2 * z);
                ctx.lineTo(cx - 1 * z, cy + z);
                ctx.lineTo(cx + 4 * z, cy - z);
                ctx.stroke();
            }
            // Worn paint line (center of road)
            if (n2 > 0.6) {
                ctx.fillStyle = `rgba(180, 160, 80, ${0.06 + n * 0.04})`;
                ctx.fillRect(cx - z, cy - 0.5 * z, 2 * z, z);
            }
        }

        if (type === 'water') {
            // Dark, murky wasteland water
            const wave = Math.sin(this.time * 0.04 + gx * 2.5 + gy * 1.5) * 0.12 + 0.08;
            ctx.fillStyle = this.rgbStr(40, 70, 100, wave);
            const rx = cx + Math.sin(this.time * 0.025 + gy) * 2 * z;
            ctx.beginPath();
            ctx.ellipse(rx, cy, 7 * z, 2 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Oil-slick sheen
            const sheen = Math.sin(this.time * 0.06 + gx + gy * 2) * 0.04 + 0.03;
            ctx.fillStyle = this.rgbStr(80, 100, 60, sheen);
            ctx.beginPath();
            ctx.ellipse(cx - 3 * z, cy + z, 4 * z, 1.5 * z, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        if (type === 'wood') {
            // Wood grain
            ctx.strokeStyle = `rgba(50, 30, 5, ${0.15 + n * 0.1})`;
            ctx.lineWidth = 0.5 * z;
            for (let i = 0; i < 3; i++) {
                const y = cy + (i - 1) * 2.5 * z;
                ctx.beginPath();
                ctx.moveTo(cx - tw * 0.5, y + n * z);
                ctx.lineTo(cx + tw * 0.5, y - n2 * z);
                ctx.stroke();
            }
            // Knots
            if (n > 0.7) {
                ctx.fillStyle = `rgba(40, 25, 5, 0.2)`;
                ctx.beginPath();
                ctx.arc(cx + 3 * z, cy - z, 1.5 * z, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (type === 'door') {
            // Door planks and handle
            ctx.strokeStyle = 'rgba(30, 15, 0, 0.2)';
            ctx.lineWidth = 0.5 * z;
            ctx.beginPath();
            ctx.moveTo(cx, cy - th * 0.6);
            ctx.lineTo(cx, cy + th * 0.6);
            ctx.stroke();
            // Handle
            ctx.fillStyle = '#776644';
            ctx.beginPath();
            ctx.arc(cx + 3 * z, cy, 1.2 * z, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#443322';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        if (type === 'cave_floor') {
            // Scattered pebbles and grime
            for (let i = 0; i < 3; i++) {
                const px = cx + (this.noise(gx * 5 + i, gy * 9) - 0.5) * tw * 0.7;
                const py = cy + (this.noise(gx * 9 + i, gy * 5) - 0.5) * th * 0.7;
                ctx.fillStyle = `rgba(60, 50, 40, ${0.2 + n * 0.15})`;
                ctx.beginPath();
                ctx.arc(px, py, (0.8 + n * 0.8) * z, 0, Math.PI * 2);
                ctx.fill();
            }
            // Moisture stains
            if (n > 0.6) {
                ctx.fillStyle = `rgba(30, 30, 35, 0.1)`;
                ctx.beginPath();
                ctx.ellipse(cx, cy, 5 * z, 2 * z, n2 * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (type === 'crystal') {
            const glow = 0.15 + Math.sin(this.time * 0.05 + gx + gy) * 0.1;
            // Crystal shards
            ctx.fillStyle = this.rgbStr(80, 170, 200, glow + 0.15);
            ctx.beginPath();
            ctx.moveTo(cx - 2 * z, cy + 2 * z);
            ctx.lineTo(cx, cy - 5 * z);
            ctx.lineTo(cx + 2 * z, cy + 2 * z);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = this.rgbStr(100, 190, 220, glow + 0.1);
            ctx.beginPath();
            ctx.moveTo(cx + z, cy + z);
            ctx.lineTo(cx + 3 * z, cy - 3 * z);
            ctx.lineTo(cx + 4 * z, cy + z);
            ctx.closePath();
            ctx.fill();
            // Glow aura
            ctx.fillStyle = this.rgbStr(100, 180, 220, glow * 0.4);
            ctx.beginPath();
            ctx.arc(cx, cy - z, 8 * z, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ---- TILE HIGHLIGHT ----

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

    // ---- ENTITY RENDERING ----

    drawEntity(gx, gy, entityType, facing = 'south', isSelected = false, hp = null, maxHp = null) {
        const screen = this.worldToScreen(gx, gy);
        const ctx = this.ctx;
        const z = this.camera.zoom;

        if (isSelected) {
            this.drawTileHighlight(gx, gy, 'rgba(100, 200, 100, 0.2)', 'rgba(100, 200, 100, 0.5)');
        }

        if (entityType === 'chest' || entityType === 'crate') {
            this.drawContainer(ctx, screen, z, entityType);
            return;
        }

        if (entityType === 'bones') {
            this.drawBones(ctx, screen, z);
            return;
        }

        if (['rat', 'scorpion', 'cave_spider'].includes(entityType)) {
            this.drawCreature(ctx, screen, z, entityType);
        } else {
            this.drawHumanoid(ctx, screen, z, entityType, facing);
        }

        // HP bar (always show for enemies, show for others only when damaged)
        if (hp !== null && maxHp !== null && (hp < maxHp || entityType !== 'player')) {
            const isSmall = ['rat', 'scorpion', 'cave_spider'].includes(entityType);
            const barW = 22 * z;
            const barH = 2.5 * z;
            const barY = screen.y - (isSmall ? 18 : 38) * z;

            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(screen.x - barW/2 - 1, barY - 1, barW + 2, barH + 2);

            const hpRatio = hp / maxHp;
            const r = Math.min(255, Math.floor(200 * (1 - hpRatio) + 80));
            const g = Math.floor(150 * hpRatio);
            ctx.fillStyle = this.rgbStr(r, g, 20);
            ctx.fillRect(screen.x - barW/2, barY, barW * hpRatio, barH);

            // Notches
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 0.5;
            for (let i = 1; i < 4; i++) {
                const nx = screen.x - barW/2 + (barW/4) * i;
                ctx.beginPath();
                ctx.moveTo(nx, barY);
                ctx.lineTo(nx, barY + barH);
                ctx.stroke();
            }
        }
    }

    drawContainer(ctx, screen, z, type) {
        const x = screen.x;
        const y = screen.y;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y + z, 8 * z, 3 * z, 0, 0, Math.PI * 2);
        ctx.fill();

        if (type === 'chest') {
            const bw = 14 * z, bh = 10 * z;
            const by = y - bh - 2 * z;
            // Base
            ctx.fillStyle = '#5A4010';
            ctx.fillRect(x - bw/2, by + 3 * z, bw, bh - 3 * z);
            // Lid
            ctx.fillStyle = '#6B4E1A';
            ctx.fillRect(x - bw/2, by, bw, 4 * z);
            // Metal trim
            ctx.fillStyle = '#444';
            ctx.fillRect(x - bw/2, by + 3.5 * z, bw, 1.2 * z);
            ctx.fillRect(x - 1 * z, by, 2 * z, bh);
            // Corners
            ctx.fillStyle = '#555';
            ctx.fillRect(x - bw/2, by, 2 * z, 2 * z);
            ctx.fillRect(x + bw/2 - 2 * z, by, 2 * z, 2 * z);
            // Lock
            ctx.fillStyle = '#777';
            ctx.fillRect(x - 1.5 * z, by + 4 * z, 3 * z, 2 * z);
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(x, by + 5.2 * z, 0.5 * z, 0, Math.PI * 2);
            ctx.fill();
            // Outline
            ctx.strokeStyle = '#2A1800';
            ctx.lineWidth = 1;
            ctx.strokeRect(x - bw/2, by, bw, bh);
            // Wear marks
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            ctx.fillRect(x - bw/2, by + bh - 3 * z, bw, 3 * z);
        } else {
            const bw = 12 * z, bh = 11 * z;
            const by = y - bh - 2 * z;
            ctx.fillStyle = '#5B3B08';
            ctx.fillRect(x - bw/2, by, bw, bh);
            // Slats
            ctx.strokeStyle = '#3B2B00';
            ctx.lineWidth = 0.8;
            for (let i = 1; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(x - bw/2, by + (bh/4) * i);
                ctx.lineTo(x + bw/2, by + (bh/4) * i);
                ctx.stroke();
            }
            // Nails
            ctx.fillStyle = '#666';
            const nailPositions = [[x - bw/2 + 2*z, by + 2*z], [x + bw/2 - 2*z, by + 2*z],
                                   [x - bw/2 + 2*z, by + bh - 2*z], [x + bw/2 - 2*z, by + bh - 2*z]];
            for (const [nx, ny] of nailPositions) {
                ctx.fillRect(nx - 0.5*z, ny - 0.5*z, z, z);
            }
            ctx.strokeStyle = '#2A1800';
            ctx.lineWidth = 1;
            ctx.strokeRect(x - bw/2, by, bw, bh);
        }
    }

    drawBones(ctx, screen, z) {
        const x = screen.x;
        const y = screen.y;
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(x, y, 7 * z, 3 * z, 0, 0, Math.PI * 2);
        ctx.fill();
        // Skull
        ctx.fillStyle = '#BBAA88';
        ctx.beginPath();
        ctx.ellipse(x, y - 3 * z, 3.5 * z, 3 * z, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#887766';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        // Eye sockets
        ctx.fillStyle = '#1a1008';
        ctx.beginPath();
        ctx.ellipse(x - 1.2 * z, y - 3.5 * z, 1 * z, 0.8 * z, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 1.2 * z, y - 3.5 * z, 1 * z, 0.8 * z, 0, 0, Math.PI * 2);
        ctx.fill();
        // Nose hole
        ctx.fillStyle = '#2a1808';
        ctx.beginPath();
        ctx.arc(x, y - 2.2 * z, 0.5 * z, 0, Math.PI * 2);
        ctx.fill();
        // Crossbones
        ctx.strokeStyle = '#BBAA88';
        ctx.lineWidth = 1.5 * z;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - 6 * z, y - z);
        ctx.lineTo(x + 6 * z, y + z);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 6 * z, y - z);
        ctx.lineTo(x - 6 * z, y + z);
        ctx.stroke();
        ctx.lineCap = 'butt';
    }

    drawCreature(ctx, screen, z, type) {
        const x = screen.x;
        const y = screen.y;
        const t = this.time;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(x, y, 7 * z, 3 * z, 0, 0, Math.PI * 2);
        ctx.fill();

        if (type === 'rat') {
            const bob = Math.sin(t * 0.1) * 0.5 * z;
            // Body
            ctx.fillStyle = '#5A4A3A';
            ctx.beginPath();
            ctx.ellipse(x, y - 5 * z + bob, 6 * z, 3.5 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Fur texture
            ctx.fillStyle = '#4A3A2A';
            ctx.beginPath();
            ctx.ellipse(x - z, y - 5 * z + bob, 3 * z, 2 * z, 0.3, 0, Math.PI * 2);
            ctx.fill();
            // Head
            ctx.fillStyle = '#6A5A4A';
            ctx.beginPath();
            ctx.ellipse(x + 5 * z, y - 6 * z + bob, 3 * z, 2.5 * z, 0.3, 0, Math.PI * 2);
            ctx.fill();
            // Snout
            ctx.fillStyle = '#7A6A5A';
            ctx.beginPath();
            ctx.ellipse(x + 7.5 * z, y - 6 * z + bob, 1.2 * z, 1 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Eyes (beady)
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(x + 6 * z, y - 7 * z + bob, 0.7 * z, 0, Math.PI * 2);
            ctx.fill();
            // Eye gleam
            ctx.fillStyle = '#FF4400';
            ctx.beginPath();
            ctx.arc(x + 5.8 * z, y - 7.2 * z + bob, 0.3 * z, 0, Math.PI * 2);
            ctx.fill();
            // Ears
            ctx.fillStyle = '#7A5A4A';
            ctx.beginPath();
            ctx.ellipse(x + 3.5 * z, y - 9 * z + bob, 1.5 * z, 2 * z, -0.3, 0, Math.PI * 2);
            ctx.fill();
            // Tail
            ctx.strokeStyle = '#6A5A4A';
            ctx.lineWidth = 1 * z;
            ctx.beginPath();
            ctx.moveTo(x - 6 * z, y - 5 * z + bob);
            ctx.quadraticCurveTo(x - 10 * z, y - 9 * z, x - 8 * z, y - 12 * z + bob);
            ctx.stroke();
            // Outline
            ctx.strokeStyle = '#3A2A1A';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.ellipse(x, y - 5 * z + bob, 6 * z, 3.5 * z, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (type === 'scorpion') {
            const bob = Math.sin(t * 0.07) * 0.4 * z;
            // Body
            ctx.fillStyle = '#6A3510';
            ctx.beginPath();
            ctx.ellipse(x, y - 4 * z + bob, 7 * z, 4 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Armour plates
            ctx.fillStyle = '#7A4520';
            ctx.beginPath();
            ctx.ellipse(x - z, y - 5 * z + bob, 4 * z, 2.5 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Head
            ctx.fillStyle = '#8A5530';
            ctx.beginPath();
            ctx.ellipse(x + 6 * z, y - 5 * z + bob, 3 * z, 2.5 * z, 0.2, 0, Math.PI * 2);
            ctx.fill();
            // Pincers
            ctx.strokeStyle = '#6A3510';
            ctx.lineWidth = 2 * z;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x + 8 * z, y - 6 * z + bob);
            ctx.lineTo(x + 12 * z, y - 9 * z + bob);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 12 * z, y - 9 * z + bob);
            ctx.lineTo(x + 10 * z, y - 7 * z + bob);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 8 * z, y - 3 * z + bob);
            ctx.lineTo(x + 12 * z, y - 1 * z + bob);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 12 * z, y - 1 * z + bob);
            ctx.lineTo(x + 10 * z, y - 3 * z + bob);
            ctx.stroke();
            ctx.lineCap = 'butt';
            // Tail segments
            ctx.strokeStyle = '#7A4520';
            ctx.lineWidth = 2.5 * z;
            ctx.beginPath();
            ctx.moveTo(x - 6 * z, y - 4 * z + bob);
            ctx.quadraticCurveTo(x - 10 * z, y - 10 * z, x - 8 * z, y - 16 * z + bob);
            ctx.quadraticCurveTo(x - 6 * z, y - 18 * z, x - 5 * z, y - 17 * z + bob);
            ctx.stroke();
            // Stinger (venomous green-yellow)
            ctx.fillStyle = '#88AA22';
            ctx.beginPath();
            ctx.moveTo(x - 5 * z, y - 17 * z + bob);
            ctx.lineTo(x - 4 * z, y - 20 * z + bob);
            ctx.lineTo(x - 6 * z, y - 18 * z + bob);
            ctx.closePath();
            ctx.fill();
            // Venom drip
            ctx.fillStyle = this.rgbStr(120, 180, 30, 0.3 + Math.sin(t * 0.1) * 0.15);
            ctx.beginPath();
            ctx.arc(x - 4 * z, y - 20 * z + bob + Math.sin(t * 0.08) * z, z, 0, Math.PI * 2);
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#FF3300';
            ctx.beginPath();
            ctx.arc(x + 7 * z, y - 6 * z + bob, 0.8 * z, 0, Math.PI * 2);
            ctx.fill();
            // Legs
            ctx.strokeStyle = '#5A2510';
            ctx.lineWidth = 0.8 * z;
            for (let i = 0; i < 4; i++) {
                const lx = x - 3 * z + i * 3 * z;
                const sway = Math.sin(t * 0.1 + i * 1.5) * 0.8 * z;
                ctx.beginPath();
                ctx.moveTo(lx, y - 2 * z + bob);
                ctx.lineTo(lx - 4 * z + sway, y + 1.5 * z);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(lx, y - 2 * z + bob);
                ctx.lineTo(lx + 4 * z - sway, y + 1.5 * z);
                ctx.stroke();
            }
        }

        if (type === 'cave_spider') {
            const bob = Math.sin(t * 0.12) * 0.4 * z;
            // Abdomen
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.ellipse(x - z, y - 5 * z + bob, 5.5 * z, 4 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Pattern on abdomen
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(x - z, y - 8 * z + bob);
            ctx.lineTo(x + 2 * z, y - 5 * z + bob);
            ctx.lineTo(x - z, y - 2 * z + bob);
            ctx.lineTo(x - 4 * z, y - 5 * z + bob);
            ctx.closePath();
            ctx.fill();
            // Cephalothorax
            ctx.fillStyle = '#2A2A2A';
            ctx.beginPath();
            ctx.ellipse(x + 4 * z, y - 6 * z + bob, 3 * z, 2.5 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Eyes (cluster of red dots)
            const eyePositions = [[-0.5, -1], [0.5, -1], [-1, -0.3], [1, -0.3], [0, -1.5], [-0.3, 0], [0.3, 0], [0, -0.6]];
            ctx.fillStyle = '#CC0000';
            for (const [ex, ey] of eyePositions) {
                ctx.beginPath();
                ctx.arc(x + 5.5 * z + ex * z, y - 7 * z + ey * z + bob, 0.4 * z, 0, Math.PI * 2);
                ctx.fill();
            }
            // Fangs
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1.2 * z;
            ctx.beginPath();
            ctx.moveTo(x + 6 * z, y - 5 * z + bob);
            ctx.lineTo(x + 7 * z, y - 3.5 * z + bob);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 5 * z, y - 5 * z + bob);
            ctx.lineTo(x + 4 * z, y - 3.5 * z + bob);
            ctx.stroke();
            // Legs (8 jointed legs)
            ctx.strokeStyle = '#1A1A1A';
            ctx.lineWidth = 0.8 * z;
            for (let i = 0; i < 4; i++) {
                const lx = x - 2 * z + i * 2.5 * z;
                const sway = Math.sin(t * 0.14 + i * 1.3) * 1.2 * z;
                const midY = y - 9 * z + bob;
                // Left
                ctx.beginPath();
                ctx.moveTo(lx, y - 4 * z + bob);
                ctx.lineTo(lx - 5 * z, midY);
                ctx.lineTo(lx - 7 * z + sway, y + z);
                ctx.stroke();
                // Right
                ctx.beginPath();
                ctx.moveTo(lx, y - 4 * z + bob);
                ctx.lineTo(lx + 5 * z, midY);
                ctx.lineTo(lx + 7 * z - sway, y + z);
                ctx.stroke();
            }
        }
    }

    drawHumanoid(ctx, screen, z, type, facing) {
        const x = screen.x;
        const y = screen.y;
        const t = this.time;
        const bob = Math.sin(t * 0.07) * 0.3 * z;
        const isMutant = type === 'mutant';
        const sc = isMutant ? 1.4 : 1;

        // Color sets by type (gritty palette)
        const palettes = {
            'player':  { skin: '#C4A070', shirt: '#8A6A30', pants: '#4A3A20', boots: '#2A1A0A', hair: '#3A2A1A', belt: '#3A2810', accent: '#AA8840' },
            'villager':{ skin: '#B09878', shirt: '#6A7A8A', pants: '#3A3A3A', boots: '#222', hair: '#5A4A3A', belt: '#333', accent: '#556677' },
            'merchant':{ skin: '#B09878', shirt: '#8A6A35', pants: '#3A3020', boots: '#2A1A0A', hair: '#4A3A2A', belt: '#443322', accent: '#AA8855' },
            'elder':   { skin: '#B09878', shirt: '#6A4488', pants: '#2A2040', boots: '#1A1020', hair: '#AAAAAA', belt: '#3A2A4A', accent: '#8866AA' },
            'guard':   { skin: '#B09878', shirt: '#4A6A2A', pants: '#2A3A1A', boots: '#1A1A0A', hair: '#3A2A1A', belt: '#3A3A20', accent: '#667744' },
            'raider':  { skin: '#B09070', shirt: '#6A1A1A', pants: '#2A1010', boots: '#1A0A0A', hair: '#222', belt: '#4A2020', accent: '#882222' },
            'mutant':  { skin: '#5A8A20', shirt: '#3A5A10', pants: '#2A3A08', boots: '#1A2A00', hair: '#4A7A10', belt: '#3A4A10', accent: '#6AAA20' },
        };
        const p = palettes[type] || palettes['villager'];

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(x, y, (isMutant ? 11 : 8) * z, (isMutant ? 4.5 : 3.5) * z, 0, 0, Math.PI * 2);
        ctx.fill();

        const baseY = y - 2 * z;

        // --- LEGS ---
        const legW = 3 * z * sc;
        const legH = 6 * z * sc;
        // Left leg
        ctx.fillStyle = p.pants;
        ctx.fillRect(x - 3.5 * z * sc, baseY - legH, legW, legH);
        // Right leg
        ctx.fillRect(x + 0.5 * z * sc, baseY - legH, legW, legH);
        // Knee patches (worn look)
        ctx.fillStyle = this.adjustColor(p.pants, 10);
        ctx.fillRect(x - 3.5 * z * sc, baseY - legH * 0.5, legW, 2 * z);
        ctx.fillRect(x + 0.5 * z * sc, baseY - legH * 0.5, legW, 2 * z);

        // --- BOOTS ---
        ctx.fillStyle = p.boots;
        const bootH = 3 * z * sc;
        ctx.fillRect(x - 4 * z * sc, baseY - bootH, legW + 1.5 * z, bootH);
        ctx.fillRect(x + 0 * z * sc, baseY - bootH, legW + 1.5 * z, bootH);
        // Boot soles
        ctx.fillStyle = '#111';
        ctx.fillRect(x - 4 * z * sc, baseY - 1 * z, legW + 1.5 * z, z);
        ctx.fillRect(x + 0 * z * sc, baseY - 1 * z, legW + 1.5 * z, z);

        // --- TORSO ---
        const bodyW = 10 * z * sc;
        const bodyH = 12 * z * sc;
        const torsoY = baseY - legH - bodyH + 2 * z;

        ctx.fillStyle = p.shirt;
        ctx.fillRect(x - bodyW / 2, torsoY + bob, bodyW, bodyH);
        // Shirt detail - seam down center
        ctx.strokeStyle = this.adjustColor(p.shirt, -15);
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, torsoY + bob);
        ctx.lineTo(x, torsoY + bodyH + bob);
        ctx.stroke();
        // Collar
        ctx.fillStyle = this.adjustColor(p.shirt, 15);
        ctx.fillRect(x - 3 * z * sc, torsoY + bob, 6 * z * sc, 2 * z);
        // Pockets
        if (type !== 'mutant') {
            ctx.strokeStyle = this.adjustColor(p.shirt, -10);
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x - bodyW/2 + 1.5*z, torsoY + 5*z + bob, 3*z, 3*z);
            ctx.strokeRect(x + bodyW/2 - 4.5*z, torsoY + 5*z + bob, 3*z, 3*z);
        }

        // --- BELT ---
        ctx.fillStyle = p.belt;
        ctx.fillRect(x - bodyW / 2, torsoY + bodyH - 2 * z + bob, bodyW, 2.5 * z);
        // Buckle
        ctx.fillStyle = p.accent;
        ctx.fillRect(x - 1.5 * z, torsoY + bodyH - 2 * z + bob, 3 * z, 2.5 * z);

        // --- ARMS ---
        const armW = 3 * z * sc;
        const armH = 9 * z * sc;
        const armY = torsoY + 2 * z + bob;
        // Left arm
        ctx.fillStyle = p.shirt;
        ctx.fillRect(x - bodyW / 2 - armW, armY, armW, armH);
        // Right arm
        ctx.fillRect(x + bodyW / 2, armY, armW, armH);
        // Rolled sleeves
        ctx.fillStyle = this.adjustColor(p.shirt, 10);
        ctx.fillRect(x - bodyW / 2 - armW, armY, armW, 2 * z);
        ctx.fillRect(x + bodyW / 2, armY, armW, 2 * z);
        // Hands (skin)
        ctx.fillStyle = p.skin;
        const handH = 2 * z * sc;
        ctx.fillRect(x - bodyW / 2 - armW, armY + armH, armW, handH);
        ctx.fillRect(x + bodyW / 2, armY + armH, armW, handH);

        // --- WEAPON ---
        if (type === 'player' || type === 'raider' || type === 'guard') {
            // Knife/blade
            ctx.fillStyle = '#777';
            const wx = x + bodyW / 2 + armW / 2;
            const wy = armY + armH + handH;
            ctx.beginPath();
            ctx.moveTo(wx - 0.5 * z, wy);
            ctx.lineTo(wx, wy - 8 * z);
            ctx.lineTo(wx + z, wy);
            ctx.closePath();
            ctx.fill();
            // Blade shine
            ctx.fillStyle = '#999';
            ctx.beginPath();
            ctx.moveTo(wx, wy - 7 * z);
            ctx.lineTo(wx + 0.5 * z, wy - 2 * z);
            ctx.lineTo(wx, wy - 2 * z);
            ctx.closePath();
            ctx.fill();
            // Handle
            ctx.fillStyle = '#3A2A1A';
            ctx.fillRect(wx - 0.8 * z, wy, 1.6 * z, 3 * z);
            // Guard
            ctx.fillStyle = '#555';
            ctx.fillRect(wx - 1.5 * z, wy - 0.5 * z, 3 * z, z);
        }

        // Elder staff
        if (type === 'elder') {
            const sx = x - bodyW / 2 - armW - 2 * z;
            ctx.strokeStyle = '#5A4A3A';
            ctx.lineWidth = 2 * z;
            ctx.beginPath();
            ctx.moveTo(sx, baseY);
            ctx.lineTo(sx, torsoY - 14 * z + bob);
            ctx.stroke();
            // Staff head wrap
            ctx.fillStyle = '#664488';
            ctx.fillRect(sx - 1.5 * z, torsoY - 14 * z + bob, 3 * z, 4 * z);
            // Crystal on top
            ctx.fillStyle = '#9977CC';
            ctx.beginPath();
            ctx.moveTo(sx, torsoY - 18 * z + bob);
            ctx.lineTo(sx + 2 * z, torsoY - 14 * z + bob);
            ctx.lineTo(sx - 2 * z, torsoY - 14 * z + bob);
            ctx.closePath();
            ctx.fill();
            // Glow
            const glow = 0.1 + Math.sin(t * 0.04) * 0.06;
            ctx.fillStyle = this.rgbStr(150, 120, 220, glow);
            ctx.beginPath();
            ctx.arc(sx, torsoY - 16 * z + bob, 5 * z, 0, Math.PI * 2);
            ctx.fill();
        }

        // Merchant pack
        if (type === 'merchant') {
            ctx.fillStyle = '#5A4020';
            const px = x - bodyW / 2 - armW - 2 * z;
            ctx.beginPath();
            ctx.ellipse(px, armY + armH * 0.5 + bob, 4.5 * z, 3.5 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#3A2010';
            ctx.lineWidth = 0.8;
            ctx.stroke();
            // Strap
            ctx.strokeStyle = '#4A3020';
            ctx.lineWidth = 1.5 * z;
            ctx.beginPath();
            ctx.moveTo(px + 3 * z, armY + armH * 0.3 + bob);
            ctx.lineTo(x - bodyW / 2, torsoY + 3 * z + bob);
            ctx.stroke();
        }

        // --- NECK ---
        ctx.fillStyle = p.skin;
        const neckY = torsoY - 1 * z + bob;
        ctx.fillRect(x - 1.5 * z * sc, neckY, 3 * z * sc, 3 * z);

        // --- HEAD ---
        const headR = 5 * z * sc;
        const headY = neckY - headR * 1.3;

        // Head shape
        ctx.fillStyle = p.skin;
        ctx.beginPath();
        ctx.ellipse(x, headY, headR, headR * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hair
        if (!isMutant) {
            ctx.fillStyle = p.hair;
            ctx.beginPath();
            ctx.ellipse(x, headY - 1.5 * z, headR + 0.5 * z, headR * 0.7, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            // Sideburns
            ctx.fillRect(x - headR - 0.3 * z, headY - 2 * z, 1.8 * z, 5 * z);
            ctx.fillRect(x + headR - 1.5 * z, headY - 2 * z, 1.8 * z, 5 * z);
        }

        // Stubble/beard area (gritty)
        if (type === 'player' || type === 'raider' || type === 'guard') {
            ctx.fillStyle = this.rgbStr(0, 0, 0, 0.06);
            ctx.beginPath();
            ctx.ellipse(x, headY + 2 * z, headR * 0.7, headR * 0.5, 0, 0, Math.PI);
            ctx.fill();
        }

        // Eyes
        // Eye whites
        ctx.fillStyle = '#DDD';
        ctx.beginPath();
        ctx.ellipse(x - 2 * z * sc, headY - 0.5 * z, 1.3 * z, 1 * z, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 2 * z * sc, headY - 0.5 * z, 1.3 * z, 1 * z, 0, 0, Math.PI * 2);
        ctx.fill();
        // Irises
        const eyeColor = isMutant ? '#AACC00' : '#443322';
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(x - 1.8 * z * sc, headY - 0.3 * z, 0.7 * z, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 2.2 * z * sc, headY - 0.3 * z, 0.7 * z, 0, Math.PI * 2);
        ctx.fill();
        // Pupils
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(x - 1.8 * z * sc, headY - 0.3 * z, 0.35 * z, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 2.2 * z * sc, headY - 0.3 * z, 0.35 * z, 0, Math.PI * 2);
        ctx.fill();
        // Eyebrows
        ctx.strokeStyle = p.hair;
        ctx.lineWidth = 1 * z;
        ctx.beginPath();
        ctx.moveTo(x - 3 * z * sc, headY - 2 * z);
        ctx.lineTo(x - 0.5 * z * sc, headY - 2.2 * z);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 0.5 * z * sc, headY - 2.2 * z);
        ctx.lineTo(x + 3 * z * sc, headY - 2 * z);
        ctx.stroke();

        // Mouth
        ctx.strokeStyle = this.adjustColor(p.skin, -40);
        ctx.lineWidth = 0.6 * z;
        ctx.beginPath();
        ctx.moveTo(x - 1.5 * z * sc, headY + 2.5 * z);
        ctx.lineTo(x + 1.5 * z * sc, headY + 2.5 * z);
        ctx.stroke();

        // Scars (raiders, mutants)
        if (type === 'raider') {
            ctx.strokeStyle = '#884444';
            ctx.lineWidth = 0.6 * z;
            ctx.beginPath();
            ctx.moveTo(x + z, headY - 2 * z);
            ctx.lineTo(x + 3 * z, headY + 2 * z);
            ctx.stroke();
        }
        if (isMutant) {
            ctx.strokeStyle = '#3A6A00';
            ctx.lineWidth = 0.8 * z;
            ctx.beginPath();
            ctx.moveTo(x - 2 * z, headY - z);
            ctx.lineTo(x - 4 * z, headY + 3 * z);
            ctx.stroke();
        }

        // Head outline
        ctx.strokeStyle = this.adjustColor(p.skin, -30);
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.ellipse(x, headY, headR, headR * 1.1, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ---- FLOATING TEXT ----

    drawFloatingText(gx, gy, text, color = '#fff', offsetY = 0) {
        const screen = this.worldToScreen(gx, gy);
        const ctx = this.ctx;
        const z = this.camera.zoom;

        ctx.font = `bold ${13 * z}px 'Courier New'`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3 * z;
        ctx.strokeText(text, screen.x, screen.y - 30 * z + offsetY);
        ctx.fillStyle = color;
        ctx.fillText(text, screen.x, screen.y - 30 * z + offsetY);
    }

    // ---- TRANSITIONS ----

    drawTransition(gx, gy, label) {
        const screen = this.worldToScreen(gx, gy);
        const ctx = this.ctx;
        const z = this.camera.zoom;
        const pulse = 0.15 + Math.sin(this.time * 0.05) * 0.08;

        this.drawTileHighlight(gx, gy,
            `rgba(80, 120, 200, ${pulse})`,
            'rgba(80, 120, 200, 0.5)'
        );

        const arrowY = screen.y - 10 * z + Math.sin(this.time * 0.07) * 2 * z;
        ctx.fillStyle = '#5588CC';
        ctx.beginPath();
        ctx.moveTo(screen.x, arrowY - 4 * z);
        ctx.lineTo(screen.x + 3 * z, arrowY);
        ctx.lineTo(screen.x - 3 * z, arrowY);
        ctx.closePath();
        ctx.fill();

        ctx.font = `bold ${9 * z}px 'Courier New'`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText(label, screen.x, arrowY - 6 * z);
        ctx.fillStyle = '#88BBFF';
        ctx.fillText(label, screen.x, arrowY - 6 * z);
    }

    // ---- PARTICLES ----

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
                p.life = Math.random() * 300 + 100;
                p.alpha = Math.random() * 0.2 + 0.05;
            }

            const sx = (p.x - camX) * z + cw / 2;
            const sy = (p.y - camY) * z + ch / 2;

            if (sx < -10 || sx > cw + 10 || sy < -10 || sy > ch + 10) continue;

            const fade = Math.min(1, p.life / 50);
            ctx.fillStyle = this.rgbStr(160, 140, 100, p.alpha * fade);
            ctx.fillRect(sx, sy, p.size * z, p.size * z * 0.6);
        }
    }

    // ---- MAIN RENDER ----

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
                renderList.push({ type: 'tile', x, y, depth: x + y, tileType: tile, height: h });
            }
        }

        for (const ent of entities) {
            renderList.push({ type: 'entity', x: ent.x, y: ent.y, depth: ent.x + ent.y + 0.5, entity: ent });
        }

        renderList.sort((a, b) => a.depth - b.depth);

        for (const item of renderList) {
            if (item.type === 'tile') {
                this.drawTile(item.x, item.y, item.tileType, item.height);
            } else {
                const ent = item.entity;
                this.drawEntity(ent.x, ent.y, ent.spriteType || ent.type, ent.facing || 'south',
                    ent === gameState.selectedEntity, ent.stats ? ent.stats.hp : null, ent.stats ? ent.stats.maxHp : null);
            }
        }

        if (area.transitions) {
            for (const t of area.transitions) {
                this.drawTransition(t.x, t.y, t.label || 'Exit');
            }
        }

        if (gameState.highlights) {
            for (const h of gameState.highlights) {
                if (h.type === 'move') {
                    this.drawTileHighlight(h.x, h.y, 'rgba(80, 160, 80, 0.12)', 'rgba(80, 160, 80, 0.25)');
                } else if (h.type === 'attack') {
                    this.drawTileHighlight(h.x, h.y, 'rgba(180, 40, 40, 0.12)', 'rgba(180, 40, 40, 0.3)');
                } else if (h.type === 'path') {
                    this.drawTileHighlight(h.x, h.y, 'rgba(80, 160, 80, 0.25)', 'rgba(80, 160, 80, 0.4)');
                }
            }
        }

        if (gameState.hoverTile) {
            this.drawTileHighlight(gameState.hoverTile.x, gameState.hoverTile.y,
                'rgba(160, 120, 50, 0.12)', 'rgba(160, 120, 50, 0.35)');
        }

        // Particles
        this.drawParticles(this.ctx);

        // Cave darkness
        if (area.id === 'cave') {
            // Vignette effect
            const grad = this.ctx.createRadialGradient(
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.height * 0.2,
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.height * 0.7
            );
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, 'rgba(0,0,0,0.4)');
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Floating texts
        if (gameState.floatingTexts) {
            for (const ft of gameState.floatingTexts) {
                this.drawFloatingText(ft.x, ft.y, ft.text, ft.color, ft.offsetY);
            }
        }

        // Film grain overlay (subtle)
        if (this.time % 3 === 0) {
            this.ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.02})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
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
        ctx.fillStyle = '#12090A';
        ctx.fillRect(0, 0, 400, 300);

        // Terrain texture
        for (let i = 0; i < 120; i++) {
            const x = (i * 37 + i * i * 3) % 400;
            const y = (i * 53 + i * 7) % 300;
            ctx.fillStyle = `rgba(40, 30, 15, ${0.3 + (i % 5) * 0.1})`;
            ctx.fillRect(x, y, 1 + (i % 2), 1);
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
                        ctx.strokeStyle = '#3A2A10';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([3, 5]);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                }
            }

            if (isCurrent) {
                ctx.fillStyle = 'rgba(160, 120, 50, 0.1)';
                ctx.beginPath();
                ctx.arc(loc.mapX, loc.mapY, 14, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(loc.mapX, loc.mapY, isCurrent ? 7 : 4, 0, Math.PI * 2);
            ctx.fillStyle = isCurrent ? '#AA8030' : (loc.discovered ? '#5A4A2A' : '#2A1A0A');
            ctx.fill();
            ctx.strokeStyle = isCurrent ? '#CCAA60' : '#3A2A10';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            if (loc.discovered || isCurrent) {
                ctx.font = '9px Courier New';
                ctx.textAlign = 'center';
                ctx.fillStyle = isCurrent ? '#AA8030' : '#5A4A2A';
                ctx.fillText(loc.name, loc.mapX, loc.mapY + 16);
            }
        }
    }
}
