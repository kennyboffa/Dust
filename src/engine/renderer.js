// ============================================
// Dustwalker - Isometric Renderer (Fallout 2 Style)
// Pre-rendered sprite system with offscreen canvas generation,
// per-pixel shading, detailed textures, and atmospheric lighting
// ============================================

// ---- SPRITE GENERATOR (Pre-renders detailed sprites to offscreen canvases) ----
class SpriteGenerator {
    static createCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        return c;
    }

    // Seeded random for deterministic sprite generation
    static seededRandom(seed) {
        let s = seed;
        return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
    }

    // Create a horizontally mirrored copy of a canvas
    static mirrorSprite(canvas) {
        const c = this.createCanvas(canvas.width, canvas.height);
        const ctx = c.getContext('2d');
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(canvas, 0, 0);
        return c;
    }

    // ---- POST-PROCESS: add noise, edge darkening, wear for pre-rendered look ----
    static weatherSprite(canvas, intensity = 1.0) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const rng = this.seededRandom(w * h + 42);

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue; // skip transparent pixels

            const px = (i / 4) % w;
            const py = Math.floor((i / 4) / w);

            // Film grain noise
            const noise = (rng() - 0.5) * 12 * intensity;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
            data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));

            // Desaturate slightly for gritty look
            const gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
            const desat = 0.15 * intensity;
            data[i] = data[i] + (gray - data[i]) * desat;
            data[i+1] = data[i+1] + (gray - data[i+1]) * desat;
            data[i+2] = data[i+2] + (gray - data[i+2]) * desat;

            // Warm tint (Fallout 2 sepia)
            data[i] = Math.min(255, data[i] + 3 * intensity);
            data[i+2] = Math.max(0, data[i+2] - 2 * intensity);

            // Edge darkening: darken pixels near transparent edges
            let nearEdge = false;
            for (let dx = -1; dx <= 1 && !nearEdge; dx++) {
                for (let dy = -1; dy <= 1 && !nearEdge; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = px + dx, ny = py + dy;
                    if (nx < 0 || nx >= w || ny < 0 || ny >= h) { nearEdge = true; break; }
                    const ni = (ny * w + nx) * 4;
                    if (data[ni + 3] < 128) nearEdge = true;
                }
            }
            if (nearEdge) {
                const darken = 0.7;
                data[i] *= darken;
                data[i+1] *= darken;
                data[i+2] *= darken;
            }

            // Occasional dirt speckle
            if (rng() > 0.97) {
                const dirtAmt = rng() * 20 * intensity;
                data[i] = Math.max(0, data[i] - dirtAmt);
                data[i+1] = Math.max(0, data[i+1] - dirtAmt);
                data[i+2] = Math.max(0, data[i+2] - dirtAmt);
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    // ---- TILE SPRITE GENERATION ----
    static generateTileSprite(type, tw, th, seed) {
        const w = tw + 4, h = th + 20; // extra padding for height/debris
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');
        const rng = this.seededRandom(seed);
        const cx = w / 2, cy = th / 2 + 2;
        const htw = tw / 2, hth = th / 2;

        // Draw iso diamond fill
        const drawDiamond = (color) => {
            ctx.beginPath();
            ctx.moveTo(cx, cy - hth);
            ctx.lineTo(cx + htw, cy);
            ctx.lineTo(cx, cy + hth);
            ctx.lineTo(cx - htw, cy);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        };

        const palettes = {
            'dirt':       { base: [75,60,38], var: 12 },
            'sand':       { base: [115,100,68], var: 15 },
            'grass':      { base: [48,65,28], var: 14 },
            'stone':      { base: [72,68,62], var: 8 },
            'wood':       { base: [60,45,20], var: 10 },
            'road':       { base: [58,56,48], var: 8 },
            'cave_floor': { base: [35,28,25], var: 6 },
            'cave_wall':  { base: [48,40,38], var: 8 },
            'cave_rock':  { base: [52,48,42], var: 8 },
            'wall':       { base: [85,78,58], var: 10 },
            'wall_top':   { base: [95,88,68], var: 10 },
            'door':       { base: [56,38,12], var: 8 },
            'water':      { base: [18,32,52], var: 5 },
            'lava':       { base: [120,35,5], var: 20 },
            'crystal':    { base: [45,88,100], var: 12 },
            'void':       { base: [3,3,3], var: 0 },
        };
        const pal = palettes[type] || palettes['dirt'];

        // Base fill with slight variation
        const bv = (rng() - 0.5) * pal.var;
        const baseR = pal.base[0] + bv, baseG = pal.base[1] + bv, baseB = pal.base[2] + bv;
        drawDiamond(`rgb(${baseR|0},${baseG|0},${baseB|0})`);

        // Clip to diamond for texture work
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy - hth);
        ctx.lineTo(cx + htw, cy);
        ctx.lineTo(cx, cy + hth);
        ctx.lineTo(cx - htw, cy);
        ctx.closePath();
        ctx.clip();

        // Per-pixel noise dithering (pre-rendered look)
        for (let i = 0; i < 60; i++) {
            const px = cx + (rng() - 0.5) * tw * 0.9;
            const py = cy + (rng() - 0.5) * th * 0.9;
            const bright = rng() > 0.5;
            const a = 0.03 + rng() * 0.06;
            ctx.fillStyle = bright ? `rgba(200,180,140,${a})` : `rgba(0,0,0,${a + 0.02})`;
            const sz = 0.5 + rng() * 1.5;
            ctx.fillRect(px, py, sz, sz);
        }

        // Type-specific textures
        if (type === 'dirt') {
            // Crack network
            ctx.strokeStyle = `rgba(30,22,10,${0.15 + rng() * 0.15})`;
            ctx.lineWidth = 0.7;
            const crackCount = 1 + Math.floor(rng() * 3);
            for (let c = 0; c < crackCount; c++) {
                ctx.beginPath();
                let px = cx + (rng() - 0.5) * tw * 0.6;
                let py = cy + (rng() - 0.5) * th * 0.6;
                ctx.moveTo(px, py);
                const segs = 2 + Math.floor(rng() * 3);
                for (let s = 0; s < segs; s++) {
                    px += (rng() - 0.5) * 12;
                    py += (rng() - 0.5) * 8;
                    ctx.lineTo(px, py);
                }
                ctx.stroke();
            }
            // Pebbles
            for (let i = 0; i < 5; i++) {
                ctx.fillStyle = `rgba(${50+rng()*30|0},${40+rng()*20|0},${20+rng()*15|0},${0.2+rng()*0.15})`;
                ctx.beginPath();
                ctx.ellipse(cx+(rng()-0.5)*tw*0.7, cy+(rng()-0.5)*th*0.7, 0.8+rng()*1.5, 0.5+rng(), rng()*3, 0, Math.PI*2);
                ctx.fill();
            }
        }
        if (type === 'sand') {
            // Wind ripples
            ctx.strokeStyle = `rgba(85,72,45,${0.06+rng()*0.06})`;
            ctx.lineWidth = 0.5;
            for (let i = 0; i < 6; i++) {
                const ly = cy + (i - 3) * 2.5 + rng() * 2;
                ctx.beginPath();
                ctx.moveTo(cx - htw * 0.7, ly);
                ctx.quadraticCurveTo(cx + (rng()-0.5)*5, ly - 1 + rng(), cx + htw * 0.7, ly + rng() * 2 - 1);
                ctx.stroke();
            }
            // Scattered pebbles
            for (let i = 0; i < 6; i++) {
                ctx.fillStyle = `rgba(${55+rng()*25|0},${48+rng()*20|0},${30+rng()*15|0},${0.15+rng()*0.15})`;
                ctx.beginPath();
                ctx.ellipse(cx+(rng()-0.5)*tw*0.7, cy+(rng()-0.5)*th*0.7, 0.6+rng()*1.5, 0.4+rng()*0.6, rng()*3, 0, Math.PI*2);
                ctx.fill();
            }
        }
        if (type === 'grass') {
            // Dirt patches
            ctx.fillStyle = `rgba(55,42,25,${0.2+rng()*0.15})`;
            ctx.beginPath();
            ctx.ellipse(cx+(rng()-0.5)*10, cy+(rng()-0.5)*6, 5+rng()*4, 2+rng()*2, rng()*3, 0, Math.PI*2);
            ctx.fill();
            // Grass blades (mostly dead/brown)
            for (let i = 0; i < 8; i++) {
                const alive = rng() > 0.7;
                const bx = cx + (rng() - 0.5) * tw * 0.8;
                const by = cy + (rng() - 0.5) * th * 0.8;
                const h = 2 + rng() * 4;
                ctx.strokeStyle = alive
                    ? `rgba(${35+rng()*20|0},${50+rng()*18|0},${15+rng()*10|0},0.45)`
                    : `rgba(${65+rng()*15|0},${50+rng()*12|0},${25+rng()*10|0},0.4)`;
                ctx.lineWidth = 0.6;
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + (rng()-0.5)*2, by - h);
                ctx.stroke();
            }
            // Small rocks
            for (let i = 0; i < 3; i++) {
                ctx.fillStyle = `rgba(50,45,35,0.25)`;
                ctx.beginPath();
                ctx.ellipse(cx+(rng()-0.5)*tw*0.5, cy+(rng()-0.5)*th*0.5, 1+rng(), 0.6+rng()*0.4, 0, 0, Math.PI*2);
                ctx.fill();
            }
        }
        if (type === 'road') {
            // Asphalt cracks
            ctx.strokeStyle = `rgba(20,18,12,${0.18+rng()*0.14})`;
            ctx.lineWidth = 0.8;
            if (rng() > 0.3) {
                ctx.beginPath();
                let px = cx - htw * 0.5;
                let py = cy + (rng()-0.5)*4;
                ctx.moveTo(px, py);
                for (let s = 0; s < 4; s++) {
                    px += 4 + rng() * 6; py += (rng()-0.5) * 4;
                    ctx.lineTo(px, py);
                }
                ctx.stroke();
            }
            // Pothole
            if (rng() > 0.65) {
                ctx.fillStyle = `rgba(18,16,10,0.15)`;
                ctx.beginPath();
                ctx.ellipse(cx+(rng()-0.5)*8, cy+(rng()-0.5)*4, 2+rng()*2, 1+rng(), 0, 0, Math.PI*2);
                ctx.fill();
            }
            // Faded center line
            if (rng() > 0.5) {
                ctx.fillStyle = `rgba(120,100,40,0.04)`;
                ctx.fillRect(cx - 1.5, cy - 0.5, 3, 1);
            }
        }
        if (type === 'wood') {
            // Wood grain lines
            ctx.strokeStyle = `rgba(25,18,4,${0.18+rng()*0.12})`;
            ctx.lineWidth = 0.5;
            for (let i = 0; i < 6; i++) {
                const ly = cy + (i - 3) * 2;
                ctx.beginPath();
                ctx.moveTo(cx - htw * 0.6, ly + rng());
                ctx.lineTo(cx + htw * 0.6, ly - rng());
                ctx.stroke();
            }
            // Wood knot
            if (rng() > 0.6) {
                ctx.fillStyle = `rgba(22,14,3,0.25)`;
                ctx.beginPath();
                ctx.arc(cx + (rng()-0.5)*8, cy + (rng()-0.5)*4, 1.2+rng(), 0, Math.PI*2);
                ctx.fill();
            }
            // Splinter/damage
            if (rng() > 0.7) {
                ctx.fillStyle = `rgba(45,32,12,0.2)`;
                ctx.fillRect(cx + (rng()-0.5)*10, cy + (rng()-0.5)*5, 2+rng()*3, 1);
            }
        }
        if (type === 'water') {
            // Dark murky water with scum
            ctx.fillStyle = `rgba(20,40,55,0.08)`;
            ctx.beginPath();
            ctx.ellipse(cx, cy, htw*0.7, hth*0.6, 0, 0, Math.PI*2);
            ctx.fill();
            // Oil/scum
            ctx.fillStyle = `rgba(40,55,30,0.05)`;
            ctx.beginPath();
            ctx.ellipse(cx-3, cy+1, 5, 2, 0, 0, Math.PI*2);
            ctx.fill();
        }
        if (type === 'cave_floor') {
            for (let i = 0; i < 6; i++) {
                ctx.fillStyle = `rgba(${38+rng()*15|0},${30+rng()*12|0},${24+rng()*10|0},${0.18+rng()*0.12})`;
                ctx.beginPath();
                ctx.ellipse(cx+(rng()-0.5)*tw*0.7, cy+(rng()-0.5)*th*0.7, 0.8+rng()*1.2, 0.4+rng()*0.6, rng()*3, 0, Math.PI*2);
                ctx.fill();
            }
            // Puddle
            if (rng() > 0.6) {
                ctx.fillStyle = `rgba(16,18,24,0.1)`;
                ctx.beginPath();
                ctx.ellipse(cx+(rng()-0.5)*6, cy, 4+rng()*3, 1.5+rng(), 0, 0, Math.PI*2);
                ctx.fill();
            }
        }
        if (type === 'crystal') {
            // Crystal shards
            ctx.fillStyle = `rgba(40,100,120,0.2)`;
            ctx.beginPath();
            ctx.moveTo(cx-2, cy+2); ctx.lineTo(cx, cy-6); ctx.lineTo(cx+2, cy+2);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = `rgba(50,110,130,0.15)`;
            ctx.beginPath();
            ctx.moveTo(cx+1, cy+1); ctx.lineTo(cx+3, cy-4); ctx.lineTo(cx+4, cy+1);
            ctx.closePath(); ctx.fill();
        }

        // Edge outline
        ctx.restore();
        ctx.beginPath();
        ctx.moveTo(cx, cy - hth);
        ctx.lineTo(cx + htw, cy);
        ctx.lineTo(cx, cy + hth);
        ctx.lineTo(cx - htw, cy);
        ctx.closePath();
        ctx.strokeStyle = `rgba(${Math.max(0,baseR-30)|0},${Math.max(0,baseG-30)|0},${Math.max(0,baseB-30)|0},0.6)`;
        ctx.lineWidth = 0.7;
        ctx.stroke();

        return c;
    }

    // ---- HUMANOID SPRITE GENERATION (64x80 sprite with proper proportions) ----
    static generateHumanoidSprite(type, frame, facing = 'south') {
        const w = 64, h = 80;
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');
        const cx = w / 2, baseY = h - 4;
        const rng = this.seededRandom(type.length * 1000 + frame * 100 + (facing === 'north' ? 7 : 0));

        // Palette lookup
        const palettes = {
            'player':  { skin:[130,108,74], shirt:[90,68,28], pants:[50,38,20], boots:[28,18,8], hair:[36,24,14], belt:[38,28,10], accent:[115,95,42], armor: true },
            'villager':{ skin:[120,100,78], shirt:[66,74,82], pants:[40,40,40], boots:[22,22,22], hair:[58,48,38], belt:[34,34,34], accent:[54,58,66], armor: false },
            'merchant':{ skin:[120,100,78], shirt:[88,66,30], pants:[40,32,22], boots:[28,18,8], hair:[50,38,24], belt:[44,34,22], accent:[115,92,52], armor: false },
            'elder':   { skin:[120,100,78], shirt:[62,40,78], pants:[28,22,40], boots:[18,12,22], hair:[140,140,140], belt:[36,28,50], accent:[80,56,110], armor: false },
            'guard':   { skin:[120,100,78], shirt:[50,66,28], pants:[30,40,18], boots:[18,18,8], hair:[36,24,14], belt:[40,40,22], accent:[60,72,38], armor: true },
            'raider':  { skin:[115,94,72], shirt:[62,16,14], pants:[28,12,12], boots:[18,8,8], hair:[22,22,22], belt:[48,22,22], accent:[78,22,22], armor: true },
            'mutant':  { skin:[54,90,18], shirt:[36,56,10], pants:[26,38,6], boots:[18,28,2], hair:[50,78,12], belt:[36,46,12], accent:[58,108,20], armor: false },
        };
        const p = palettes[type] || palettes['villager'];
        const isMutant = type === 'mutant';
        const sc = isMutant ? 1.35 : 1;

        const rgb = (arr, adj) => `rgb(${Math.max(0,Math.min(255,arr[0]+(adj||0)))|0},${Math.max(0,Math.min(255,arr[1]+(adj||0)))|0},${Math.max(0,Math.min(255,arr[2]+(adj||0)))|0})`;
        const rgba = (arr, a, adj) => `rgba(${Math.max(0,Math.min(255,arr[0]+(adj||0)))|0},${Math.max(0,Math.min(255,arr[1]+(adj||0)))|0},${Math.max(0,Math.min(255,arr[2]+(adj||0)))|0},${a})`;

        const bob = 0;

        // ---- LEGS ----
        const legW = 4 * sc, legH = 10 * sc;
        const legY = baseY - legH;
        // Left leg
        ctx.fillStyle = rgb(p.pants);
        ctx.fillRect(cx - 5 * sc, legY, legW, legH);
        // Right leg
        ctx.fillRect(cx + 1 * sc, legY, legW, legH);
        // Knee wear patches
        ctx.fillStyle = rgb(p.pants, 12);
        ctx.fillRect(cx - 5 * sc, legY + legH * 0.4, legW, 3);
        ctx.fillRect(cx + 1 * sc, legY + legH * 0.4, legW, 3);
        // Knee shadow
        ctx.fillStyle = rgba(p.pants, 0.3, -20);
        ctx.fillRect(cx - 5 * sc, legY + legH * 0.55, legW, 2);
        ctx.fillRect(cx + 1 * sc, legY + legH * 0.55, legW, 2);

        // ---- BOOTS (heavier, more detailed) ----
        const bootH = 5 * sc;
        ctx.fillStyle = rgb(p.boots);
        ctx.fillRect(cx - 5.5 * sc, baseY - bootH, legW + 2.5 * sc, bootH);
        ctx.fillRect(cx + 0.5 * sc, baseY - bootH, legW + 2.5 * sc, bootH);
        // Boot soles
        ctx.fillStyle = '#0A0A0A';
        ctx.fillRect(cx - 5.5 * sc, baseY - 1.5, legW + 2.5 * sc, 1.5);
        ctx.fillRect(cx + 0.5 * sc, baseY - 1.5, legW + 2.5 * sc, 1.5);
        // Boot laces/straps
        ctx.strokeStyle = rgb(p.boots, -15);
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) {
            const ly = baseY - bootH + 1 + i * 1.3;
            ctx.beginPath();
            ctx.moveTo(cx - 5 * sc, ly); ctx.lineTo(cx - 2 * sc, ly);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 1.5 * sc, ly); ctx.lineTo(cx + 4.5 * sc, ly);
            ctx.stroke();
        }
        // Boot highlight
        ctx.fillStyle = rgba(p.boots, 0.12, 25);
        ctx.fillRect(cx - 5 * sc, baseY - bootH, 1.5, bootH - 1);

        // ---- TORSO (broader, more muscular) ----
        const bodyW = 14 * sc, bodyH = 16 * sc;
        const torsoY = legY - bodyH + 4 + bob;
        ctx.fillStyle = rgb(p.shirt);
        ctx.fillRect(cx - bodyW / 2, torsoY, bodyW, bodyH);
        // Shirt shading (left side lit, right darker)
        ctx.fillStyle = rgba(p.shirt, 0.15, 20);
        ctx.fillRect(cx - bodyW / 2, torsoY, bodyW * 0.35, bodyH);
        ctx.fillStyle = rgba(p.shirt, 0.12, -15);
        ctx.fillRect(cx + bodyW * 0.15, torsoY, bodyW * 0.35, bodyH);
        // Center seam
        ctx.strokeStyle = rgb(p.shirt, -18);
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, torsoY + 3);
        ctx.lineTo(cx, torsoY + bodyH);
        ctx.stroke();
        // Collar
        ctx.fillStyle = rgb(p.shirt, 18);
        ctx.fillRect(cx - 4 * sc, torsoY, 8 * sc, 3);
        // Collar shadow
        ctx.fillStyle = rgba(p.shirt, 0.2, -20);
        ctx.fillRect(cx - 4 * sc, torsoY + 3, 8 * sc, 1.5);
        // Pockets
        if (!isMutant) {
            ctx.strokeStyle = rgb(p.shirt, -12);
            ctx.lineWidth = 0.5;
            ctx.strokeRect(cx - bodyW/2 + 2, torsoY + 7 * sc, 4 * sc, 4 * sc);
            ctx.strokeRect(cx + bodyW/2 - 6 * sc, torsoY + 7 * sc, 4 * sc, 4 * sc);
            // Pocket flap
            ctx.fillStyle = rgb(p.shirt, -8);
            ctx.fillRect(cx - bodyW/2 + 2, torsoY + 7 * sc, 4 * sc, 1.5);
            ctx.fillRect(cx + bodyW/2 - 6 * sc, torsoY + 7 * sc, 4 * sc, 1.5);
        }

        // ---- ARMOR/VEST (for player, guard, raider) ----
        if (p.armor) {
            const vestColor = type === 'raider' ? [40,22,18] : type === 'guard' ? [55,50,35] : [65,55,30];
            ctx.fillStyle = rgba(vestColor, 0.65);
            ctx.fillRect(cx - bodyW / 2 + 1, torsoY + 4, bodyW - 2, bodyH - 6);
            // Vest straps/padding
            ctx.fillStyle = rgba(vestColor, 0.3, -15);
            ctx.fillRect(cx - bodyW / 2 + 1, torsoY + 4, 3, bodyH - 6);
            ctx.fillRect(cx + bodyW / 2 - 4, torsoY + 4, 3, bodyH - 6);
            // Buckles
            ctx.fillStyle = 'rgba(80,75,60,0.4)';
            ctx.fillRect(cx - 1.5, torsoY + 6, 3, 2);
            ctx.fillRect(cx - 1.5, torsoY + 11, 3, 2);
        }

        // ---- BELT (wider, with pouches) ----
        ctx.fillStyle = rgb(p.belt);
        ctx.fillRect(cx - bodyW / 2, torsoY + bodyH - 3 + bob, bodyW, 4);
        // Belt buckle
        ctx.fillStyle = rgb(p.accent);
        ctx.fillRect(cx - 2, torsoY + bodyH - 3 + bob, 4, 4);
        // Belt pouches
        if (type === 'player' || type === 'guard' || type === 'raider') {
            ctx.fillStyle = rgb(p.belt, -10);
            ctx.fillRect(cx - bodyW / 2 + 1, torsoY + bodyH - 2 + bob, 3, 3.5);
            ctx.fillRect(cx + bodyW / 2 - 4, torsoY + bodyH - 2 + bob, 3, 3.5);
        }

        // ---- ARMS (with rolled sleeves, better shading) ----
        const armW = 4 * sc, armH = 13 * sc;
        const armY = torsoY + 3 + bob;
        // Left arm
        ctx.fillStyle = rgb(p.shirt);
        ctx.fillRect(cx - bodyW / 2 - armW, armY, armW, armH);
        ctx.fillStyle = rgba(p.shirt, 0.15, 15); // light side
        ctx.fillRect(cx - bodyW / 2 - armW, armY, 1.5, armH);
        // Right arm
        ctx.fillStyle = rgb(p.shirt);
        ctx.fillRect(cx + bodyW / 2, armY, armW, armH);
        ctx.fillStyle = rgba(p.shirt, 0.12, -12); // shadow side
        ctx.fillRect(cx + bodyW / 2 + armW - 1.5, armY, 1.5, armH);
        // Rolled sleeves
        ctx.fillStyle = rgb(p.shirt, 12);
        ctx.fillRect(cx - bodyW / 2 - armW, armY, armW, 3);
        ctx.fillRect(cx + bodyW / 2, armY, armW, 3);
        // Hands (skin)
        const handH = 3 * sc;
        ctx.fillStyle = rgb(p.skin);
        ctx.fillRect(cx - bodyW / 2 - armW, armY + armH, armW, handH);
        ctx.fillRect(cx + bodyW / 2, armY + armH, armW, handH);
        // Hand shading
        ctx.fillStyle = rgba(p.skin, 0.2, -18);
        ctx.fillRect(cx - bodyW / 2 - armW + armW - 1, armY + armH, 1, handH);
        ctx.fillRect(cx + bodyW / 2 + armW - 1, armY + armH, 1, handH);

        // ---- WEAPON ----
        if (type === 'player' || type === 'raider' || type === 'guard') {
            const wx = cx + bodyW / 2 + armW / 2;
            const wy = armY + armH + handH;
            if (type === 'player' || type === 'guard') {
                // Combat knife (detailed)
                // Blade
                ctx.fillStyle = '#6A6A6A';
                ctx.beginPath();
                ctx.moveTo(wx - 0.6, wy);
                ctx.lineTo(wx + 0.3, wy - 10);
                ctx.lineTo(wx + 1.2, wy);
                ctx.closePath();
                ctx.fill();
                // Blade edge highlight
                ctx.fillStyle = '#888';
                ctx.beginPath();
                ctx.moveTo(wx + 0.3, wy - 9);
                ctx.lineTo(wx + 0.8, wy - 3);
                ctx.lineTo(wx + 0.3, wy - 3);
                ctx.closePath();
                ctx.fill();
                // Blood on blade (player only)
                if (type === 'player' && rng() > 0.5) {
                    ctx.fillStyle = 'rgba(80,15,10,0.2)';
                    ctx.fillRect(wx - 0.2, wy - 6, 0.8, 3);
                }
                // Guard
                ctx.fillStyle = '#444';
                ctx.fillRect(wx - 2, wy - 0.5, 4, 1.2);
                // Grip (wrapped leather)
                ctx.fillStyle = '#2A1C0C';
                ctx.fillRect(wx - 0.8, wy + 0.5, 1.6, 4);
                for (let i = 0; i < 3; i++) {
                    ctx.fillStyle = '#3A2C1C';
                    ctx.fillRect(wx - 0.8, wy + 1 + i * 1.2, 1.6, 0.5);
                }
            } else {
                // Raider pipe weapon (crude)
                ctx.fillStyle = '#444';
                ctx.fillRect(wx - 0.8, wy - 12, 1.6, 12);
                ctx.fillStyle = '#333';
                ctx.fillRect(wx - 1.5, wy - 12, 3, 2);
                // Rust
                ctx.fillStyle = 'rgba(90,40,15,0.25)';
                ctx.fillRect(wx - 0.6, wy - 8, 1.2, 4);
                // Tape wrapping
                ctx.fillStyle = '#555';
                ctx.fillRect(wx - 1, wy, 2, 4);
            }
        }

        // Elder staff
        if (type === 'elder') {
            const sx = cx - bodyW / 2 - armW - 3;
            ctx.strokeStyle = '#4A3A28';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(sx, baseY - 2);
            ctx.lineTo(sx, torsoY - 18 + bob);
            ctx.stroke();
            // Staff head
            ctx.fillStyle = '#503870';
            ctx.fillRect(sx - 2, torsoY - 18 + bob, 4, 5);
            // Crystal
            ctx.fillStyle = '#7755AA';
            ctx.beginPath();
            ctx.moveTo(sx, torsoY - 22 + bob);
            ctx.lineTo(sx + 2.5, torsoY - 18 + bob);
            ctx.lineTo(sx - 2.5, torsoY - 18 + bob);
            ctx.closePath();
            ctx.fill();
        }

        // Merchant pack
        if (type === 'merchant') {
            const px = cx - bodyW / 2 - armW - 3;
            ctx.fillStyle = '#3A2814';
            ctx.beginPath();
            ctx.ellipse(px, armY + armH * 0.4 + bob, 5.5, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#2A1808';
            ctx.lineWidth = 0.8;
            ctx.stroke();
            // Pack straps
            ctx.strokeStyle = '#382818';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(px + 3, armY + armH * 0.2 + bob);
            ctx.lineTo(cx - bodyW / 2, torsoY + 4 + bob);
            ctx.stroke();
            // Items poking out
            ctx.fillStyle = '#555';
            ctx.fillRect(px - 1, armY + armH * 0.2 + bob - 3, 1.5, 3);
        }

        // ---- NECK ----
        ctx.fillStyle = rgb(p.skin);
        ctx.fillRect(cx - 2 * sc, torsoY - 2 + bob, 4 * sc, 4);
        // Neck shadow
        ctx.fillStyle = rgba(p.skin, 0.2, -20);
        ctx.fillRect(cx - 2 * sc, torsoY - 2 + bob + 2, 4 * sc, 2);

        // ---- HEAD (more detailed, better proportions) ----
        const headR = 6 * sc;
        const headY = torsoY - 2 - headR * 1.2 + bob;

        // Head shape
        ctx.fillStyle = rgb(p.skin);
        ctx.beginPath();
        ctx.ellipse(cx, headY, headR, headR * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        if (facing === 'north') {
            // ---- BACK OF HEAD ----
            // Full hair coverage
            if (!isMutant) {
                ctx.fillStyle = rgb(p.hair);
                ctx.beginPath();
                ctx.ellipse(cx, headY, headR + 0.5, headR * 1.05, 0, 0, Math.PI * 2);
                ctx.fill();
                // Hair texture lines
                ctx.strokeStyle = rgb(p.hair, -12);
                ctx.lineWidth = 0.4;
                for (let i = 0; i < 5; i++) {
                    const hx = cx - headR * 0.5 + i * headR * 0.25;
                    ctx.beginPath();
                    ctx.moveTo(hx, headY - headR * 0.8);
                    ctx.quadraticCurveTo(hx + (rng()-0.5)*2, headY, hx + (rng()-0.5)*3, headY + headR * 0.7);
                    ctx.stroke();
                }
                // Hair highlight
                ctx.fillStyle = rgba(p.hair, 0.1, 15);
                ctx.beginPath();
                ctx.ellipse(cx, headY - 2, headR * 0.5, headR * 0.4, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Mutant back of head - lumpy
                ctx.fillStyle = rgba(p.skin, 1, -10);
                ctx.beginPath();
                ctx.ellipse(cx, headY, headR, headR * 1.1, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(40,60,10,0.2)';
                ctx.beginPath();
                ctx.arc(cx + 3, headY - 2, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            // Neck visible from behind
            ctx.fillStyle = rgb(p.skin, -8);
            ctx.fillRect(cx - 2 * sc, headY + headR * 0.8, 4 * sc, 3);
            // Ear hints (sides)
            ctx.fillStyle = rgb(p.skin, -5);
            ctx.beginPath();
            ctx.ellipse(cx - headR - 0.5, headY, 1.5, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + headR + 0.5, headY, 1.5, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // ---- FRONT-FACING HEAD ----
            // Facial shadow (right side)
            ctx.fillStyle = rgba(p.skin, 0.15, -22);
            ctx.beginPath();
            ctx.ellipse(cx + 1.5, headY + 0.5, headR * 0.6, headR * 0.9, 0.2, 0, Math.PI * 2);
            ctx.fill();

            // Hair
            if (!isMutant) {
                ctx.fillStyle = rgb(p.hair);
                ctx.beginPath();
                ctx.ellipse(cx, headY - 2, headR + 0.8, headR * 0.65, 0, Math.PI, Math.PI * 2);
                ctx.fill();
                // Sideburns
                ctx.fillRect(cx - headR - 0.5, headY - 2.5, 2, 6);
                ctx.fillRect(cx + headR - 1.5, headY - 2.5, 2, 6);
                // Hair highlight
                ctx.fillStyle = rgba(p.hair, 0.12, 20);
                ctx.beginPath();
                ctx.ellipse(cx - 1, headY - 2.5, headR * 0.5, headR * 0.3, -0.3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Stubble/5 o'clock shadow
            if (type === 'player' || type === 'raider' || type === 'guard') {
                ctx.fillStyle = 'rgba(0,0,0,0.06)';
                ctx.beginPath();
                ctx.ellipse(cx, headY + 2.5, headR * 0.65, headR * 0.45, 0, 0, Math.PI);
                ctx.fill();
            }

            // Eyes
            ctx.fillStyle = '#CCC';
            ctx.beginPath();
            ctx.ellipse(cx - 2.5 * sc, headY - 0.5, 1.6, 1.1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 2.5 * sc, headY - 0.5, 1.6, 1.1, 0, 0, Math.PI * 2);
            ctx.fill();
            // Irises
            const eyeColor = isMutant ? '#8AA800' : '#332818';
            ctx.fillStyle = eyeColor;
            ctx.beginPath();
            ctx.arc(cx - 2.2 * sc, headY - 0.3, 0.85, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + 2.8 * sc, headY - 0.3, 0.85, 0, Math.PI * 2);
            ctx.fill();
            // Pupils
            ctx.fillStyle = '#0A0A0A';
            ctx.beginPath();
            ctx.arc(cx - 2.2 * sc, headY - 0.3, 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + 2.8 * sc, headY - 0.3, 0.4, 0, Math.PI * 2);
            ctx.fill();
            // Eye highlight
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.beginPath();
            ctx.arc(cx - 2.5 * sc, headY - 0.7, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + 2.5 * sc, headY - 0.7, 0.3, 0, Math.PI * 2);
            ctx.fill();

            // Eyebrows
            ctx.strokeStyle = rgb(p.hair);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(cx - 3.5 * sc, headY - 2.5);
            ctx.lineTo(cx - 0.5 * sc, headY - 2.8);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 0.5 * sc, headY - 2.8);
            ctx.lineTo(cx + 3.5 * sc, headY - 2.5);
            ctx.stroke();

            // Nose
            ctx.fillStyle = rgba(p.skin, 0.5, -15);
            ctx.beginPath();
            ctx.moveTo(cx, headY - 0.5);
            ctx.lineTo(cx - 1, headY + 1.5);
            ctx.lineTo(cx + 1, headY + 1.5);
            ctx.closePath();
            ctx.fill();

            // Mouth
            ctx.strokeStyle = rgba(p.skin, 0.8, -35);
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(cx - 1.8 * sc, headY + 3);
            ctx.lineTo(cx + 1.8 * sc, headY + 3);
            ctx.stroke();

            // Scars
            if (type === 'raider') {
                ctx.strokeStyle = 'rgba(100,35,30,0.5)';
                ctx.lineWidth = 0.7;
                ctx.beginPath();
                ctx.moveTo(cx + 1, headY - 2.5);
                ctx.lineTo(cx + 3.5, headY + 2.5);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(cx - 3, headY + 1);
                ctx.lineTo(cx - 1, headY + 4);
                ctx.stroke();
            }
            if (isMutant) {
                ctx.strokeStyle = 'rgba(30,60,0,0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx - 2.5, headY - 1);
                ctx.lineTo(cx - 5, headY + 4);
                ctx.stroke();
                ctx.fillStyle = 'rgba(60,80,20,0.35)';
                ctx.beginPath();
                ctx.arc(cx + 4, headY + 1, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Head outline (subtle)
        ctx.strokeStyle = rgba(p.skin, 0.4, -30);
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.ellipse(cx, headY, headR, headR * 1.1, 0, 0, Math.PI * 2);
        ctx.stroke();

        // ---- RAIDER MOHAWK/HEADGEAR ----
        if (type === 'raider') {
            ctx.fillStyle = '#1A1A1A';
            ctx.fillRect(cx - 1, headY - headR * 1.1 - 3, 2, 5);
            ctx.fillRect(cx - 0.5, headY - headR * 1.1 - 5, 1, 3);
        }

        // ---- GUARD HELMET ----
        if (type === 'guard') {
            ctx.fillStyle = '#3A3828';
            ctx.beginPath();
            ctx.ellipse(cx, headY - 1, headR + 1.5, headR * 0.7, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(cx - headR - 1.5, headY - 1, headR * 2 + 3, 2);
            ctx.fillStyle = '#2A2818';
            ctx.fillRect(cx - headR - 1.5, headY, headR * 2 + 3, 1);
        }

        return this.weatherSprite(c, 0.8);
    }

    // ---- CREATURE SPRITE GENERATION ----
    static generateCreatureSprite(type, frame) {
        const w = 64, h = 64;
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');
        const cx = w / 2, cy = h - 10;
        const rng = this.seededRandom(type.length * 500 + frame * 50);
        const bob = 0;

        if (type === 'rat') {
            // Giant mutant rat - detailed pre-rendered style
            // Body
            ctx.fillStyle = '#3A2C1C';
            ctx.beginPath();
            ctx.ellipse(cx, cy - 8 + bob, 10, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            // Fur texture (darker patches)
            ctx.fillStyle = '#2E2214';
            ctx.beginPath();
            ctx.ellipse(cx - 1.5, cy - 8 + bob, 5, 4, 0.3, 0, Math.PI * 2);
            ctx.fill();
            // Mange patches (bare skin)
            ctx.fillStyle = '#4A3828';
            ctx.beginPath();
            ctx.ellipse(cx + 3, cy - 6.5 + bob, 3, 2, 0.5, 0, Math.PI * 2);
            ctx.fill();
            // Individual hair strands
            ctx.strokeStyle = '#281E10';
            ctx.lineWidth = 0.3;
            for (let i = 0; i < 8; i++) {
                const hx = cx - 6 + rng() * 12;
                const hy = cy - 10 + rng() * 5 + bob;
                ctx.beginPath();
                ctx.moveTo(hx, hy);
                ctx.lineTo(hx + (rng()-0.5)*2, hy - 1.5 - rng());
                ctx.stroke();
            }
            // Head
            ctx.fillStyle = '#44342A';
            ctx.beginPath();
            ctx.ellipse(cx + 8, cy - 9 + bob, 5, 4, 0.3, 0, Math.PI * 2);
            ctx.fill();
            // Snout
            ctx.fillStyle = '#4E3E32';
            ctx.beginPath();
            ctx.ellipse(cx + 13, cy - 9 + bob, 2.2, 1.6, 0, 0, Math.PI * 2);
            ctx.fill();
            // Nose
            ctx.fillStyle = '#2A1A10';
            ctx.beginPath();
            ctx.arc(cx + 14.5, cy - 9 + bob, 0.8, 0, Math.PI * 2);
            ctx.fill();
            // Whiskers
            ctx.strokeStyle = '#5A4A3A';
            ctx.lineWidth = 0.3;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(cx + 13, cy - 9 + i * 1 + bob);
                ctx.lineTo(cx + 18, cy - 10 + i * 1.5 + bob);
                ctx.stroke();
            }
            // Teeth
            ctx.fillStyle = '#AA9960';
            ctx.fillRect(cx + 14, cy - 9.5 + bob, 0.8, 1.8);
            ctx.fillRect(cx + 14, cy - 8 + bob, 0.6, 1.2);
            // Eye (glowing red)
            ctx.fillStyle = '#0A0A0A';
            ctx.beginPath();
            ctx.arc(cx + 10, cy - 10.5 + bob, 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#AA2200';
            ctx.beginPath();
            ctx.arc(cx + 9.8, cy - 10.7 + bob, 0.5, 0, Math.PI * 2);
            ctx.fill();
            // Ear (tattered)
            ctx.fillStyle = '#4A3424';
            ctx.beginPath();
            ctx.ellipse(cx + 5, cy - 14 + bob, 2.5, 3, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#3A2C1C';
            ctx.fillRect(cx + 4.5, cy - 16 + bob, 2, 1.5);
            // Tail (segmented)
            ctx.strokeStyle = '#44342A';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy - 8 + bob);
            ctx.quadraticCurveTo(cx - 16, cy - 14, cx - 13, cy - 20 + bob);
            ctx.stroke();
            // Tail segments
            ctx.strokeStyle = '#362A1A';
            ctx.lineWidth = 0.3;
            for (let i = 0; i < 5; i++) {
                const tx = cx - 10 - i * 1.2;
                const tty = cy - 8 - i * 2.2 + bob;
                ctx.beginPath();
                ctx.arc(tx, tty, 0.8, 0, Math.PI * 2);
                ctx.stroke();
            }
            // Body outline
            ctx.strokeStyle = '#1E160C';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.ellipse(cx, cy - 8 + bob, 10, 6, 0, 0, Math.PI * 2);
            ctx.stroke();
            // Claws on feet
            ctx.strokeStyle = '#3A2A1A';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < 3; i++) {
                const fx = cx - 4 + i * 4;
                ctx.beginPath();
                ctx.moveTo(fx, cy - 2 + bob);
                ctx.lineTo(fx + 0.5, cy + bob);
                ctx.stroke();
            }
        }

        if (type === 'scorpion') {
            // Radscorpion with armored plates
            ctx.fillStyle = '#3E2008';
            ctx.beginPath();
            ctx.ellipse(cx, cy - 6 + bob, 12, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            // Armor plates (overlapping)
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = `rgba(${70 + i*8},${40 + i*5},${18 + i*3},0.5)`;
                ctx.beginPath();
                ctx.ellipse(cx - 3 + i * 2, cy - 7 + bob, 4 - i * 0.5, 3 - i * 0.3, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            // Chitin lines
            ctx.strokeStyle = '#2A1404';
            ctx.lineWidth = 0.4;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(cx - 6 + i * 4, cy - 6 + bob);
                ctx.lineTo(cx - 4 + i * 4, cy - 6 + bob);
                ctx.stroke();
            }
            // Head
            ctx.fillStyle = '#503018';
            ctx.beginPath();
            ctx.ellipse(cx + 10, cy - 7 + bob, 5, 4, 0.2, 0, Math.PI * 2);
            ctx.fill();
            // Mandibles
            ctx.fillStyle = '#2A1408';
            ctx.beginPath();
            ctx.moveTo(cx + 14, cy - 7 + bob);
            ctx.lineTo(cx + 16, cy - 9 + bob);
            ctx.lineTo(cx + 15, cy - 6 + bob);
            ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx + 14, cy - 7 + bob);
            ctx.lineTo(cx + 16, cy - 5 + bob);
            ctx.lineTo(cx + 15, cy - 8 + bob);
            ctx.closePath(); ctx.fill();
            // Pincers (large, menacing)
            ctx.strokeStyle = '#3E2008';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx + 12, cy - 10 + bob);
            ctx.lineTo(cx + 18, cy - 16 + bob);
            ctx.stroke();
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(cx + 18, cy - 16 + bob);
            ctx.lineTo(cx + 15, cy - 12 + bob);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 12, cy - 4 + bob);
            ctx.lineTo(cx + 18, cy - 0 + bob);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 18, cy - 0 + bob);
            ctx.lineTo(cx + 15, cy - 4 + bob);
            ctx.stroke();
            ctx.lineCap = 'butt';
            // Tail (arching, segmented)
            ctx.strokeStyle = '#4A2C10';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy - 6 + bob);
            ctx.quadraticCurveTo(cx - 16, cy - 16, cx - 13, cy - 24 + bob);
            ctx.quadraticCurveTo(cx - 10, cy - 27, cx - 8, cy - 25 + bob);
            ctx.stroke();
            // Stinger
            ctx.fillStyle = '#506A14';
            ctx.beginPath();
            ctx.moveTo(cx - 8, cy - 25 + bob);
            ctx.lineTo(cx - 6.5, cy - 29 + bob);
            ctx.lineTo(cx - 9.5, cy - 26 + bob);
            ctx.closePath();
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#882200';
            ctx.beginPath();
            ctx.arc(cx + 12, cy - 8.5 + bob, 1.2, 0, Math.PI * 2);
            ctx.fill();
            // Legs
            ctx.strokeStyle = '#2A1404';
            ctx.lineWidth = 1.2;
            for (let i = 0; i < 4; i++) {
                const lx = cx - 5 + i * 4;
                const sway = Math.sin(frame * 1.5 + i * 1.5) * 1.2;
                ctx.beginPath();
                ctx.moveTo(lx, cy - 2 + bob);
                ctx.lineTo(lx - 4, cy - 6 + bob);
                ctx.lineTo(lx - 7 + sway, cy + 3);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(lx, cy - 2 + bob);
                ctx.lineTo(lx + 4, cy - 6 + bob);
                ctx.lineTo(lx + 7 - sway, cy + 3);
                ctx.stroke();
            }
            // Outline
            ctx.strokeStyle = '#1A0C02';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.ellipse(cx, cy - 6 + bob, 12, 7, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (type === 'cave_spider') {
            // Giant cave spider
            // Abdomen
            ctx.fillStyle = '#141014';
            ctx.beginPath();
            ctx.ellipse(cx - 1.5, cy - 7 + bob, 8, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            // Abdomen pattern (hourglass/warning)
            ctx.fillStyle = '#221820';
            ctx.beginPath();
            ctx.moveTo(cx - 1.5, cy - 12 + bob);
            ctx.lineTo(cx + 2, cy - 7 + bob);
            ctx.lineTo(cx - 1.5, cy - 2 + bob);
            ctx.lineTo(cx - 5, cy - 7 + bob);
            ctx.closePath();
            ctx.fill();
            // Red mark
            ctx.fillStyle = 'rgba(90,16,8,0.25)';
            ctx.beginPath();
            ctx.ellipse(cx - 1.5, cy - 7 + bob, 2.5, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Hair tufts on abdomen
            ctx.strokeStyle = '#1C141C';
            ctx.lineWidth = 0.3;
            for (let i = 0; i < 10; i++) {
                const hx = cx - 1.5 + (rng()-0.5) * 14;
                const hy = cy - 7 + (rng()-0.5) * 10 + bob;
                ctx.beginPath();
                ctx.moveTo(hx, hy);
                ctx.lineTo(hx + (rng()-0.5)*2, hy - 1 - rng());
                ctx.stroke();
            }
            // Cephalothorax
            ctx.fillStyle = '#1C181C';
            ctx.beginPath();
            ctx.ellipse(cx + 6, cy - 9 + bob, 4.5, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Eyes (8 red dots)
            const eyePositions = [[-0.5,-1.2],[0.5,-1.2],[-1.2,-0.3],[1.2,-0.3],[0,-1.8],[-0.4,0.1],[0.4,0.1],[0,-0.7]];
            ctx.fillStyle = '#771100';
            for (const [ex, ey] of eyePositions) {
                ctx.beginPath();
                ctx.arc(cx + 8 + ex * 1.2, cy - 10 + ey * 1.2 + bob, 0.55, 0, Math.PI * 2);
                ctx.fill();
            }
            // Fangs (chelicerae)
            ctx.strokeStyle = '#2E2A28';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(cx + 8, cy - 7 + bob);
            ctx.lineTo(cx + 10, cy - 4.5 + bob);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 7, cy - 7 + bob);
            ctx.lineTo(cx + 5, cy - 4.5 + bob);
            ctx.stroke();
            // Venom drip
            ctx.fillStyle = 'rgba(60,80,20,0.2)';
            ctx.beginPath();
            ctx.arc(cx + 10, cy - 3.5 + bob, 0.7, 0, Math.PI * 2);
            ctx.fill();
            // Legs (8, jointed, hairy)
            ctx.strokeStyle = '#100C10';
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                const lx = cx - 3 + i * 3.5;
                const sway = Math.sin(frame * 1.4 + i * 1.3) * 1.5;
                const midY = cy - 14 + bob;
                ctx.beginPath();
                ctx.moveTo(lx, cy - 5 + bob);
                ctx.lineTo(lx - 7, midY);
                ctx.lineTo(lx - 10 + sway, cy + 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(lx, cy - 5 + bob);
                ctx.lineTo(lx + 7, midY);
                ctx.lineTo(lx + 10 - sway, cy + 2);
                ctx.stroke();
            }
            // Abdomen outline
            ctx.strokeStyle = '#0A060A';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.ellipse(cx - 1.5, cy - 7 + bob, 8, 6, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        return this.weatherSprite(c, 0.9);
    }

    // ---- CONTAINER SPRITES ----
    static generateContainerSprite(type) {
        const w = 40, h = 40;
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');
        const cx = w / 2, by = h - 5;
        const rng = this.seededRandom(type.length * 777);

        if (type === 'chest') {
            const bw = 20, bh = 14;
            const ty = by - bh;
            // Main body
            ctx.fillStyle = '#3A280A';
            ctx.fillRect(cx - bw/2, ty + 4, bw, bh - 4);
            // Lid
            ctx.fillStyle = '#443210';
            ctx.fillRect(cx - bw/2, ty, bw, 5);
            // Metal bands
            ctx.fillStyle = '#343028';
            ctx.fillRect(cx - bw/2, ty + 4, bw, 2);
            ctx.fillRect(cx - 1.5, ty, 3, bh);
            // Rust
            ctx.fillStyle = 'rgba(80,35,12,0.2)';
            ctx.fillRect(cx - bw/2, ty + 4, bw * 0.35, 2);
            // Corners
            ctx.fillStyle = '#3E3828';
            ctx.fillRect(cx - bw/2, ty, 3, 3);
            ctx.fillRect(cx + bw/2 - 3, ty, 3, 3);
            // Lock
            ctx.fillStyle = '#484440';
            ctx.fillRect(cx - 2.5, ty + 5.5, 5, 3);
            ctx.fillStyle = '#1A1A1A';
            ctx.beginPath();
            ctx.arc(cx, ty + 7.5, 0.8, 0, Math.PI * 2);
            ctx.fill();
            // Outline
            ctx.strokeStyle = '#181000';
            ctx.lineWidth = 1;
            ctx.strokeRect(cx - bw/2, ty, bw, bh);
            // Wear
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(cx - bw/2, by - 4, bw, 4);
        } else {
            const bw = 18, bh = 16;
            const ty = by - bh;
            ctx.fillStyle = '#382408';
            ctx.fillRect(cx - bw/2, ty, bw, bh);
            // Slats
            ctx.strokeStyle = '#241804';
            ctx.lineWidth = 0.7;
            for (let i = 1; i < 5; i++) {
                ctx.beginPath();
                ctx.moveTo(cx - bw/2, ty + (bh/5) * i);
                ctx.lineTo(cx + bw/2, ty + (bh/5) * i);
                ctx.stroke();
            }
            // Vertical reinforcement
            ctx.beginPath();
            ctx.moveTo(cx, ty);
            ctx.lineTo(cx, ty + bh);
            ctx.stroke();
            // Nails
            ctx.fillStyle = '#504838';
            const nails = [[-bw/2+2, 2],[bw/2-2,2],[-bw/2+2,bh-2],[bw/2-2,bh-2],[0,2],[0,bh-2]];
            for (const [nx, ny] of nails) {
                ctx.fillRect(cx + nx - 0.6, ty + ny - 0.6, 1.2, 1.2);
            }
            // Stencil marking
            ctx.fillStyle = 'rgba(90,80,50,0.08)';
            ctx.fillRect(cx - 4, ty + bh * 0.35, 8, 4);
            // Outline
            ctx.strokeStyle = '#181000';
            ctx.lineWidth = 1;
            ctx.strokeRect(cx - bw/2, ty, bw, bh);
            // Splintering
            ctx.fillStyle = 'rgba(50,38,12,0.15)';
            ctx.fillRect(cx + bw/2 - 3, ty + 3, 2, 5);
        }
        return this.weatherSprite(c, 0.7);
    }

    // ---- BONES SPRITE ----
    static generateBonesSprite() {
        const w = 40, h = 30;
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');
        const cx = w / 2, cy = h / 2 + 4;

        // Scattered long bones
        ctx.strokeStyle = '#7A7050';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 8, cy + 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 5, cy - 2); ctx.lineTo(cx - 7, cy + 1.5);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy + 3); ctx.lineTo(cx + 2, cy + 4);
        ctx.stroke();
        ctx.lineCap = 'butt';

        // Skull (yellowed, cracked)
        ctx.fillStyle = '#787050';
        ctx.beginPath();
        ctx.ellipse(cx + 1.5, cy - 5, 5, 4.5, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#504838';
        ctx.lineWidth = 0.6;
        ctx.stroke();
        // Crack
        ctx.strokeStyle = '#443C30';
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(cx + 1.5, cy - 8.5);
        ctx.lineTo(cx + 3, cy - 5);
        ctx.lineTo(cx + 1, cy - 3.5);
        ctx.stroke();
        // Eye sockets
        ctx.fillStyle = '#0C0804';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 5.5, 1.5, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 3.5, cy - 5.5, 1.5, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Nose
        ctx.fillStyle = '#141008';
        ctx.beginPath();
        ctx.moveTo(cx + 1.5, cy - 4.2);
        ctx.lineTo(cx + 0.8, cy - 3);
        ctx.lineTo(cx + 2.2, cy - 3);
        ctx.closePath();
        ctx.fill();
        // Jaw
        ctx.strokeStyle = '#7A7050';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx + 1.5, cy - 2, 2.8, 0.3, Math.PI - 0.3);
        ctx.stroke();
        // Teeth
        ctx.fillStyle = '#8A8260';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(cx - 0.5 + i * 1.2, cy - 2.5, 0.8, 1);
        }
        return this.weatherSprite(c, 0.6);
    }

    // ---- ENVIRONMENTAL OBJECT SPRITES ----

    static generateDeadTree(variant) {
        const w = 48, h = 80;
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');
        const cx = w / 2, by = h - 4;
        const rng = this.seededRandom(variant * 331);

        // Trunk (gnarled, twisted)
        const trunkLean = (rng() - 0.5) * 6;
        ctx.strokeStyle = '#2E2214';
        ctx.lineWidth = 5 + rng() * 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, by);
        ctx.quadraticCurveTo(cx + trunkLean, by - 25, cx + trunkLean * 0.5, by - 45);
        ctx.stroke();
        // Trunk texture (bark lines)
        ctx.strokeStyle = '#221A0E';
        ctx.lineWidth = 0.6;
        for (let i = 0; i < 6; i++) {
            const ty = by - 5 - i * 7;
            ctx.beginPath();
            ctx.moveTo(cx - 3 + trunkLean * (i/6), ty);
            ctx.lineTo(cx + 2 + trunkLean * (i/6), ty + 1);
            ctx.stroke();
        }
        // Trunk highlight
        ctx.strokeStyle = 'rgba(60,48,30,0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 2, by - 3);
        ctx.lineTo(cx - 2 + trunkLean * 0.3, by - 35);
        ctx.stroke();

        // Branches (bare, dead)
        ctx.strokeStyle = '#2A1E12';
        ctx.lineWidth = 2.5;
        // Right branch
        ctx.beginPath();
        ctx.moveTo(cx + trunkLean * 0.4, by - 35);
        ctx.quadraticCurveTo(cx + 15, by - 48, cx + 18 + rng() * 5, by - 52);
        ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + 14, by - 46);
        ctx.lineTo(cx + 20, by - 55);
        ctx.stroke();
        // Left branch
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(cx + trunkLean * 0.3, by - 30);
        ctx.quadraticCurveTo(cx - 12, by - 42, cx - 16, by - 48);
        ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - 13, by - 43);
        ctx.lineTo(cx - 18, by - 50);
        ctx.stroke();
        // Top branch
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx + trunkLean * 0.5, by - 45);
        ctx.lineTo(cx + trunkLean * 0.5 + 3, by - 60);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + trunkLean * 0.5 + 2, by - 55);
        ctx.lineTo(cx + trunkLean * 0.5 + 8, by - 62);
        ctx.stroke();
        ctx.lineCap = 'butt';

        // Sparse dead leaves (just a few clumps)
        if (variant % 3 !== 0) {
            ctx.fillStyle = 'rgba(55,42,22,0.35)';
            for (let i = 0; i < 4; i++) {
                const lx = cx + (rng() - 0.5) * 24;
                const ly = by - 42 - rng() * 22;
                ctx.beginPath();
                ctx.ellipse(lx, ly, 2 + rng() * 2, 1.5 + rng(), rng() * 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Exposed roots
        ctx.strokeStyle = '#2A1E12';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 2, by);
        ctx.quadraticCurveTo(cx - 8, by + 1, cx - 10, by - 1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 2, by);
        ctx.quadraticCurveTo(cx + 7, by + 2, cx + 9, by);
        ctx.stroke();

        return this.weatherSprite(c, 0.7);
    }

    static generateRuins(variant) {
        const w = 64, h = 56;
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');
        const cx = w / 2, by = h - 4;
        const rng = this.seededRandom(variant * 449);

        if (variant % 3 === 0) {
            // Collapsed wall section
            const wallH = 20 + rng() * 10;
            ctx.fillStyle = '#484030';
            ctx.fillRect(cx - 14, by - wallH, 10, wallH);
            // Broken top (jagged)
            ctx.fillStyle = '#484030';
            ctx.beginPath();
            ctx.moveTo(cx - 14, by - wallH);
            ctx.lineTo(cx - 12, by - wallH - 5);
            ctx.lineTo(cx - 9, by - wallH - 2);
            ctx.lineTo(cx - 6, by - wallH - 8);
            ctx.lineTo(cx - 4, by - wallH);
            ctx.closePath();
            ctx.fill();
            // Brick lines
            ctx.strokeStyle = '#342C1C';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < wallH / 4; i++) {
                const ly = by - i * 4;
                ctx.beginPath();
                ctx.moveTo(cx - 14, ly);
                ctx.lineTo(cx - 4, ly);
                ctx.stroke();
                if (i % 2 === 0) {
                    ctx.beginPath();
                    ctx.moveTo(cx - 9, ly);
                    ctx.lineTo(cx - 9, ly - 4);
                    ctx.stroke();
                }
            }
            // Rubble pile at base
            ctx.fillStyle = '#3E3828';
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.ellipse(cx - 4 + rng() * 12, by - 1 - rng() * 4, 2 + rng() * 3, 1.5 + rng() * 1.5, rng() * 3, 0, Math.PI * 2);
                ctx.fill();
            }
            // Rebar sticking out
            ctx.strokeStyle = '#5A3A20';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(cx - 7, by - wallH - 3);
            ctx.lineTo(cx - 6, by - wallH - 10);
            ctx.stroke();
        } else if (variant % 3 === 1) {
            // Ruined building corner
            // Back wall
            ctx.fillStyle = '#444038';
            ctx.fillRect(cx - 16, by - 28, 12, 28);
            // Side wall fragment
            ctx.fillStyle = '#3C3428';
            ctx.fillRect(cx - 4, by - 18, 18, 18);
            // Jagged top
            ctx.fillStyle = '#444038';
            ctx.beginPath();
            ctx.moveTo(cx - 16, by - 28);
            ctx.lineTo(cx - 14, by - 33);
            ctx.lineTo(cx - 10, by - 30);
            ctx.lineTo(cx - 6, by - 28);
            ctx.lineTo(cx - 4, by - 18);
            ctx.lineTo(cx - 4, by - 28);
            ctx.closePath();
            ctx.fill();
            // Window hole
            ctx.fillStyle = '#0A0808';
            ctx.fillRect(cx - 13, by - 22, 6, 7);
            ctx.strokeStyle = '#3A3224';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(cx - 13, by - 22, 6, 7);
            // Rubble
            ctx.fillStyle = '#3A3428';
            for (let i = 0; i < 6; i++) {
                ctx.beginPath();
                ctx.ellipse(cx + 4 + rng() * 14, by - 1 - rng() * 3, 2 + rng() * 2, 1 + rng(), rng() * 3, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Archway/doorframe ruins
            // Left pillar
            ctx.fillStyle = '#4A4238';
            ctx.fillRect(cx - 12, by - 32, 6, 32);
            // Right pillar
            ctx.fillRect(cx + 6, by - 26, 6, 26);
            // Lintel fragment
            ctx.fillRect(cx - 6, by - 28, 12, 4);
            // Brick detail
            ctx.strokeStyle = '#342C1C';
            ctx.lineWidth = 0.4;
            for (let i = 0; i < 8; i++) {
                ctx.beginPath();
                ctx.moveTo(cx - 12, by - i * 4);
                ctx.lineTo(cx - 6, by - i * 4);
                ctx.stroke();
            }
            // Rubble
            ctx.fillStyle = '#3E3828';
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.ellipse(cx + (rng()-0.5) * 16, by - 1 - rng() * 3, 1.5 + rng() * 2, 1 + rng(), rng() * 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        return this.weatherSprite(c, 0.7);
    }

    static generateWreckage(variant) {
        const w = 56, h = 44;
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');
        const cx = w / 2, by = h - 4;
        const rng = this.seededRandom(variant * 587);

        if (variant % 3 === 0) {
            // Rusted vehicle hull (Fallout style)
            // Body frame
            ctx.fillStyle = '#3A3028';
            ctx.fillRect(cx - 18, by - 14, 36, 12);
            // Rounded top
            ctx.fillStyle = '#343025';
            ctx.beginPath();
            ctx.ellipse(cx, by - 14, 16, 7, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            // Rust patches
            ctx.fillStyle = 'rgba(80,38,14,0.3)';
            ctx.beginPath();
            ctx.ellipse(cx - 8, by - 10, 5, 3, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 10, by - 12, 4, 2.5, -0.2, 0, Math.PI * 2);
            ctx.fill();
            // Windows (broken)
            ctx.fillStyle = '#0C0A08';
            ctx.fillRect(cx - 10, by - 18, 7, 4);
            ctx.fillRect(cx + 3, by - 18, 7, 4);
            // Window frame
            ctx.strokeStyle = '#2A2420';
            ctx.lineWidth = 0.6;
            ctx.strokeRect(cx - 10, by - 18, 7, 4);
            ctx.strokeRect(cx + 3, by - 18, 7, 4);
            // Glass shard
            ctx.fillStyle = 'rgba(50,60,65,0.12)';
            ctx.beginPath();
            ctx.moveTo(cx - 10, by - 18);
            ctx.lineTo(cx - 7, by - 15);
            ctx.lineTo(cx - 10, by - 15);
            ctx.closePath();
            ctx.fill();
            // Wheels (flat)
            ctx.fillStyle = '#1A1A1A';
            ctx.beginPath();
            ctx.ellipse(cx - 12, by - 1, 4, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 12, by - 1, 4, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Hubcap
            ctx.strokeStyle = '#2A2A2A';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(cx - 12, by - 1, 2, 0, Math.PI * 2);
            ctx.stroke();
            // Damage dents
            ctx.strokeStyle = '#2A2420';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(cx + 5, by - 8);
            ctx.lineTo(cx + 8, by - 6);
            ctx.stroke();
        } else if (variant % 3 === 1) {
            // Junk pile / scrap heap
            // Large base pieces
            ctx.fillStyle = '#343028';
            ctx.fillRect(cx - 12, by - 10, 8, 10);
            ctx.fillStyle = '#2E2820';
            ctx.fillRect(cx - 2, by - 14, 10, 14);
            ctx.fillStyle = '#383028';
            ctx.beginPath();
            ctx.moveTo(cx + 8, by);
            ctx.lineTo(cx + 16, by);
            ctx.lineTo(cx + 14, by - 8);
            ctx.lineTo(cx + 6, by - 6);
            ctx.closePath();
            ctx.fill();
            // Pipe sticking out
            ctx.strokeStyle = '#4A4238';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - 6, by - 10);
            ctx.lineTo(cx - 10, by - 18);
            ctx.stroke();
            // Wire coil
            ctx.strokeStyle = '#3A3A3A';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(cx + 4, by - 14);
            ctx.bezierCurveTo(cx + 8, by - 18, cx + 12, by - 12, cx + 16, by - 16);
            ctx.stroke();
            // Rust
            ctx.fillStyle = 'rgba(75,35,12,0.25)';
            ctx.beginPath();
            ctx.ellipse(cx, by - 8, 4, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Scattered bolts
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = '#4A4840';
                ctx.fillRect(cx - 14 + rng() * 28, by - 2 + rng() * 2, 1, 1);
            }
        } else {
            // Overturned barrel / drum
            ctx.fillStyle = '#3A3430';
            ctx.beginPath();
            ctx.ellipse(cx, by - 5, 8, 12, 0.4, 0, Math.PI * 2);
            ctx.fill();
            // Barrel bands
            ctx.strokeStyle = '#2A2620';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(cx, by - 5, 8, 12, 0.4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = '#303028';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx - 5, by - 14);
            ctx.lineTo(cx + 8, by - 11);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - 7, by + 2);
            ctx.lineTo(cx + 6, by + 4);
            ctx.stroke();
            // Spill (toxic green or oil)
            const toxic = variant % 2 === 0;
            ctx.fillStyle = toxic ? 'rgba(40,60,15,0.15)' : 'rgba(15,12,8,0.12)';
            ctx.beginPath();
            ctx.ellipse(cx + 10, by + 1, 6, 3, 0.3, 0, Math.PI * 2);
            ctx.fill();
            // Rust
            ctx.fillStyle = 'rgba(70,32,10,0.2)';
            ctx.beginPath();
            ctx.ellipse(cx - 2, by - 2, 3, 4, 0.4, 0, Math.PI * 2);
            ctx.fill();
            // Radiation symbol (on toxic barrel)
            if (toxic) {
                ctx.strokeStyle = 'rgba(120,100,20,0.12)';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.arc(cx + 1, by - 5, 3, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        return this.weatherSprite(c, 0.8);
    }

    static generateBuilding(variant) {
        const w = 64, h = 70;
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');
        const cx = w / 2, by = h - 4;
        const rng = this.seededRandom(variant * 673);

        if (variant % 2 === 0) {
            // Small shack/shed
            const bw = 34, bh = 32;
            const ty = by - bh;
            // Walls
            ctx.fillStyle = '#3E3428';
            ctx.fillRect(cx - bw/2, ty, bw, bh);
            // Right wall (darker)
            ctx.fillStyle = '#343025';
            ctx.fillRect(cx + 2, ty, bw/2 - 2, bh);
            // Roof (corrugated metal, slanted)
            ctx.fillStyle = '#3A3832';
            ctx.beginPath();
            ctx.moveTo(cx - bw/2 - 3, ty);
            ctx.lineTo(cx + bw/2 + 3, ty);
            ctx.lineTo(cx + bw/2 + 5, ty - 8);
            ctx.lineTo(cx - bw/2 - 1, ty - 12);
            ctx.closePath();
            ctx.fill();
            // Roof corrugation
            ctx.strokeStyle = '#30302A';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < 6; i++) {
                const rx = cx - bw/2 - 2 + i * 6;
                ctx.beginPath();
                ctx.moveTo(rx, ty);
                ctx.lineTo(rx + 1, ty - 10);
                ctx.stroke();
            }
            // Rust on roof
            ctx.fillStyle = 'rgba(70,32,10,0.15)';
            ctx.beginPath();
            ctx.ellipse(cx + 5, ty - 4, 5, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Door
            ctx.fillStyle = '#2A2018';
            ctx.fillRect(cx - 3, by - 16, 6, 16);
            ctx.strokeStyle = '#1A1408';
            ctx.lineWidth = 0.6;
            ctx.strokeRect(cx - 3, by - 16, 6, 16);
            // Door handle
            ctx.fillStyle = '#504840';
            ctx.fillRect(cx + 1, by - 9, 1.5, 1.5);
            // Window
            ctx.fillStyle = '#0C0A08';
            ctx.fillRect(cx + 7, ty + 8, 6, 5);
            ctx.strokeStyle = '#2A2420';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(cx + 7, ty + 8, 6, 5);
            // Board across window
            ctx.fillStyle = '#3A3020';
            ctx.save();
            ctx.translate(cx + 10, ty + 10);
            ctx.rotate(0.3);
            ctx.fillRect(-4, -0.5, 8, 1);
            ctx.restore();
            // Wear/damage
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            ctx.fillRect(cx - bw/2, by - 5, bw, 5);
        } else {
            // Watchtower / lookout post
            // Posts
            ctx.fillStyle = '#2E2214';
            ctx.fillRect(cx - 10, by - 50, 3, 50);
            ctx.fillRect(cx + 7, by - 50, 3, 50);
            // Cross braces
            ctx.strokeStyle = '#2E2214';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx - 10, by - 15);
            ctx.lineTo(cx + 10, by - 30);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 10, by - 15);
            ctx.lineTo(cx - 10, by - 30);
            ctx.stroke();
            // Platform
            ctx.fillStyle = '#3A2E1C';
            ctx.fillRect(cx - 14, by - 38, 28, 3);
            // Railing
            ctx.strokeStyle = '#2A2014';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - 14, by - 38);
            ctx.lineTo(cx - 14, by - 46);
            ctx.lineTo(cx + 14, by - 46);
            ctx.lineTo(cx + 14, by - 38);
            ctx.stroke();
            // Railing slats
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(cx - 10 + i * 7, by - 38);
                ctx.lineTo(cx - 10 + i * 7, by - 46);
                ctx.stroke();
            }
            // Tarp/cover on top
            ctx.fillStyle = '#34302A';
            ctx.beginPath();
            ctx.moveTo(cx - 16, by - 46);
            ctx.lineTo(cx + 16, by - 46);
            ctx.lineTo(cx + 14, by - 52);
            ctx.lineTo(cx - 14, by - 54);
            ctx.closePath();
            ctx.fill();
            // Ladder
            ctx.strokeStyle = '#2E2214';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx + 12, by);
            ctx.lineTo(cx + 12, by - 38);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 15, by);
            ctx.lineTo(cx + 15, by - 38);
            ctx.stroke();
            for (let i = 0; i < 8; i++) {
                ctx.beginPath();
                ctx.moveTo(cx + 12, by - 4 - i * 4.5);
                ctx.lineTo(cx + 15, by - 4 - i * 4.5);
                ctx.stroke();
            }
        }
        return this.weatherSprite(c, 0.7);
    }

    static generateCactus(variant) {
        const w = 32, h = 48;
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');
        const cx = w / 2, by = h - 4;
        const rng = this.seededRandom(variant * 223);

        // Main stem
        ctx.fillStyle = '#2A4018';
        ctx.fillRect(cx - 3, by - 28 - variant * 3, 6, 28 + variant * 3);
        // Ribs
        ctx.strokeStyle = '#223410';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, by - 28 - variant * 3);
        ctx.lineTo(cx, by);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 2, by - 26 - variant * 3);
        ctx.lineTo(cx - 2, by);
        ctx.stroke();
        // Highlight
        ctx.fillStyle = 'rgba(50,70,30,0.15)';
        ctx.fillRect(cx - 3, by - 28 - variant * 3, 2, 28 + variant * 3);
        // Arms
        if (variant > 0) {
            // Right arm
            ctx.fillStyle = '#2A4018';
            ctx.fillRect(cx + 3, by - 20, 10, 4);
            ctx.fillRect(cx + 10, by - 28, 4, 12);
            // Left arm
            if (variant > 1) {
                ctx.fillRect(cx - 13, by - 16, 10, 4);
                ctx.fillRect(cx - 13, by - 24, 4, 12);
            }
        }
        // Spines
        ctx.strokeStyle = '#445828';
        ctx.lineWidth = 0.3;
        for (let i = 0; i < 6; i++) {
            const sy = by - 6 - i * 4 - rng() * 3;
            ctx.beginPath();
            ctx.moveTo(cx - 3, sy);
            ctx.lineTo(cx - 5, sy - 1);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 3, sy);
            ctx.lineTo(cx + 5, sy - 1);
            ctx.stroke();
        }
        return this.weatherSprite(c, 0.7);
    }

    static generateRockFormation(variant) {
        const w = 48, h = 36;
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');
        const cx = w / 2, by = h - 2;
        const rng = this.seededRandom(variant * 419);

        // Large rocks
        const numRocks = 2 + Math.floor(rng() * 3);
        for (let i = 0; i < numRocks; i++) {
            const rx = cx + (rng() - 0.5) * 24;
            const ry = by - 2 - rng() * 8;
            const rw = 6 + rng() * 10;
            const rh = 4 + rng() * 7;
            // Rock body
            ctx.fillStyle = `rgb(${52+rng()*15|0},${48+rng()*12|0},${40+rng()*10|0})`;
            ctx.beginPath();
            ctx.ellipse(rx, ry, rw, rh, rng() * 0.5, 0, Math.PI * 2);
            ctx.fill();
            // Highlight
            ctx.fillStyle = `rgba(80,75,60,${0.1+rng()*0.1})`;
            ctx.beginPath();
            ctx.ellipse(rx - rw * 0.2, ry - rh * 0.3, rw * 0.5, rh * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            // Crack
            if (rng() > 0.4) {
                ctx.strokeStyle = `rgba(30,28,20,${0.2+rng()*0.15})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(rx - rw * 0.3, ry);
                ctx.lineTo(rx + rw * 0.2, ry - rh * 0.3);
                ctx.stroke();
            }
            // Outline
            ctx.strokeStyle = `rgba(30,28,22,0.3)`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.ellipse(rx, ry, rw, rh, rng() * 0.5, 0, Math.PI * 2);
            ctx.stroke();
        }
        return this.weatherSprite(c, 0.6);
    }

    static generateCampfire() {
        const w = 32, h = 32;
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');
        const cx = w / 2, by = h - 6;

        // Stone ring
        ctx.fillStyle = '#3A3830';
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.ellipse(cx + Math.cos(a) * 7, by - 2 + Math.sin(a) * 3, 2.5, 1.8, a, 0, Math.PI * 2);
            ctx.fill();
        }
        // Ash/charcoal center
        ctx.fillStyle = '#1A1816';
        ctx.beginPath();
        ctx.ellipse(cx, by - 2, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Burned wood
        ctx.fillStyle = '#201A14';
        ctx.fillRect(cx - 4, by - 3, 3, 1.5);
        ctx.fillRect(cx + 1, by - 4, 3.5, 1.5);
        ctx.save();
        ctx.translate(cx, by - 2);
        ctx.rotate(0.8);
        ctx.fillRect(-2, -0.5, 4, 1);
        ctx.restore();
        // Embers
        ctx.fillStyle = 'rgba(150,50,10,0.25)';
        ctx.beginPath();
        ctx.arc(cx - 1, by - 3, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(180,70,15,0.2)';
        ctx.beginPath();
        ctx.arc(cx + 2, by - 2.5, 0.8, 0, Math.PI * 2);
        ctx.fill();
        return this.weatherSprite(c, 0.6);
    }

    static generateSignpost() {
        const w = 24, h = 48;
        const c = this.createCanvas(w, h);
        const ctx = c.getContext('2d');
        const cx = w / 2, by = h - 4;

        // Post
        ctx.fillStyle = '#2E2214';
        ctx.fillRect(cx - 1.5, by - 36, 3, 36);
        // Sign board (weathered)
        ctx.fillStyle = '#3A3020';
        ctx.fillRect(cx - 9, by - 34, 18, 8);
        ctx.strokeStyle = '#221A0E';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - 9, by - 34, 18, 8);
        // Faded text (just lines to suggest writing)
        ctx.strokeStyle = 'rgba(80,70,50,0.12)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(cx - 6 + i * 2, by - 32);
            ctx.lineTo(cx - 4 + i * 2, by - 32);
            ctx.stroke();
        }
        // Second sign at angle
        ctx.save();
        ctx.translate(cx, by - 28);
        ctx.rotate(-0.15);
        ctx.fillStyle = '#342A1C';
        ctx.fillRect(-7, -3, 14, 6);
        ctx.strokeStyle = '#221A0E';
        ctx.lineWidth = 0.4;
        ctx.strokeRect(-7, -3, 14, 6);
        ctx.restore();
        // Nail
        ctx.fillStyle = '#505050';
        ctx.fillRect(cx - 0.5, by - 34, 1, 1);
        return this.weatherSprite(c, 0.6);
    }
}

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

        // Heavier dust/ash particle system
        this.particles = [];
        for (let i = 0; i < 80; i++) {
            this.particles.push({
                x: Math.random() * 2000 - 1000,
                y: Math.random() * 2000 - 1000,
                vx: (Math.random() - 0.5) * 0.3 + 0.15,
                vy: -Math.random() * 0.08 - 0.01,
                size: Math.random() * 2 + 0.3,
                alpha: Math.random() * 0.15 + 0.03,
                life: Math.random() * 400 + 150,
                type: Math.random() > 0.7 ? 'ash' : 'dust',
            });
        }

        // Deterministic noise (larger table for more variety)
        this.noiseSeed = [];
        for (let i = 0; i < 1024; i++) {
            this.noiseSeed.push(Math.random());
        }

        // Debris lookup per tile (deterministic)
        this.debrisCache = {};

        // Fallout 2 palette: very desaturated, dark earth tones, muted and grim
        this.tileColors = {
            'dirt':        { top: '#584830', left: '#3E3018', right: '#4A3C22', stroke: '#2E2210' },
            'sand':        { top: '#8A7A55', left: '#6A5A3A', right: '#7A6A48', stroke: '#5A4A2E' },
            'grass':       { top: '#3A5020', left: '#223810', right: '#2E4418', stroke: '#1A2E08' },
            'stone':       { top: '#585450', left: '#3A3835', right: '#484642', stroke: '#2A2825' },
            'wood':        { top: '#4A3818', left: '#34260C', right: '#403010', stroke: '#281E06' },
            'water':       { top: '#152840', left: '#0C1C30', right: '#102238', stroke: '#081828' },
            'road':        { top: '#484640', left: '#302E28', right: '#3C3A34', stroke: '#222018' },
            'cave_floor':  { top: '#2A2220', left: '#1C1614', right: '#221C1A', stroke: '#120C0A' },
            'cave_wall':   { top: '#3A3230', left: '#221A18', right: '#2E2624', stroke: '#140E0C' },
            'cave_rock':   { top: '#403C34', left: '#282420', right: '#34302A', stroke: '#1C1814' },
            'lava':        { top: '#882800', left: '#661000', right: '#771C00', stroke: '#500800' },
            'crystal':     { top: '#3A7080', left: '#225060', right: '#2E6070', stroke: '#184050' },
            'wall':        { top: '#686048', left: '#443C24', right: '#544C34', stroke: '#342C18' },
            'wall_top':    { top: '#787058', left: '#504838', right: '#605844', stroke: '#403828' },
            'door':        { top: '#46300E', left: '#2E1800', right: '#3A2406', stroke: '#200E00' },
            'void':        { top: '#030303', left: '#010101', right: '#020202', stroke: '#000000' },
        };

        // Ambient light color (warm wasteland sun, low angle)
        this.ambientColor = { r: 180, g: 150, b: 100 };
        this.shadowColor = { r: 20, g: 15, b: 10 };

        // Pre-generate debris items for tiles
        this._debrisTypes = [
            'can', 'bone', 'glass', 'rebar', 'rock', 'shell', 'cloth', 'wire', 'pipe', 'bottle'
        ];

        // ---- PRE-RENDER ALL SPRITES ----
        this._spriteCache = {};
        this._generateAllSprites();

        this.resize();
    }

    // Generate all sprite canvases at init time
    _generateAllSprites() {
        const tileTypes = Object.keys(this.tileColors);
        // Generate 4 variants per tile type for variety
        this._tileSprites = {};
        for (const type of tileTypes) {
            this._tileSprites[type] = [];
            for (let v = 0; v < 4; v++) {
                this._tileSprites[type].push(
                    SpriteGenerator.generateTileSprite(type, this.tileWidth, this.tileHeight, type.length * 1000 + v * 317)
                );
            }
        }

        // Humanoid sprites: 4 animation frames x 4 directions
        // south = front, north = back, east = mirrored front, west = front
        const humanoidTypes = ['player', 'villager', 'merchant', 'elder', 'guard', 'raider', 'mutant'];
        this._humanoidSprites = {};
        for (const type of humanoidTypes) {
            this._humanoidSprites[type] = {
                south: [], north: [], east: [], west: []
            };
            for (let f = 0; f < 4; f++) {
                const south = SpriteGenerator.generateHumanoidSprite(type, f, 'south');
                const north = SpriteGenerator.generateHumanoidSprite(type, f, 'north');
                const east = SpriteGenerator.mirrorSprite(south);
                this._humanoidSprites[type].south.push(south);
                this._humanoidSprites[type].north.push(north);
                this._humanoidSprites[type].east.push(east);
                this._humanoidSprites[type].west.push(south); // west uses front sprite
            }
        }

        // Creature sprites: 4 animation frames x 2 directions (east = mirrored)
        const creatureTypes = ['rat', 'scorpion', 'cave_spider'];
        this._creatureSprites = {};
        for (const type of creatureTypes) {
            this._creatureSprites[type] = { south: [], north: [], east: [], west: [] };
            for (let f = 0; f < 4; f++) {
                const sprite = SpriteGenerator.generateCreatureSprite(type, f);
                const mirrored = SpriteGenerator.mirrorSprite(sprite);
                this._creatureSprites[type].south.push(sprite);
                this._creatureSprites[type].north.push(sprite);
                this._creatureSprites[type].east.push(mirrored);
                this._creatureSprites[type].west.push(sprite);
            }
        }

        // Container sprites
        this._containerSprites = {
            'chest': SpriteGenerator.generateContainerSprite('chest'),
            'crate': SpriteGenerator.generateContainerSprite('crate'),
        };

        // Bones sprite
        this._bonesSprite = SpriteGenerator.generateBonesSprite();

        // Environmental object sprites (trees, ruins, wreckage, buildings, etc.)
        this._envSprites = {
            'dead_tree': [], 'ruins': [], 'wreckage': [], 'building': [],
            'cactus': [], 'rock_formation': [],
            'campfire': [SpriteGenerator.generateCampfire()],
            'signpost': [SpriteGenerator.generateSignpost()],
        };
        for (let v = 0; v < 4; v++) {
            this._envSprites['dead_tree'].push(SpriteGenerator.generateDeadTree(v));
            this._envSprites['ruins'].push(SpriteGenerator.generateRuins(v));
            this._envSprites['wreckage'].push(SpriteGenerator.generateWreckage(v));
            this._envSprites['cactus'].push(SpriteGenerator.generateCactus(v));
            this._envSprites['rock_formation'].push(SpriteGenerator.generateRockFormation(v));
        }
        for (let v = 0; v < 2; v++) {
            this._envSprites['building'].push(SpriteGenerator.generateBuilding(v));
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    clear() {
        this.ctx.fillStyle = '#040302';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    noise(x, y) {
        return this.noiseSeed[((x * 73 + y * 137) & 1023)];
    }

    noise2(x, y) {
        return this.noiseSeed[((x * 31 + y * 97 + 200) & 1023)];
    }

    noise3(x, y) {
        return this.noiseSeed[((x * 53 + y * 179 + 500) & 1023)];
    }

    // Get deterministic debris list for a tile
    getDebris(gx, gy) {
        const key = gx + ',' + gy;
        if (this.debrisCache[key]) return this.debrisCache[key];
        const n = this.noise(gx * 5, gy * 3);
        const n2 = this.noise2(gx * 3, gy * 7);
        const items = [];
        // Most tiles get 0-3 debris items
        const count = Math.floor(n * 4);
        for (let i = 0; i < count; i++) {
            const ni = this.noise3(gx + i * 17, gy + i * 31);
            const ni2 = this.noise(gx + i * 41, gy + i * 13);
            items.push({
                type: this._debrisTypes[Math.floor(ni * this._debrisTypes.length)],
                ox: (ni - 0.5) * 0.7,  // offset from center, -0.35 to 0.35
                oy: (ni2 - 0.5) * 0.7,
                rot: ni * Math.PI * 2,
                scale: 0.5 + ni2 * 0.6,
            });
        }
        this.debrisCache[key] = items;
        return items;
    }

    // Desaturate a hex color by amount (0-1)
    desaturate(hex, amount) {
        const [r, g, b] = this.hexToRgb(hex);
        const gray = r * 0.299 + g * 0.587 + b * 0.114;
        return this.rgbStr(
            r + (gray - r) * amount,
            g + (gray - g) * amount,
            b + (gray - b) * amount
        );
    }

    // Darken color
    darken(hex, amount) {
        const [r, g, b] = this.hexToRgb(hex);
        return this.rgbStr(r * (1 - amount), g * (1 - amount), b * (1 - amount));
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

    // ---- TILE RENDERING (Fallout 2 style with pre-rendered sprites) ----

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
        const n3 = this.noise3(gx, gy);

        // Use pre-rendered tile sprite
        const sprites = this._tileSprites[tileType] || this._tileSprites['dirt'];
        const variant = ((gx * 7 + gy * 13) & 3); // deterministic variant selection
        const sprite = sprites[variant];

        if (sprite && tileType !== 'void') {
            // Draw pre-rendered sprite scaled to current zoom
            const sw = sprite.width * z;
            const sh = sprite.height * z;
            ctx.drawImage(sprite,
                screen.x - sw / 2,
                screen.y - th - hOffset - 2 * z,
                sw, sh
            );

            // Additional per-tile variation overlay
            const variation = (n - 0.5) * 6;
            if (variation < -1) {
                ctx.fillStyle = `rgba(0,0,0,${Math.abs(variation) * 0.01})`;
                ctx.beginPath();
                ctx.moveTo(screen.x, screen.y - th - hOffset);
                ctx.lineTo(screen.x + tw, screen.y - hOffset);
                ctx.lineTo(screen.x, screen.y + th - hOffset);
                ctx.lineTo(screen.x - tw, screen.y - hOffset);
                ctx.closePath();
                ctx.fill();
            }
        } else {
            // Fallback for void or missing sprites
            ctx.beginPath();
            ctx.moveTo(screen.x, screen.y - th - hOffset);
            ctx.lineTo(screen.x + tw, screen.y - hOffset);
            ctx.lineTo(screen.x, screen.y + th - hOffset);
            ctx.lineTo(screen.x - tw, screen.y - hOffset);
            ctx.closePath();
            ctx.fillStyle = colors.top;
            ctx.fill();
        }

        // Ambient occlusion fake on ground tiles near walls
        if (height === 0 && n3 > 0.65) {
            ctx.fillStyle = `rgba(0,0,0,${0.03 + n * 0.03})`;
            ctx.beginPath();
            ctx.moveTo(screen.x, screen.y - th - hOffset);
            ctx.lineTo(screen.x + tw, screen.y - hOffset);
            ctx.lineTo(screen.x, screen.y + th - hOffset);
            ctx.lineTo(screen.x - tw, screen.y - hOffset);
            ctx.closePath();
            ctx.fill();
        }

        // Draw debris/clutter on ground tiles
        if (height === 0 && tileType !== 'water' && tileType !== 'lava' && tileType !== 'void') {
            this.drawDebris(ctx, screen, tw, th, hOffset, z, gx, gy, tileType);
        }

        // Wall sides
        if (height > 0) {
            this.drawWallSides(ctx, screen, tw, th, hOffset, z, gx, gy, tileType, colors, height, n);
        }
    }

    drawWallSides(ctx, screen, tw, th, hOffset, z, gx, gy, tileType, colors, height, n) {
        const isStone = tileType === 'cave_wall' || tileType === 'cave_rock';
        const brickH = 4 * z;

        // ---- LEFT FACE ----
        ctx.beginPath();
        ctx.moveTo(screen.x - tw, screen.y - hOffset);
        ctx.lineTo(screen.x, screen.y + th - hOffset);
        ctx.lineTo(screen.x, screen.y + th);
        ctx.lineTo(screen.x - tw, screen.y);
        ctx.closePath();
        ctx.fillStyle = colors.left;
        ctx.fill();

        ctx.save();
        ctx.clip();
        // Brick/stone mortar
        for (let i = 0; i < height * 4; i++) {
            const by = screen.y + th - i * brickH;
            const offset = (i % 2) * 6 * z;
            const mortarDark = -12 - this.noise(gx * 3 + i, gy) * 10;
            ctx.strokeStyle = this.adjustColor(colors.left, mortarDark);
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(screen.x - tw, by);
            ctx.lineTo(screen.x, by);
            ctx.stroke();
            if (!isStone) {
                for (let j = 0; j < 4; j++) {
                    const bx = screen.x - tw + offset + j * 8 * z;
                    ctx.beginPath();
                    ctx.moveTo(bx, by);
                    ctx.lineTo(bx, by - brickH);
                    ctx.stroke();
                }
            }
            // Random damage/missing brick patches
            if (this.noise(gx * 5 + i * 11, gy * 3) > 0.82) {
                ctx.fillStyle = this.adjustColor(colors.left, -20);
                const dw = (2 + this.noise(gx + i, gy) * 4) * z;
                const dx = screen.x - tw * 0.6 + this.noise(gx * 2, gy + i) * tw * 0.4;
                ctx.fillRect(dx, by - brickH, dw, brickH);
            }
        }
        // Heavy weathering stains (water damage, rust)
        ctx.fillStyle = `rgba(0,0,0,${0.08 + n * 0.1})`;
        ctx.fillRect(screen.x - tw, screen.y + th - 10 * z, tw, 10 * z);
        // Rust streak
        if (this.noise(gx * 7, gy * 11) > 0.6) {
            ctx.fillStyle = `rgba(80,40,15,${0.06 + n * 0.05})`;
            const rx = screen.x - tw * 0.3;
            ctx.fillRect(rx, screen.y - hOffset + 4 * z, 2 * z, hOffset * 0.6);
        }
        // Crack
        if (this.noise2(gx * 9, gy * 5) > 0.75) {
            ctx.strokeStyle = `rgba(0,0,0,${0.15 + n * 0.1})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            const cx = screen.x - tw * 0.5;
            ctx.moveTo(cx, screen.y - hOffset * 0.2);
            ctx.lineTo(cx + 2 * z, screen.y - hOffset * 0.4);
            ctx.lineTo(cx - z, screen.y - hOffset * 0.6);
            ctx.lineTo(cx + z, screen.y - hOffset * 0.8);
            ctx.stroke();
        }
        ctx.restore();

        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(screen.x - tw, screen.y - hOffset);
        ctx.lineTo(screen.x, screen.y + th - hOffset);
        ctx.lineTo(screen.x, screen.y + th);
        ctx.lineTo(screen.x - tw, screen.y);
        ctx.closePath();
        ctx.stroke();

        // ---- RIGHT FACE (darker, in shadow) ----
        ctx.beginPath();
        ctx.moveTo(screen.x + tw, screen.y - hOffset);
        ctx.lineTo(screen.x, screen.y + th - hOffset);
        ctx.lineTo(screen.x, screen.y + th);
        ctx.lineTo(screen.x + tw, screen.y);
        ctx.closePath();
        ctx.fillStyle = this.adjustColor(colors.right, -5); // slightly darker shadow side
        ctx.fill();

        ctx.save();
        ctx.clip();
        for (let i = 0; i < height * 4; i++) {
            const by = screen.y + th - i * brickH;
            const offset = (i % 2) * 6 * z;
            ctx.strokeStyle = this.adjustColor(colors.right, -12 - this.noise(gx + i * 7, gy * 3) * 10);
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(screen.x, by);
            ctx.lineTo(screen.x + tw, by);
            ctx.stroke();
            if (!isStone) {
                for (let j = 0; j < 4; j++) {
                    const bx = screen.x + offset + j * 8 * z;
                    ctx.beginPath();
                    ctx.moveTo(bx, by);
                    ctx.lineTo(bx, by - brickH);
                    ctx.stroke();
                }
            }
            // Damage patches
            if (this.noise(gx * 3 + i * 13, gy * 7) > 0.84) {
                ctx.fillStyle = this.adjustColor(colors.right, -18);
                const dw = (2 + this.noise(gx + i, gy * 2) * 3) * z;
                const dx = screen.x + tw * 0.2 + this.noise(gx, gy + i * 2) * tw * 0.4;
                ctx.fillRect(dx, by - brickH, dw, brickH);
            }
        }
        // Shadow side is darker
        ctx.fillStyle = `rgba(0,0,0,${0.06 + n * 0.08})`;
        ctx.fillRect(screen.x, screen.y + th - 8 * z, tw, 8 * z);
        // Window frame (on taller walls)
        if (height >= 2 && this.noise(gx * 11, gy * 7) > 0.5) {
            const wy = screen.y - hOffset * 0.45;
            const wx = screen.x + tw * 0.35;
            const ww = 5 * z;
            const wh = 6 * z;
            ctx.fillStyle = '#0A0808';
            ctx.fillRect(wx - ww / 2, wy - wh / 2, ww, wh);
            ctx.strokeStyle = this.adjustColor(colors.right, -20);
            ctx.lineWidth = 1;
            ctx.strokeRect(wx - ww / 2, wy - wh / 2, ww, wh);
            // Cross frame
            ctx.beginPath();
            ctx.moveTo(wx, wy - wh / 2);
            ctx.lineTo(wx, wy + wh / 2);
            ctx.moveTo(wx - ww / 2, wy);
            ctx.lineTo(wx + ww / 2, wy);
            ctx.stroke();
            // Broken glass shard
            if (this.noise2(gx * 13, gy * 11) > 0.4) {
                ctx.fillStyle = `rgba(60,80,90,0.15)`;
                ctx.beginPath();
                ctx.moveTo(wx - ww / 2, wy - wh / 2);
                ctx.lineTo(wx, wy);
                ctx.lineTo(wx - ww / 2, wy);
                ctx.closePath();
                ctx.fill();
            }
        }
        ctx.restore();

        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(screen.x + tw, screen.y - hOffset);
        ctx.lineTo(screen.x, screen.y + th - hOffset);
        ctx.lineTo(screen.x, screen.y + th);
        ctx.lineTo(screen.x + tw, screen.y);
        ctx.closePath();
        ctx.stroke();

        // Exposed rebar on damaged walls
        if (height >= 2 && this.noise3(gx, gy) > 0.7) {
            ctx.strokeStyle = '#5A3020';
            ctx.lineWidth = 0.8 * z;
            const rx = screen.x - tw * 0.2;
            const ry = screen.y - hOffset;
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx + z, ry - 3 * z);
            ctx.lineTo(rx + 2 * z, ry - 2 * z);
            ctx.stroke();
        }
    }

    // ---- DEBRIS / ENVIRONMENTAL CLUTTER ----

    drawDebris(ctx, screen, tw, th, hOff, z, gx, gy, tileType) {
        const debris = this.getDebris(gx, gy);
        if (debris.length === 0) return;
        const cx = screen.x;
        const cy = screen.y - hOff;

        for (const d of debris) {
            const dx = cx + d.ox * tw;
            const dy = cy + d.oy * th;
            const s = d.scale * z;

            switch (d.type) {
                case 'can':
                    // Tin can
                    ctx.fillStyle = `rgba(90,80,60,${0.4 + d.scale * 0.2})`;
                    ctx.fillRect(dx, dy, 3 * s, 2 * s);
                    ctx.fillStyle = `rgba(120,100,70,${0.15})`;
                    ctx.fillRect(dx + 0.5 * s, dy, 2 * s, 0.8 * s);
                    break;
                case 'bone':
                    ctx.strokeStyle = `rgba(180,170,140,${0.3 + d.scale * 0.15})`;
                    ctx.lineWidth = 0.8 * s;
                    ctx.beginPath();
                    ctx.moveTo(dx, dy);
                    ctx.lineTo(dx + 4 * s, dy - s);
                    ctx.stroke();
                    // Knob
                    ctx.fillStyle = `rgba(170,160,130,${0.25})`;
                    ctx.beginPath();
                    ctx.arc(dx, dy, 0.6 * s, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'glass':
                    // Broken glass shard
                    ctx.fillStyle = `rgba(140,160,170,${0.1 + d.scale * 0.08})`;
                    ctx.beginPath();
                    ctx.moveTo(dx, dy);
                    ctx.lineTo(dx + 2 * s, dy - s);
                    ctx.lineTo(dx + 3 * s, dy + s);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 'rebar':
                    ctx.strokeStyle = `rgba(100,50,30,${0.3 + d.scale * 0.1})`;
                    ctx.lineWidth = 0.7 * s;
                    ctx.beginPath();
                    ctx.moveTo(dx, dy);
                    ctx.lineTo(dx + 5 * s, dy - 2 * s);
                    ctx.stroke();
                    break;
                case 'rock':
                    ctx.fillStyle = `rgba(70,65,55,${0.25 + d.scale * 0.15})`;
                    ctx.beginPath();
                    ctx.ellipse(dx, dy, 1.5 * s, 1 * s, d.rot, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'shell':
                    // Bullet casing
                    ctx.fillStyle = `rgba(150,130,60,${0.2 + d.scale * 0.1})`;
                    ctx.fillRect(dx, dy, 1.5 * s, 0.7 * s);
                    break;
                case 'cloth':
                    // Torn cloth/rag
                    ctx.fillStyle = `rgba(80,70,50,${0.15 + d.scale * 0.1})`;
                    ctx.beginPath();
                    ctx.moveTo(dx, dy);
                    ctx.quadraticCurveTo(dx + 2 * s, dy - s, dx + 4 * s, dy + 0.5 * s);
                    ctx.lineTo(dx + 3 * s, dy + 1.5 * s);
                    ctx.quadraticCurveTo(dx + 1 * s, dy + s, dx, dy);
                    ctx.fill();
                    break;
                case 'wire':
                    ctx.strokeStyle = `rgba(60,60,60,${0.2 + d.scale * 0.1})`;
                    ctx.lineWidth = 0.5 * s;
                    ctx.beginPath();
                    ctx.moveTo(dx, dy);
                    ctx.bezierCurveTo(dx + 2 * s, dy - 2 * s, dx + 3 * s, dy + s, dx + 5 * s, dy - s);
                    ctx.stroke();
                    break;
                case 'pipe':
                    ctx.fillStyle = `rgba(80,75,65,${0.3})`;
                    ctx.fillRect(dx, dy, 6 * s, 1.2 * s);
                    ctx.fillStyle = `rgba(60,55,45,${0.2})`;
                    ctx.fillRect(dx, dy + 0.8 * s, 6 * s, 0.4 * s);
                    break;
                case 'bottle':
                    ctx.fillStyle = `rgba(50,80,50,${0.15})`;
                    ctx.beginPath();
                    ctx.ellipse(dx, dy, 1.2 * s, 0.8 * s, d.rot, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillRect(dx + 1 * s, dy - 0.3 * s, 1.5 * s, 0.5 * s);
                    break;
            }
        }

        // Ground decals: oil stains, blood spatters, tire tracks
        const n = this.noise(gx, gy);
        const n2 = this.noise2(gx, gy);

        // Oil stain
        if (n > 0.78 && (tileType === 'road' || tileType === 'stone' || tileType === 'dirt')) {
            ctx.fillStyle = `rgba(15,12,8,${0.12 + n2 * 0.08})`;
            ctx.beginPath();
            ctx.ellipse(cx + (n2 - 0.5) * 6, cy + (n - 0.5) * 4, 5 * z, 3 * z, n * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Blood spatter (rare)
        if (n2 > 0.88 && tileType !== 'water') {
            ctx.fillStyle = `rgba(60,10,5,${0.1 + n * 0.06})`;
            for (let i = 0; i < 3; i++) {
                const bx = cx + (this.noise(gx + i * 19, gy * 3) - 0.5) * tw * 0.5;
                const by = cy + (this.noise(gx * 3, gy + i * 23) - 0.5) * th * 0.5;
                ctx.beginPath();
                ctx.arc(bx, by, (0.5 + this.noise(gx + i, gy) * 1.5) * z, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Tire tracks on roads
        if (tileType === 'road' && n > 0.4 && n < 0.65) {
            ctx.strokeStyle = `rgba(30,28,20,${0.06})`;
            ctx.lineWidth = 1.5 * z;
            ctx.beginPath();
            ctx.moveTo(cx - tw, cy - 2 * z);
            ctx.lineTo(cx + tw, cy - 2 * z);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - tw, cy + 2 * z);
            ctx.lineTo(cx + tw, cy + 2 * z);
            ctx.stroke();
        }
    }

    drawTileTexture(ctx, screen, tw, th, hOff, z, gx, gy, type, n, n2) {
        const cx = screen.x;
        const cy = screen.y - hOff;
        const n3 = this.noise3(gx, gy);

        if (type === 'grass') {
            // Mostly dead, dried grass with rare green patches - Fallout 2 style
            // Large dirt patches first
            ctx.fillStyle = `rgba(60, 48, 28, ${0.2 + n2 * 0.15})`;
            ctx.beginPath();
            ctx.ellipse(cx + (n - 0.5) * 10, cy + (n2 - 0.3) * 6, 7 * z, 3 * z, n * 3, 0, Math.PI * 2);
            ctx.fill();

            const count = 5 + Math.floor(n * 5);
            for (let i = 0; i < count; i++) {
                const nx = this.noise(gx * 11 + i, gy * 7);
                const ny = this.noise(gx * 7, gy * 11 + i);
                const bx = cx + (nx - 0.5) * tw * 1.1;
                const by = cy + (ny - 0.5) * th * 1.1;
                const sway = Math.sin(this.time * 0.015 + gx + i * 0.7) * 0.5 * z;
                const h = (2 + nx * 4) * z;
                // Mostly brown/dead, rarely green
                const alive = this.noise(gx + i * 3, gy + i * 5) > 0.7;
                ctx.strokeStyle = alive
                    ? this.rgbStr(40 + n * 20, 60 + n * 15, 20, 0.45)
                    : this.rgbStr(75 + n * 15, 60 + n * 10, 30, 0.4);
                ctx.lineWidth = 0.7 * z;
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + sway, by - h);
                ctx.stroke();
            }
            // Scattered small rocks
            for (let i = 0; i < 2; i++) {
                const rx = cx + (this.noise(gx * 13 + i, gy * 5) - 0.5) * tw * 0.6;
                const ry = cy + (this.noise(gx * 5, gy * 13 + i) - 0.5) * th * 0.6;
                ctx.fillStyle = `rgba(55,50,40,${0.25})`;
                ctx.beginPath();
                ctx.ellipse(rx, ry, 1.5 * z, z, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (type === 'sand') {
            // Wind-swept dune lines, scattered debris
            ctx.strokeStyle = `rgba(100, 85, 55, ${0.06 + n * 0.05})`;
            ctx.lineWidth = 0.5 * z;
            for (let i = 0; i < 5; i++) {
                const y = cy + (i - 2) * 2.5 * z + n * 2;
                ctx.beginPath();
                ctx.moveTo(cx - tw * 0.6, y);
                ctx.quadraticCurveTo(cx, y - 0.8 * z, cx + tw * 0.6, y + n2 * 0.5 * z);
                ctx.stroke();
            }
            // Pebbles and small stones
            for (let i = 0; i < 4; i++) {
                const sx = cx + (this.noise(gx * 9 + i, gy * 5) - 0.5) * tw * 0.8;
                const sy = cy + (this.noise(gx * 5, gy * 9 + i) - 0.5) * th * 0.8;
                ctx.fillStyle = `rgba(70, 60, 40, ${0.18 + n * 0.1})`;
                ctx.beginPath();
                ctx.ellipse(sx, sy, (0.8 + this.noise(gx + i, gy) * 1.2) * z, 0.6 * z, this.noise(gx * 3, gy + i) * 2, 0, Math.PI * 2);
                ctx.fill();
            }
            // Faded footprints (rare)
            if (n3 > 0.75) {
                ctx.fillStyle = `rgba(80, 65, 42, ${0.05})`;
                ctx.beginPath();
                ctx.ellipse(cx - 2 * z, cy, 1.5 * z, 2.5 * z, 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(cx + 2 * z, cy - 3 * z, 1.5 * z, 2.5 * z, -0.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (type === 'dirt') {
            // Cracked, parched earth with heavy detail
            ctx.strokeStyle = `rgba(40, 30, 12, ${0.14 + n * 0.12})`;
            ctx.lineWidth = 0.7 * z;
            // Main crack network
            if (n > 0.25) {
                ctx.beginPath();
                ctx.moveTo(cx - 5 * z, cy - 2 * z);
                ctx.lineTo(cx + n * 3 * z, cy + n2 * 2 * z);
                ctx.lineTo(cx + 6 * z, cy - n2 * z);
                ctx.stroke();
                // Branch cracks
                ctx.beginPath();
                ctx.moveTo(cx + n * 3 * z, cy + n2 * 2 * z);
                ctx.lineTo(cx + 2 * z, cy + 4 * z);
                ctx.stroke();
            }
            if (n2 > 0.35) {
                ctx.beginPath();
                ctx.moveTo(cx + 3 * z, cy + z);
                ctx.lineTo(cx - 4 * z, cy + 3 * z);
                ctx.lineTo(cx - 6 * z, cy + z);
                ctx.stroke();
            }
            // Pebbles scattered
            for (let i = 0; i < 3; i++) {
                const px = cx + (this.noise(gx * 7 + i, gy * 11) - 0.5) * tw * 0.7;
                const py = cy + (this.noise(gx * 11, gy * 7 + i) - 0.5) * th * 0.7;
                ctx.fillStyle = `rgba(55, 42, 22, ${0.18 + n2 * 0.1})`;
                ctx.fillRect(px, py, 1.5 * z, z);
            }
            // Dried mud texture
            ctx.fillStyle = `rgba(70, 55, 30, ${0.06 + n3 * 0.04})`;
            ctx.beginPath();
            ctx.ellipse(cx + (n - 0.5) * 6, cy - (n3 - 0.5) * 4, 4 * z, 2 * z, n * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        if (type === 'road') {
            // Cracked, potholed asphalt - Fallout 2 roads are broken and decayed
            ctx.strokeStyle = `rgba(25, 22, 15, ${0.18 + n * 0.12})`;
            ctx.lineWidth = 0.8 * z;
            // Major crack
            if (n > 0.3) {
                ctx.beginPath();
                ctx.moveTo(cx - 7 * z, cy - n2 * 2 * z);
                ctx.lineTo(cx - 2 * z, cy + z);
                ctx.lineTo(cx + 5 * z, cy - 0.5 * z);
                ctx.lineTo(cx + 8 * z, cy + n * z);
                ctx.stroke();
            }
            // Secondary cracks
            if (n2 > 0.45) {
                ctx.lineWidth = 0.5 * z;
                ctx.beginPath();
                ctx.moveTo(cx - 3 * z, cy - 3 * z);
                ctx.lineTo(cx + z, cy + 2 * z);
                ctx.stroke();
            }
            // Pothole
            if (n3 > 0.72) {
                ctx.fillStyle = `rgba(20, 18, 12, ${0.15})`;
                ctx.beginPath();
                ctx.ellipse(cx + (n - 0.5) * 8, cy + (n2 - 0.5) * 4, 3 * z, 1.8 * z, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            // Worn center line
            if (n2 > 0.5) {
                ctx.fillStyle = `rgba(140, 120, 50, ${0.04 + n * 0.03})`;
                ctx.fillRect(cx - 1.5 * z, cy - 0.5 * z, 3 * z, z);
            }
        }

        if (type === 'water') {
            // Dark, toxic-looking wasteland water with scum
            const wave = Math.sin(this.time * 0.03 + gx * 2.5 + gy * 1.5) * 0.1 + 0.06;
            ctx.fillStyle = this.rgbStr(25, 50, 65, wave);
            const rx = cx + Math.sin(this.time * 0.02 + gy) * 1.5 * z;
            ctx.beginPath();
            ctx.ellipse(rx, cy, 8 * z, 2.5 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Greenish oil/scum slick
            const sheen = Math.sin(this.time * 0.05 + gx + gy * 2) * 0.03 + 0.04;
            ctx.fillStyle = this.rgbStr(50, 65, 35, sheen);
            ctx.beginPath();
            ctx.ellipse(cx - 3 * z, cy + z, 5 * z, 2 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Surface bubbles (rare)
            if (this.noise(gx + Math.floor(this.time * 0.02), gy) > 0.9) {
                ctx.strokeStyle = `rgba(40,60,70,0.15)`;
                ctx.lineWidth = 0.5 * z;
                ctx.beginPath();
                ctx.arc(cx + (n - 0.5) * 6, cy + (n2 - 0.5) * 3, 1.5 * z, 0, Math.PI * 2);
                ctx.stroke();
            }
            // Floating debris
            if (n > 0.6) {
                const fx = cx + Math.sin(this.time * 0.01 + gx) * 3 * z;
                ctx.fillStyle = `rgba(50,40,25,0.25)`;
                ctx.fillRect(fx - z, cy - 0.3 * z, 2 * z, 0.6 * z);
            }
        }

        if (type === 'wood') {
            // Worn, splintered floorboards
            ctx.strokeStyle = `rgba(30, 22, 5, ${0.18 + n * 0.12})`;
            ctx.lineWidth = 0.6 * z;
            for (let i = 0; i < 5; i++) {
                const y = cy + (i - 2) * 2 * z;
                ctx.beginPath();
                ctx.moveTo(cx - tw * 0.6, y + n * 0.5 * z);
                ctx.lineTo(cx + tw * 0.6, y - n2 * 0.5 * z);
                ctx.stroke();
            }
            // Knots and damage
            if (n > 0.6) {
                ctx.fillStyle = `rgba(28, 18, 4, 0.25)`;
                ctx.beginPath();
                ctx.arc(cx + 3 * z, cy - z, 1.5 * z, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (type === 'door') {
            // Heavy reinforced door - Fallout 2 style with metal bands
            ctx.strokeStyle = 'rgba(20, 10, 0, 0.25)';
            ctx.lineWidth = 0.7 * z;
            // Vertical planks
            for (let i = -1; i <= 1; i++) {
                const dx = cx + i * 3.5 * z;
                ctx.beginPath();
                ctx.moveTo(dx, cy - th * 0.7);
                ctx.lineTo(dx, cy + th * 0.7);
                ctx.stroke();
            }
            // Horizontal metal bands
            ctx.strokeStyle = `rgba(60,55,45,0.3)`;
            ctx.lineWidth = 1.2 * z;
            ctx.beginPath();
            ctx.moveTo(cx - tw * 0.3, cy - 2 * z);
            ctx.lineTo(cx + tw * 0.3, cy - 2 * z);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - tw * 0.3, cy + 2 * z);
            ctx.lineTo(cx + tw * 0.3, cy + 2 * z);
            ctx.stroke();
            // Handle/knob
            ctx.fillStyle = '#554433';
            ctx.beginPath();
            ctx.arc(cx + 4 * z, cy, 1.4 * z, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#332211';
            ctx.lineWidth = 0.6;
            ctx.stroke();
            // Rust on handle
            ctx.fillStyle = `rgba(100,50,20,0.15)`;
            ctx.beginPath();
            ctx.arc(cx + 4 * z, cy + 0.5 * z, z, 0, Math.PI * 2);
            ctx.fill();
        }

        if (type === 'cave_floor') {
            // Dark, grimy cave floor with puddles and bones
            for (let i = 0; i < 5; i++) {
                const px = cx + (this.noise(gx * 5 + i, gy * 9) - 0.5) * tw * 0.8;
                const py = cy + (this.noise(gx * 9 + i, gy * 5) - 0.5) * th * 0.8;
                ctx.fillStyle = `rgba(45, 38, 30, ${0.2 + n * 0.15})`;
                ctx.beginPath();
                ctx.ellipse(px, py, (0.8 + n * 1) * z, (0.5 + n2 * 0.5) * z, this.noise(gx + i, gy) * 3, 0, Math.PI * 2);
                ctx.fill();
            }
            // Moisture/puddle stains
            if (n > 0.55) {
                ctx.fillStyle = `rgba(20, 22, 28, 0.12)`;
                ctx.beginPath();
                ctx.ellipse(cx + (n2 - 0.5) * 4, cy, 6 * z, 2.5 * z, n2 * 2, 0, Math.PI * 2);
                ctx.fill();
                // Reflection highlight
                ctx.fillStyle = `rgba(40,45,55,0.04)`;
                ctx.beginPath();
                ctx.ellipse(cx + (n2 - 0.5) * 4, cy - z, 3 * z, z, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            // Small bone fragment
            if (n3 > 0.7) {
                ctx.strokeStyle = `rgba(140,130,100,0.2)`;
                ctx.lineWidth = 0.6 * z;
                ctx.beginPath();
                ctx.moveTo(cx + 2 * z, cy);
                ctx.lineTo(cx + 5 * z, cy - z);
                ctx.stroke();
            }
        }

        if (type === 'crystal') {
            const glow = 0.12 + Math.sin(this.time * 0.04 + gx + gy) * 0.08;
            // Crystal shards - slightly muted for Fallout 2 look
            ctx.fillStyle = this.rgbStr(50, 120, 140, glow + 0.12);
            ctx.beginPath();
            ctx.moveTo(cx - 2 * z, cy + 2 * z);
            ctx.lineTo(cx, cy - 6 * z);
            ctx.lineTo(cx + 2 * z, cy + 2 * z);
            ctx.closePath();
            ctx.fill();
            // Second shard
            ctx.fillStyle = this.rgbStr(60, 130, 150, glow + 0.08);
            ctx.beginPath();
            ctx.moveTo(cx + z, cy + z);
            ctx.lineTo(cx + 3 * z, cy - 4 * z);
            ctx.lineTo(cx + 4 * z, cy + z);
            ctx.closePath();
            ctx.fill();
            // Shard outline
            ctx.strokeStyle = this.rgbStr(30, 80, 100, 0.3);
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(cx - 2 * z, cy + 2 * z);
            ctx.lineTo(cx, cy - 6 * z);
            ctx.lineTo(cx + 2 * z, cy + 2 * z);
            ctx.closePath();
            ctx.stroke();
            // Subtle glow aura
            ctx.fillStyle = this.rgbStr(60, 120, 150, glow * 0.25);
            ctx.beginPath();
            ctx.arc(cx, cy - z, 8 * z, 0, Math.PI * 2);
            ctx.fill();
        }

        if (type === 'lava') {
            // Molten, bubbling lava
            const pulse = Math.sin(this.time * 0.06 + gx * 3 + gy * 2) * 0.1 + 0.15;
            ctx.fillStyle = this.rgbStr(180, 80, 10, pulse);
            ctx.beginPath();
            ctx.ellipse(cx, cy, 7 * z, 3 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Hot spots
            ctx.fillStyle = this.rgbStr(200, 120, 20, pulse * 0.6);
            ctx.beginPath();
            ctx.ellipse(cx + (n - 0.5) * 5, cy + (n2 - 0.5) * 2, 3 * z, 1.5 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Dark crusted edges
            ctx.fillStyle = `rgba(40,10,0,${0.15 + n * 0.1})`;
            for (let i = 0; i < 3; i++) {
                const lx = cx + (this.noise(gx + i * 5, gy) - 0.5) * tw * 0.8;
                const ly = cy + (this.noise(gx, gy + i * 7) - 0.5) * th * 0.8;
                ctx.beginPath();
                ctx.ellipse(lx, ly, 2 * z, z, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (type === 'cave_wall' || type === 'cave_rock') {
            // Rough stone texture
            for (let i = 0; i < 4; i++) {
                const px = cx + (this.noise(gx * 7 + i, gy * 3) - 0.5) * tw * 0.7;
                const py = cy + (this.noise(gx * 3, gy * 7 + i) - 0.5) * th * 0.7;
                ctx.fillStyle = `rgba(50, 44, 36, ${0.15 + n * 0.1})`;
                ctx.beginPath();
                ctx.ellipse(px, py, (1 + n2) * z, (0.6 + n) * z, this.noise(gx * 2 + i, gy) * 3, 0, Math.PI * 2);
                ctx.fill();
            }
            // Mineral veins
            if (n > 0.65) {
                ctx.strokeStyle = `rgba(60, 55, 45, 0.12)`;
                ctx.lineWidth = 0.5 * z;
                ctx.beginPath();
                ctx.moveTo(cx - 4 * z, cy);
                ctx.quadraticCurveTo(cx, cy - 2 * z, cx + 5 * z, cy + z);
                ctx.stroke();
            }
        }

        if (type === 'stone') {
            // Flagstone pattern
            ctx.strokeStyle = `rgba(30, 28, 24, ${0.12 + n * 0.08})`;
            ctx.lineWidth = 0.6 * z;
            if (n > 0.3) {
                ctx.beginPath();
                ctx.moveTo(cx - 5 * z, cy + z);
                ctx.lineTo(cx + 4 * z, cy - z);
                ctx.stroke();
            }
            if (n2 > 0.4) {
                ctx.beginPath();
                ctx.moveTo(cx + z, cy - 3 * z);
                ctx.lineTo(cx - z, cy + 3 * z);
                ctx.stroke();
            }
            // Worn smooth spots
            ctx.fillStyle = `rgba(70,68,62,${0.06})`;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 4 * z, 2 * z, n * 2, 0, Math.PI * 2);
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

    // ---- ENTITY RENDERING (Fallout 2 style) ----

    drawEntity(gx, gy, entityType, facing = 'south', isSelected = false, hp = null, maxHp = null) {
        const screen = this.worldToScreen(gx, gy);
        const ctx = this.ctx;
        const z = this.camera.zoom;

        // Entity shadow (darker, more defined than before)
        if (entityType !== 'chest' && entityType !== 'crate' && entityType !== 'bones') {
            const isSmall = ['rat', 'scorpion', 'cave_spider'].includes(entityType);
            const isMutant = entityType === 'mutant';
            const sw = (isSmall ? 8 : isMutant ? 12 : 9) * z;
            const sh = (isSmall ? 3 : isMutant ? 5 : 4) * z;
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            ctx.ellipse(screen.x + 2 * z, screen.y + z, sw, sh, 0.2, 0, Math.PI * 2);
            ctx.fill();
        }

        if (isSelected) {
            this.drawTileHighlight(gx, gy, 'rgba(60, 140, 60, 0.15)', 'rgba(80, 160, 80, 0.4)');
        }

        // Environmental objects (trees, ruins, wreckage, etc.)
        const envTypes = ['dead_tree','ruins','wreckage','building','cactus','rock_formation','campfire','signpost'];
        if (envTypes.includes(entityType)) {
            const sprites = this._envSprites[entityType];
            if (sprites && sprites.length > 0) {
                // Use hash of position for deterministic variant
                const variant = ((gx * 7 + gy * 13) & 0x7FFFFFFF) % sprites.length;
                const sprite = sprites[variant];
                const sw = sprite.width * z;
                const sh = sprite.height * z;
                ctx.drawImage(sprite, screen.x - sw / 2, screen.y - sh + 6 * z, sw, sh);
            }
            return;
        }

        if (entityType === 'chest' || entityType === 'crate') {
            // Use pre-rendered container sprite
            const sprite = this._containerSprites[entityType];
            if (sprite) {
                const sw = sprite.width * z;
                const sh = sprite.height * z;
                ctx.drawImage(sprite, screen.x - sw / 2, screen.y - sh + 5 * z, sw, sh);
            } else {
                this.drawContainer(ctx, screen, z, entityType);
            }
            return;
        }

        if (entityType === 'bones') {
            // Use pre-rendered bones sprite
            if (this._bonesSprite) {
                const sprite = this._bonesSprite;
                const sw = sprite.width * z;
                const sh = sprite.height * z;
                ctx.drawImage(sprite, screen.x - sw / 2, screen.y - sh / 2 - 2 * z, sw, sh);
            } else {
                this.drawBones(ctx, screen, z);
            }
            return;
        }

        if (['rat', 'scorpion', 'cave_spider'].includes(entityType)) {
            // Use pre-rendered creature sprite (directional)
            const spriteSet = this._creatureSprites[entityType];
            if (spriteSet && spriteSet[facing]) {
                const sprites = spriteSet[facing];
                const sprite = sprites[this.animationFrame % sprites.length];
                const sw = sprite.width * z;
                const sh = sprite.height * z;
                ctx.drawImage(sprite, screen.x - sw / 2, screen.y - sh + 10 * z, sw, sh);
            } else {
                this.drawCreature(ctx, screen, z, entityType);
            }
        } else {
            // Use pre-rendered humanoid sprite (directional)
            const spriteSet = this._humanoidSprites[entityType];
            if (spriteSet && spriteSet[facing]) {
                const sprites = spriteSet[facing];
                const sprite = sprites[this.animationFrame % sprites.length];
                const sw = sprite.width * z;
                const sh = sprite.height * z;
                ctx.drawImage(sprite, screen.x - sw / 2, screen.y - sh + 4 * z, sw, sh);
            } else {
                this.drawHumanoid(ctx, screen, z, entityType, facing);
            }
        }

        // HP bar - Fallout 2 style (muted green/red, bordered)
        if (hp !== null && maxHp !== null && (hp < maxHp || entityType !== 'player')) {
            const isSmall = ['rat', 'scorpion', 'cave_spider'].includes(entityType);
            const barW = 24 * z;
            const barH = 3 * z;
            const barY = screen.y - (isSmall ? 20 : 40) * z;

            // Dark background with border
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(screen.x - barW/2 - 1.5, barY - 1.5, barW + 3, barH + 3);
            ctx.strokeStyle = 'rgba(80,70,50,0.6)';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(screen.x - barW/2 - 1.5, barY - 1.5, barW + 3, barH + 3);

            const hpRatio = hp / maxHp;
            // Fallout-style: muted olive-green to dull red
            const r = Math.min(200, Math.floor(160 * (1 - hpRatio) + 60));
            const g = Math.floor(120 * hpRatio + 20);
            ctx.fillStyle = this.rgbStr(r, g, 15);
            ctx.fillRect(screen.x - barW/2, barY, barW * hpRatio, barH);

            // Pip notches (Fallout style)
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 0.5;
            for (let i = 1; i < 5; i++) {
                const nx = screen.x - barW/2 + (barW/5) * i;
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
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(x + z, y + z, 9 * z, 3.5 * z, 0.1, 0, Math.PI * 2);
        ctx.fill();

        if (type === 'chest') {
            // Military footlocker / pre-war chest
            const bw = 15 * z, bh = 11 * z;
            const by = y - bh - 2 * z;
            // Base
            ctx.fillStyle = '#3E2C0A';
            ctx.fillRect(x - bw/2, by + 3 * z, bw, bh - 3 * z);
            // Lid
            ctx.fillStyle = '#4A3812';
            ctx.fillRect(x - bw/2, by, bw, 4 * z);
            // Metal bands (heavier, rustier)
            ctx.fillStyle = '#3A3530';
            ctx.fillRect(x - bw/2, by + 3.5 * z, bw, 1.5 * z);
            ctx.fillRect(x - 1.2 * z, by, 2.4 * z, bh);
            // Rust on metal
            ctx.fillStyle = 'rgba(90,40,15,0.2)';
            ctx.fillRect(x - bw/2, by + 3.5 * z, bw * 0.4, 1.5 * z);
            // Corner brackets
            ctx.fillStyle = '#444038';
            ctx.fillRect(x - bw/2, by, 2.5 * z, 2.5 * z);
            ctx.fillRect(x + bw/2 - 2.5 * z, by, 2.5 * z, 2.5 * z);
            ctx.fillRect(x - bw/2, by + bh - 2 * z, 2.5 * z, 2 * z);
            ctx.fillRect(x + bw/2 - 2.5 * z, by + bh - 2 * z, 2.5 * z, 2 * z);
            // Lock (heavy padlock)
            ctx.fillStyle = '#555048';
            ctx.fillRect(x - 2 * z, by + 4 * z, 4 * z, 2.5 * z);
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(x, by + 5.5 * z, 0.6 * z, 0, Math.PI * 2);
            ctx.fill();
            // Outline
            ctx.strokeStyle = '#1E1200';
            ctx.lineWidth = 1;
            ctx.strokeRect(x - bw/2, by, bw, bh);
            // Wear/scuff marks
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(x - bw/2, by + bh - 4 * z, bw, 4 * z);
            // Scratch marks
            ctx.strokeStyle = 'rgba(80,60,30,0.1)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(x - 4 * z, by + 6 * z);
            ctx.lineTo(x + 2 * z, by + 8 * z);
            ctx.stroke();
        } else {
            // Wooden supply crate
            const bw = 13 * z, bh = 12 * z;
            const by = y - bh - 2 * z;
            ctx.fillStyle = '#402C06';
            ctx.fillRect(x - bw/2, by, bw, bh);
            // Wood slats with gaps
            ctx.strokeStyle = '#2A1E00';
            ctx.lineWidth = 0.8;
            for (let i = 1; i < 5; i++) {
                ctx.beginPath();
                ctx.moveTo(x - bw/2, by + (bh/5) * i);
                ctx.lineTo(x + bw/2, by + (bh/5) * i);
                ctx.stroke();
            }
            // Vertical reinforcement
            ctx.strokeStyle = '#2A1E00';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(x, by);
            ctx.lineTo(x, by + bh);
            ctx.stroke();
            // Nails (rusty)
            ctx.fillStyle = '#5A4A38';
            const nailPositions = [[x - bw/2 + 2*z, by + 2*z], [x + bw/2 - 2*z, by + 2*z],
                                   [x - bw/2 + 2*z, by + bh - 2*z], [x + bw/2 - 2*z, by + bh - 2*z],
                                   [x, by + 2*z], [x, by + bh - 2*z]];
            for (const [nx, ny] of nailPositions) {
                ctx.fillRect(nx - 0.5*z, ny - 0.5*z, z, z);
            }
            // Stenciled marking (faded)
            ctx.fillStyle = 'rgba(100,90,60,0.08)';
            ctx.fillRect(x - 3 * z, by + bh * 0.35, 6 * z, 3 * z);
            ctx.strokeStyle = '#1E1200';
            ctx.lineWidth = 1;
            ctx.strokeRect(x - bw/2, by, bw, bh);
            // Damage/splintering
            ctx.fillStyle = 'rgba(60,45,15,0.15)';
            ctx.fillRect(x + bw/2 - 3 * z, by + 2 * z, 2 * z, 4 * z);
        }
    }

    drawBones(ctx, screen, z) {
        const x = screen.x;
        const y = screen.y;
        // Larger, grimmer bone pile - Fallout 2 skeletal remains
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(x, y, 8 * z, 3.5 * z, 0, 0, Math.PI * 2);
        ctx.fill();
        // Ribcage/spine fragments scattered
        ctx.strokeStyle = '#8A7E60';
        ctx.lineWidth = 1.2 * z;
        ctx.lineCap = 'round';
        // Scattered long bones
        ctx.beginPath();
        ctx.moveTo(x - 7 * z, y - z);
        ctx.lineTo(x + 5 * z, y + 2 * z);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 4 * z, y - 2 * z);
        ctx.lineTo(x - 5 * z, y + z);
        ctx.stroke();
        // Smaller fragments
        ctx.lineWidth = 0.8 * z;
        ctx.strokeStyle = '#7A6E50';
        ctx.beginPath();
        ctx.moveTo(x - 3 * z, y + 2 * z);
        ctx.lineTo(x + z, y + 3 * z);
        ctx.stroke();
        ctx.lineCap = 'butt';
        // Skull (yellowed, cracked)
        ctx.fillStyle = '#908060';
        ctx.beginPath();
        ctx.ellipse(x + z, y - 3 * z, 3.8 * z, 3.2 * z, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#605840';
        ctx.lineWidth = 0.7;
        ctx.stroke();
        // Skull crack
        ctx.strokeStyle = '#504830';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x + z, y - 5.5 * z);
        ctx.lineTo(x + 2 * z, y - 3 * z);
        ctx.lineTo(x + 0.5 * z, y - 2 * z);
        ctx.stroke();
        // Eye sockets (darker, deeper)
        ctx.fillStyle = '#100A04';
        ctx.beginPath();
        ctx.ellipse(x - 0.5 * z, y - 3.8 * z, 1.2 * z, 1 * z, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 2.5 * z, y - 3.8 * z, 1.2 * z, 1 * z, 0, 0, Math.PI * 2);
        ctx.fill();
        // Nose cavity
        ctx.fillStyle = '#1A1208';
        ctx.beginPath();
        ctx.moveTo(x + z, y - 2.8 * z);
        ctx.lineTo(x + 0.5 * z, y - 2 * z);
        ctx.lineTo(x + 1.5 * z, y - 2 * z);
        ctx.closePath();
        ctx.fill();
        // Jaw fragment nearby
        ctx.strokeStyle = '#8A7E60';
        ctx.lineWidth = z;
        ctx.beginPath();
        ctx.arc(x + z, y - z, 2 * z, 0.3, Math.PI - 0.3);
        ctx.stroke();
    }

    drawCreature(ctx, screen, z, type) {
        const x = screen.x;
        const y = screen.y;
        const t = this.time;

        if (type === 'rat') {
            // Giant mutant rat - Fallout 2 style (larger, mangy, diseased)
            const bob = 0;
            // Body (darker, more mangy)
            ctx.fillStyle = '#423424';
            ctx.beginPath();
            ctx.ellipse(x, y - 5 * z + bob, 7 * z, 4 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Patchy fur (mange)
            ctx.fillStyle = '#362818';
            ctx.beginPath();
            ctx.ellipse(x - z, y - 5 * z + bob, 3.5 * z, 2.5 * z, 0.3, 0, Math.PI * 2);
            ctx.fill();
            // Bare skin patches (diseased)
            ctx.fillStyle = '#5A4838';
            ctx.beginPath();
            ctx.ellipse(x + 2 * z, y - 4 * z + bob, 2 * z, 1.5 * z, 0.5, 0, Math.PI * 2);
            ctx.fill();
            // Head
            ctx.fillStyle = '#504030';
            ctx.beginPath();
            ctx.ellipse(x + 5.5 * z, y - 6 * z + bob, 3.5 * z, 2.8 * z, 0.3, 0, Math.PI * 2);
            ctx.fill();
            // Snout (longer, more pointed)
            ctx.fillStyle = '#5A4838';
            ctx.beginPath();
            ctx.ellipse(x + 8.5 * z, y - 6 * z + bob, 1.5 * z, 1.2 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Teeth
            ctx.fillStyle = '#AA9960';
            ctx.fillRect(x + 9.5 * z, y - 6.5 * z + bob, 0.6 * z, 1.2 * z);
            ctx.fillRect(x + 9.5 * z, y - 5.5 * z + bob, 0.6 * z, 0.8 * z);
            // Eyes (glowing, radioactive)
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(x + 6.5 * z, y - 7.2 * z + bob, 0.9 * z, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#CC3300';
            ctx.beginPath();
            ctx.arc(x + 6.3 * z, y - 7.4 * z + bob, 0.4 * z, 0, Math.PI * 2);
            ctx.fill();
            // Ears (tattered)
            ctx.fillStyle = '#5A4030';
            ctx.beginPath();
            ctx.ellipse(x + 3.5 * z, y - 9.5 * z + bob, 1.8 * z, 2.2 * z, -0.3, 0, Math.PI * 2);
            ctx.fill();
            // Notch in ear
            ctx.fillStyle = '#423424';
            ctx.fillRect(x + 3 * z, y - 11 * z + bob, 1.5 * z, z);
            // Tail (thicker, segmented)
            ctx.strokeStyle = '#504030';
            ctx.lineWidth = 1.2 * z;
            ctx.beginPath();
            ctx.moveTo(x - 7 * z, y - 5 * z + bob);
            ctx.quadraticCurveTo(x - 11 * z, y - 9 * z, x - 9 * z, y - 13 * z + bob);
            ctx.stroke();
            // Outline
            ctx.strokeStyle = '#2A1C10';
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.ellipse(x, y - 5 * z + bob, 7 * z, 4 * z, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (type === 'scorpion') {
            // Radscorpion - Fallout 2 style (armored, menacing)
            const bob = 0;
            // Body (darker carapace)
            ctx.fillStyle = '#4A2808';
            ctx.beginPath();
            ctx.ellipse(x, y - 4 * z + bob, 8 * z, 4.5 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Segmented armor plates
            ctx.fillStyle = '#5A3418';
            ctx.beginPath();
            ctx.ellipse(x - z, y - 5 * z + bob, 4.5 * z, 3 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#503020';
            ctx.beginPath();
            ctx.ellipse(x + 2 * z, y - 4 * z + bob, 3 * z, 2 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Chitin segment lines
            ctx.strokeStyle = '#3A1C08';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(x - 3 * z, y - 4 * z + bob);
            ctx.lineTo(x + z, y - 4 * z + bob);
            ctx.stroke();
            // Head
            ctx.fillStyle = '#604020';
            ctx.beginPath();
            ctx.ellipse(x + 6.5 * z, y - 5 * z + bob, 3.5 * z, 2.8 * z, 0.2, 0, Math.PI * 2);
            ctx.fill();
            // Mandibles
            ctx.fillStyle = '#3A2010';
            ctx.beginPath();
            ctx.moveTo(x + 9 * z, y - 5 * z + bob);
            ctx.lineTo(x + 10.5 * z, y - 6 * z + bob);
            ctx.lineTo(x + 10 * z, y - 4.5 * z + bob);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x + 9 * z, y - 5 * z + bob);
            ctx.lineTo(x + 10.5 * z, y - 4 * z + bob);
            ctx.lineTo(x + 10 * z, y - 5.5 * z + bob);
            ctx.closePath();
            ctx.fill();
            // Pincers (heavier, more menacing)
            ctx.strokeStyle = '#4A2808';
            ctx.lineWidth = 2.2 * z;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x + 8 * z, y - 6.5 * z + bob);
            ctx.lineTo(x + 13 * z, y - 10 * z + bob);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 13 * z, y - 10 * z + bob);
            ctx.lineTo(x + 10.5 * z, y - 7.5 * z + bob);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 8 * z, y - 3 * z + bob);
            ctx.lineTo(x + 13 * z, y - 0.5 * z + bob);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 13 * z, y - 0.5 * z + bob);
            ctx.lineTo(x + 10.5 * z, y - 3 * z + bob);
            ctx.stroke();
            ctx.lineCap = 'butt';
            // Tail segments (darker, more armored)
            ctx.strokeStyle = '#5A3418';
            ctx.lineWidth = 3 * z;
            ctx.beginPath();
            ctx.moveTo(x - 7 * z, y - 4 * z + bob);
            ctx.quadraticCurveTo(x - 11 * z, y - 11 * z, x - 9 * z, y - 17 * z + bob);
            ctx.quadraticCurveTo(x - 7 * z, y - 19 * z, x - 5.5 * z, y - 18 * z + bob);
            ctx.stroke();
            // Tail segment lines
            ctx.strokeStyle = '#3A1C08';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < 4; i++) {
                const ty = y - 6 * z - i * 3 * z + bob;
                const tx = x - 8 * z - i * 0.5 * z;
                ctx.beginPath();
                ctx.arc(tx, ty, 1.5 * z, 0, Math.PI * 2);
                ctx.stroke();
            }
            // Stinger (muted poisonous green)
            ctx.fillStyle = '#607A18';
            ctx.beginPath();
            ctx.moveTo(x - 5.5 * z, y - 18 * z + bob);
            ctx.lineTo(x - 4.5 * z, y - 21 * z + bob);
            ctx.lineTo(x - 6.5 * z, y - 19 * z + bob);
            ctx.closePath();
            ctx.fill();
            // Venom drip (muted)
            ctx.fillStyle = this.rgbStr(80, 120, 20, 0.2 + Math.sin(t * 0.1) * 0.1);
            ctx.beginPath();
            ctx.arc(x - 4.5 * z, y - 21 * z + bob + Math.sin(t * 0.08) * z, 0.8 * z, 0, Math.PI * 2);
            ctx.fill();
            // Eyes (dark red)
            ctx.fillStyle = '#AA2200';
            ctx.beginPath();
            ctx.arc(x + 7.5 * z, y - 6 * z + bob, 0.9 * z, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#661100';
            ctx.beginPath();
            ctx.arc(x + 7.5 * z, y - 6 * z + bob, 0.4 * z, 0, Math.PI * 2);
            ctx.fill();
            // Legs (jointed, chitin-covered)
            ctx.strokeStyle = '#3A1C08';
            ctx.lineWidth = 1 * z;
            for (let i = 0; i < 4; i++) {
                const lx = x - 3 * z + i * 3 * z;
                const sway = Math.sin(t * 0.1 + i * 1.5) * 0.8 * z;
                // Left leg (jointed)
                ctx.beginPath();
                ctx.moveTo(lx, y - 2 * z + bob);
                ctx.lineTo(lx - 2.5 * z, y - 4 * z + bob);
                ctx.lineTo(lx - 5 * z + sway, y + 1.5 * z);
                ctx.stroke();
                // Right leg (jointed)
                ctx.beginPath();
                ctx.moveTo(lx, y - 2 * z + bob);
                ctx.lineTo(lx + 2.5 * z, y - 4 * z + bob);
                ctx.lineTo(lx + 5 * z - sway, y + 1.5 * z);
                ctx.stroke();
            }
            // Outline
            ctx.strokeStyle = '#2A1404';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.ellipse(x, y - 4 * z + bob, 8 * z, 4.5 * z, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (type === 'cave_spider') {
            // Giant cave spider - darker, more menacing
            const bob = 0;
            // Abdomen (darker)
            ctx.fillStyle = '#181418';
            ctx.beginPath();
            ctx.ellipse(x - z, y - 5 * z + bob, 6 * z, 4.5 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Pattern on abdomen (subtle hourglass)
            ctx.fillStyle = '#282024';
            ctx.beginPath();
            ctx.moveTo(x - z, y - 8.5 * z + bob);
            ctx.lineTo(x + 2 * z, y - 5 * z + bob);
            ctx.lineTo(x - z, y - 1.5 * z + bob);
            ctx.lineTo(x - 4 * z, y - 5 * z + bob);
            ctx.closePath();
            ctx.fill();
            // Reddish warning pattern
            ctx.fillStyle = 'rgba(100,20,10,0.2)';
            ctx.beginPath();
            ctx.ellipse(x - z, y - 5 * z + bob, 2 * z, 1.5 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Cephalothorax
            ctx.fillStyle = '#201C20';
            ctx.beginPath();
            ctx.ellipse(x + 4.5 * z, y - 6.5 * z + bob, 3.5 * z, 2.8 * z, 0, 0, Math.PI * 2);
            ctx.fill();
            // Eyes (cluster of dark red dots)
            const eyePositions = [[-0.5, -1], [0.5, -1], [-1, -0.3], [1, -0.3], [0, -1.5], [-0.3, 0], [0.3, 0], [0, -0.6]];
            ctx.fillStyle = '#881100';
            for (const [ex, ey] of eyePositions) {
                ctx.beginPath();
                ctx.arc(x + 6 * z + ex * z, y - 7.5 * z + ey * z + bob, 0.45 * z, 0, Math.PI * 2);
                ctx.fill();
            }
            // Fangs (chelicerae - larger, dripping)
            ctx.strokeStyle = '#3A3530';
            ctx.lineWidth = 1.4 * z;
            ctx.beginPath();
            ctx.moveTo(x + 6 * z, y - 5 * z + bob);
            ctx.lineTo(x + 7 * z, y - 3.5 * z + bob);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 5 * z, y - 5 * z + bob);
            ctx.lineTo(x + 4 * z, y - 3.5 * z + bob);
            ctx.stroke();
            // Legs (8 jointed legs - darker, hairier)
            ctx.strokeStyle = '#121012';
            ctx.lineWidth = 0.9 * z;
            for (let i = 0; i < 4; i++) {
                const lx = x - 2 * z + i * 2.5 * z;
                const sway = Math.sin(t * 0.14 + i * 1.3) * 1.2 * z;
                const midY = y - 10 * z + bob;
                // Left
                ctx.beginPath();
                ctx.moveTo(lx, y - 4.5 * z + bob);
                ctx.lineTo(lx - 5.5 * z, midY);
                ctx.lineTo(lx - 8 * z + sway, y + z);
                ctx.stroke();
                // Right
                ctx.beginPath();
                ctx.moveTo(lx, y - 4.5 * z + bob);
                ctx.lineTo(lx + 5.5 * z, midY);
                ctx.lineTo(lx + 8 * z - sway, y + z);
                ctx.stroke();
            }
            // Leg hair tufts
            ctx.strokeStyle = '#1A1418';
            ctx.lineWidth = 0.3 * z;
            for (let i = 0; i < 4; i++) {
                const hx = x - 2 * z + i * 2.5 * z - 3 * z;
                const hy = y - 7 * z + bob;
                ctx.beginPath();
                ctx.moveTo(hx, hy);
                ctx.lineTo(hx - z, hy - z);
                ctx.stroke();
            }
            // Abdomen outline
            ctx.strokeStyle = '#0E0A0E';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.ellipse(x - z, y - 5 * z + bob, 6 * z, 4.5 * z, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    drawHumanoid(ctx, screen, z, type, facing) {
        const x = screen.x;
        const y = screen.y;
        const t = this.time;
        const bob = 0;
        const isMutant = type === 'mutant';
        const sc = isMutant ? 1.4 : 1;

        // Fallout 2 palette: very desaturated, muted, dark
        const palettes = {
            'player':  { skin: '#9A8058', shirt: '#6A5020', pants: '#3A2C18', boots: '#201408', hair: '#2A1C10', belt: '#2E2008', accent: '#887030' },
            'villager':{ skin: '#907860', shirt: '#505A62', pants: '#2E2E2E', boots: '#1A1A1A', hair: '#443828', belt: '#282828', accent: '#404850' },
            'merchant':{ skin: '#907860', shirt: '#6A5028', pants: '#2E2418', boots: '#201408', hair: '#3A2C1C', belt: '#342418', accent: '#887040' },
            'elder':   { skin: '#907860', shirt: '#4A3060', pants: '#201830', boots: '#140C18', hair: '#888888', belt: '#2A2038', accent: '#604880' },
            'guard':   { skin: '#907860', shirt: '#3A5020', pants: '#222E14', boots: '#141408', hair: '#2A1C10', belt: '#2E2E18', accent: '#4A5830' },
            'raider':  { skin: '#887058', shirt: '#4A1210', pants: '#200C0C', boots: '#140808', hair: '#1A1A1A', belt: '#381818', accent: '#601818' },
            'mutant':  { skin: '#406A14', shirt: '#2A4408', pants: '#1E2E04', boots: '#142000', hair: '#386008', belt: '#2A3808', accent: '#4A8018' },
        };
        const p = palettes[type] || palettes['villager'];

        // Shadow (already drawn in drawEntity, skip duplicate)

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
        const pulse = 0.1 + Math.sin(this.time * 0.04) * 0.06;

        this.drawTileHighlight(gx, gy,
            `rgba(50, 80, 120, ${pulse})`,
            'rgba(50, 80, 120, 0.35)'
        );

        const arrowY = screen.y - 10 * z + Math.sin(this.time * 0.06) * 2 * z;
        ctx.fillStyle = '#3A6088';
        ctx.beginPath();
        ctx.moveTo(screen.x, arrowY - 4 * z);
        ctx.lineTo(screen.x + 3 * z, arrowY);
        ctx.lineTo(screen.x - 3 * z, arrowY);
        ctx.closePath();
        ctx.fill();

        ctx.font = `bold ${9 * z}px 'Courier New'`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2.5;
        ctx.strokeText(label, screen.x, arrowY - 6 * z);
        ctx.fillStyle = '#607890';
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
                p.life = Math.random() * 400 + 150;
                p.alpha = Math.random() * 0.12 + 0.02;
                p.type = Math.random() > 0.7 ? 'ash' : 'dust';
            }

            const sx = (p.x - camX) * z + cw / 2;
            const sy = (p.y - camY) * z + ch / 2;

            if (sx < -10 || sx > cw + 10 || sy < -10 || sy > ch + 10) continue;

            const fade = Math.min(1, p.life / 60);
            if (p.type === 'ash') {
                // Ash particles: lighter, float more
                ctx.fillStyle = this.rgbStr(120, 110, 90, p.alpha * fade * 0.7);
                ctx.beginPath();
                ctx.ellipse(sx, sy, p.size * z * 0.8, p.size * z * 0.3, p.x * 0.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Dust particles: brownish, rectangular
                ctx.fillStyle = this.rgbStr(110, 90, 60, p.alpha * fade);
                ctx.fillRect(sx, sy, p.size * z, p.size * z * 0.5);
            }
        }
    }

    // Heavy vignette for Fallout 2 atmosphere
    drawVignette(ctx, strength = 0.5) {
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const grad = ctx.createRadialGradient(
            cw / 2, ch / 2, Math.min(cw, ch) * 0.15,
            cw / 2, ch / 2, Math.max(cw, ch) * 0.65
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, `rgba(0,0,0,${strength * 0.15})`);
        grad.addColorStop(1, `rgba(0,0,0,${strength})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cw, ch);
    }

    // Film grain effect - Fallout 2's pre-rendered look
    drawFilmGrain(ctx) {
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        // Scanline effect (subtle)
        if (this.time % 2 === 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.015)';
            for (let y = 0; y < ch; y += 3) {
                ctx.fillRect(0, y, cw, 1);
            }
        }
        // Random grain speckles
        const grainCount = 20;
        for (let i = 0; i < grainCount; i++) {
            const gx = (this.noiseSeed[(this.time * 3 + i * 7) & 1023]) * cw;
            const gy = (this.noiseSeed[(this.time * 5 + i * 11 + 100) & 1023]) * ch;
            const bright = this.noiseSeed[(this.time + i * 13 + 200) & 1023] > 0.5;
            ctx.fillStyle = bright ? `rgba(255,240,200,0.015)` : `rgba(0,0,0,0.025)`;
            ctx.fillRect(gx, gy, 1 + (i & 1), 1);
        }
    }

    // Warm color overlay for desert/wasteland areas
    drawColorGrade(ctx, areaId) {
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        if (areaId === 'cave') {
            // Cool blue tint for caves
            ctx.fillStyle = 'rgba(0,5,15,0.06)';
            ctx.fillRect(0, 0, cw, ch);
        } else {
            // Warm sepia tint for outdoor wasteland
            ctx.fillStyle = 'rgba(20,12,0,0.04)';
            ctx.fillRect(0, 0, cw, ch);
        }
    }

    // Draw a roof tile (dark solid or transparent)
    drawRoof(gx, gy, alpha = 1.0) {
        const screen = this.worldToScreen(gx, gy);
        const tw = this.tileWidth * this.camera.zoom / 2;
        const th = this.tileHeight * this.camera.zoom / 2;
        const hOffset = 2 * 8 * this.camera.zoom; // wall height offset
        const ctx = this.ctx;
        const z = this.camera.zoom;
        const n = this.noise(gx, gy);

        // Roof surface
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - th - hOffset - 4 * z);
        ctx.lineTo(screen.x + tw, screen.y - hOffset - 4 * z);
        ctx.lineTo(screen.x, screen.y + th - hOffset - 4 * z);
        ctx.lineTo(screen.x - tw, screen.y - hOffset - 4 * z);
        ctx.closePath();

        // Roof color (dark thatch/metal)
        const r = 52 + n * 12 | 0;
        const g = 42 + n * 10 | 0;
        const b = 28 + n * 8 | 0;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fill();
        ctx.strokeStyle = `rgb(${r-15},${g-12},${b-8})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Roof texture lines
        const n2 = this.noise2(gx, gy);
        ctx.strokeStyle = `rgba(${r-20},${g-16},${b-10},0.4)`;
        ctx.lineWidth = 0.4;
        for (let i = 0; i < 3; i++) {
            const ly = screen.y - hOffset - 4 * z + (i - 1) * th * 0.4;
            ctx.beginPath();
            ctx.moveTo(screen.x - tw * 0.8, ly + n2 * 2);
            ctx.lineTo(screen.x + tw * 0.8, ly - n2 * 2);
            ctx.stroke();
        }

        // Ridge shadow
        ctx.fillStyle = `rgba(0,0,0,${0.1 * alpha})`;
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y - th - hOffset - 4 * z);
        ctx.lineTo(screen.x + tw * 0.3, screen.y - hOffset - 4 * z + th * 0.3);
        ctx.lineTo(screen.x, screen.y - hOffset - 4 * z);
        ctx.lineTo(screen.x - tw * 0.3, screen.y - hOffset - 4 * z + th * 0.3);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 1.0;
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

        // ---- ROOF PASS: Draw roofs over building tiles ----
        // Determine if player is inside a building (standing on wood or door tile)
        const playerTile = (playerPos && map[playerPos.y] && map[playerPos.y][playerPos.x])
            ? map[playerPos.y][playerPos.x] : null;
        const playerInside = (playerTile === 'wood' || playerTile === 'door');

        // Find all building interior tiles (wood/door) and which "building" they belong to
        // Then draw roofs over wall tiles that border building interiors
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[0].length; x++) {
                if (map[y][x] !== 'wall') continue;

                // Check if this wall is adjacent to a building interior (wood/door)
                let isBuilding = false;
                for (let dy = -1; dy <= 1 && !isBuilding; dy++) {
                    for (let dx = -1; dx <= 1 && !isBuilding; dx++) {
                        const ny = y + dy, nx = x + dx;
                        if (ny >= 0 && ny < map.length && nx >= 0 && nx < map[0].length) {
                            if (map[ny][nx] === 'wood' || map[ny][nx] === 'door') {
                                isBuilding = true;
                            }
                        }
                    }
                }

                if (isBuilding) {
                    // If player is inside, check if player is in the same building cluster
                    let alpha = 1.0;
                    if (playerInside) {
                        // Simple proximity check: if player is within 6 tiles of this wall, fade it
                        const dist = Math.abs(x - playerPos.x) + Math.abs(y - playerPos.y);
                        if (dist < 8) {
                            alpha = 0.15;
                        }
                    }
                    this.drawRoof(x, y, alpha);
                }
            }
        }

        // Also draw roofs over interior tiles (wood/door) so the whole building is covered
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[0].length; x++) {
                if (map[y][x] !== 'wood' && map[y][x] !== 'door') continue;
                let alpha = 1.0;
                if (playerInside) {
                    const dist = Math.abs(x - playerPos.x) + Math.abs(y - playerPos.y);
                    if (dist < 8) {
                        alpha = 0.15;
                    }
                }
                this.drawRoof(x, y, alpha);
            }
        }

        if (area.transitions) {
            for (const t of area.transitions) {
                this.drawTransition(t.x, t.y, t.label || 'Exit');
            }
        }

        // Only show grid highlights during combat
        if (gameState.inCombat) {
            if (gameState.highlights) {
                for (const h of gameState.highlights) {
                    if (h.type === 'move') {
                        this.drawTileHighlight(h.x, h.y, 'rgba(50, 110, 50, 0.1)', 'rgba(50, 110, 50, 0.2)');
                    } else if (h.type === 'attack') {
                        this.drawTileHighlight(h.x, h.y, 'rgba(140, 30, 20, 0.1)', 'rgba(140, 30, 20, 0.25)');
                    } else if (h.type === 'path') {
                        this.drawTileHighlight(h.x, h.y, 'rgba(50, 110, 50, 0.2)', 'rgba(50, 110, 50, 0.35)');
                    }
                }
            }

            if (gameState.hoverTile) {
                this.drawTileHighlight(gameState.hoverTile.x, gameState.hoverTile.y,
                    'rgba(120, 90, 35, 0.1)', 'rgba(120, 90, 35, 0.3)');
            }
        }

        // Particles (dust and ash)
        this.drawParticles(this.ctx);

        // Color grade (warm sepia for wasteland, cool for caves)
        this.drawColorGrade(this.ctx, area.id);

        // Vignette (heavier for caves, always present for Fallout 2 look)
        if (area.id === 'cave') {
            this.drawVignette(this.ctx, 0.65);
        } else {
            this.drawVignette(this.ctx, 0.4);
        }

        // Floating texts
        if (gameState.floatingTexts) {
            for (const ft of gameState.floatingTexts) {
                this.drawFloatingText(ft.x, ft.y, ft.text, ft.color, ft.offsetY);
            }
        }

        // Film grain and scanlines (Fallout 2 pre-rendered aesthetic)
        this.drawFilmGrain(this.ctx);

        // Heat shimmer effect for outdoor areas (subtle)
        if (area.id !== 'cave' && this.time % 4 === 0) {
            const shimmer = Math.sin(this.time * 0.03) * 0.008 + 0.005;
            this.ctx.fillStyle = `rgba(180,150,100,${shimmer})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height * 0.3);
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
        // Fallout 2 world map: dark parchment/monitor green style
        ctx.fillStyle = '#0A0806';
        ctx.fillRect(0, 0, 400, 300);

        // Terrain texture (more noise, worn map feel)
        for (let i = 0; i < 200; i++) {
            const x = (i * 37 + i * i * 3) % 400;
            const y = (i * 53 + i * 7) % 300;
            ctx.fillStyle = `rgba(30, 24, 12, ${0.2 + (i % 7) * 0.06})`;
            ctx.fillRect(x, y, 1 + (i % 3), 1);
        }
        // Faded contour lines
        for (let i = 0; i < 5; i++) {
            ctx.strokeStyle = `rgba(30,25,15,0.12)`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.ellipse(200 + i * 20, 150 - i * 10, 100 + i * 30, 60 + i * 15, 0.3, 0, Math.PI * 2);
            ctx.stroke();
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
                        ctx.strokeStyle = '#2A1C08';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([2, 4]);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                }
            }

            if (isCurrent) {
                // Pulsing highlight
                const pulse = 0.06 + Math.sin(this.time * 0.05) * 0.03;
                ctx.fillStyle = `rgba(120, 90, 30, ${pulse})`;
                ctx.beginPath();
                ctx.arc(loc.mapX, loc.mapY, 16, 0, Math.PI * 2);
                ctx.fill();
            }

            // Location dot with pip-boy style circle
            ctx.beginPath();
            ctx.arc(loc.mapX, loc.mapY, isCurrent ? 6 : 3.5, 0, Math.PI * 2);
            ctx.fillStyle = isCurrent ? '#887020' : (loc.discovered ? '#443A1C' : '#1A1208');
            ctx.fill();
            ctx.strokeStyle = isCurrent ? '#AA9040' : '#2A1C08';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Inner dot for current
            if (isCurrent) {
                ctx.beginPath();
                ctx.arc(loc.mapX, loc.mapY, 2, 0, Math.PI * 2);
                ctx.fillStyle = '#CCAA50';
                ctx.fill();
            }

            if (loc.discovered || isCurrent) {
                ctx.font = '8px Courier New';
                ctx.textAlign = 'center';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.strokeText(loc.name, loc.mapX, loc.mapY + 15);
                ctx.fillStyle = isCurrent ? '#887020' : '#3A3018';
                ctx.fillText(loc.name, loc.mapX, loc.mapY + 15);

                // Show "click to travel" hint for non-current discovered locations
                if (!isCurrent && loc.discovered) {
                    ctx.font = '6px Courier New';
                    ctx.fillStyle = '#554820';
                    ctx.fillText('[Travel]', loc.mapX, loc.mapY + 23);
                }
            }
        }

        // Map border
        ctx.strokeStyle = '#2A1C08';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, 398, 298);
    }
}
