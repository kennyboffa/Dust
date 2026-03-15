// ============================================
// Dustwalker - Main Game Controller
// ============================================

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new IsometricRenderer(this.canvas);
        this.input = new InputHandler(this.canvas, this.renderer);
        this.audio = new AudioManager();
        this.combat = new CombatSystem(this);
        this.dialogue = new DialogueSystem(this);
        this.ai = new AISystem(this);
        this.hud = new HUDManager(this);
        this.screens = new ScreenManager(this);

        this.player = null;
        this.currentArea = null;
        this.entities = [];
        this.areas = {};

        this.state = 'title'; // title, creation, exploration, playerTurn, enemyTurn, dialogue
        this.currentAction = 'move'; // move, attack, use, talk, look

        this.gameTime = { day: 1, hour: 8 };
        this.floatingTexts = [];
        this.highlights = [];
        this.hoverTile = null;
        this.selectedEntity = null;

        this.areaStates = {}; // Persist entity states when switching areas
        this.npcHomes = {}; // Store NPC home positions for wandering
        this.wanderTimer = 0;

        this.setupUI();
        this.setupInput();
        this.gameLoop();
    }

    setupUI() {
        // Title screen buttons
        document.getElementById('btn-new-game').addEventListener('click', () => {
            this.audio.init();
            this.audio.playSfx('click');
            this.screens.setupCharCreation();
            this.showScreen('char-creation');
        });

        document.getElementById('btn-load-game').addEventListener('click', () => {
            this.audio.init();
            this.loadGame();
        });

        // Action buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.audio.playSfx('click');
                this.setAction(btn.dataset.action);
            });
        });

        // HUD buttons
        document.getElementById('btn-inventory').addEventListener('click', () => {
            this.audio.playSfx('click');
            this.hud.updateInventoryScreen();
            this.showScreen('inventory-screen');
        });

        document.getElementById('btn-character').addEventListener('click', () => {
            this.audio.playSfx('click');
            this.hud.updateCharacterScreen();
            this.showScreen('character-screen');
        });

        document.getElementById('btn-journal').addEventListener('click', () => {
            this.audio.playSfx('click');
            this.updateJournal();
            this.showScreen('journal-screen');
        });

        document.getElementById('btn-pipboy').addEventListener('click', () => {
            this.audio.playSfx('click');
            this.screens.drawWorldMap();
            this.showScreen('map-screen');
        });

        document.getElementById('btn-save').addEventListener('click', () => {
            this.audio.playSfx('click');
            this.saveGame();
        });

        // Quick slot clicks
        document.querySelectorAll('.quick-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                this.audio.playSfx('click');
                this.useQuickSlot(parseInt(slot.dataset.slot));
            });
        });

        // Close buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.audio.playSfx('click');
                this.hideScreen(btn.dataset.close);
            });
        });

        // Equip slot clicks (unequip)
        document.querySelectorAll('.equip-slot').forEach(el => {
            el.addEventListener('click', () => {
                const slot = el.dataset.slot;
                if (this.player && this.player.equipment[slot]) {
                    InventorySystem.unequip(this.player, slot);
                    this.hud.updateInventoryScreen();
                    this.addMessage(`Unequipped ${slot}.`, 'info');
                }
            });
        });
    }

    setupInput() {
        this.input.on('click', (data) => {
            if (this.state === 'title' || this.state === 'creation') return;
            this.handleClick(data.gridX, data.gridY);
        });

        this.input.on('mousemove', (data) => {
            if (this.state === 'exploration' || this.state === 'playerTurn') {
                this.hoverTile = { x: data.gridX, y: data.gridY };
                this.updateHighlights();
            }
        });

        this.input.on('rightclick', () => {
            this.setAction('move');
        });

        this.input.on('keydown', (key) => {
            this.handleKey(key);
        });
    }

    handleKey(key) {
        // Screen shortcuts
        if (key === 'escape') {
            // Close any open overlay
            document.querySelectorAll('.overlay.active').forEach(el => {
                el.classList.remove('active');
            });
            if (this.dialogue.active) this.dialogue.endDialogue();
            return;
        }

        if (this.state !== 'exploration' && this.state !== 'playerTurn') return;

        switch (key) {
            case 'i':
                this.hud.updateInventoryScreen();
                this.showScreen('inventory-screen');
                break;
            case 'c':
                this.hud.updateCharacterScreen();
                this.showScreen('character-screen');
                break;
            case 'j':
                this.updateJournal();
                this.showScreen('journal-screen');
                break;
            case 'p':
                this.screens.drawWorldMap();
                this.showScreen('map-screen');
                break;
            case 'm': this.setAction('move'); break;
            case 'a': this.setAction('attack'); break;
            case 'u': this.setAction('use'); break;
            case 't': this.setAction('talk'); break;
            case 'l': this.setAction('look'); break;
            case 's': this.toggleSneak(); break;
            case ' ':
                if (this.combat.active) {
                    this.combat.endTurn();
                }
                break;
            case 'f5':
                this.saveGame();
                break;
            case '1': case '2': case '3': case '4':
                this.useQuickSlot(parseInt(key) - 1);
                break;
        }
    }

    handleClick(gridX, gridY) {
        if (this.dialogue.active) return;

        switch (this.currentAction) {
            case 'move':
                this.handleMove(gridX, gridY);
                break;
            case 'attack':
                this.handleAttack(gridX, gridY);
                break;
            case 'talk':
                this.handleTalk(gridX, gridY);
                break;
            case 'look':
                this.handleLook(gridX, gridY);
                break;
            case 'use':
                this.handleUse(gridX, gridY);
                break;
            case 'end-turn':
                if (this.combat.active) this.combat.endTurn();
                break;
        }
    }

    handleMove(gridX, gridY) {
        // Auto-interact: clicking an NPC talks, clicking a container loots, clicking enemy attacks
        const target = this.getEntityAt(gridX, gridY);
        if (target) {
            const dist = Utils.gridDistance(this.player.x, this.player.y, gridX, gridY);

            // Auto-attack hostile enemies
            if (target.isHostile || target.type === 'enemy') {
                this.handleAttack(gridX, gridY);
                return;
            }

            if (target.type === 'npc' && target.dialogueId && dist <= 2) {
                this.dialogue.startDialogue(target);
                return;
            }
            if (target.type === 'container' && dist <= 2) {
                this.hud.showLootScreen(target);
                return;
            }
            if ((target.type === 'npc' && target.dialogueId) || target.type === 'container') {
                this.walkToAndInteract(target);
                return;
            }
        }

        if (!this.isWalkable(gridX, gridY)) {
            // Check for transitions
            const transition = this.checkTransition(gridX, gridY);
            if (transition) {
                this.transitionArea(transition);
                return;
            }
            return;
        }

        if (this.combat.active) {
            // Combat movement (costs AP)
            const dist = Utils.gridDistance(this.player.x, this.player.y, gridX, gridY);
            if (dist <= this.player.stats.ap) {
                this.combat.combatMove(this.player, gridX, gridY);
                this.renderer.centerOn(this.player.x, this.player.y);
                this.hud.update();
                this.checkAutoEndTurn();
            }
        } else {
            // Free movement (pathfinding)
            const path = Utils.findPath(
                this.player.x, this.player.y, gridX, gridY,
                (x, y) => this.isWalkable(x, y),
                40
            );

            if (path && path.length > 0) {
                this.animateMovement(path);
            }

            // Check for transition at destination
            const transition = this.checkTransition(gridX, gridY);
            if (transition) {
                this.transitionArea(transition);
            }
        }
    }

    // Compute facing direction from movement delta
    getFacing(dx, dy) {
        if (Math.abs(dx) >= Math.abs(dy)) {
            return dx > 0 ? 'east' : 'west';
        }
        return dy > 0 ? 'south' : 'north';
    }

    animateMovement(path) {
        let step = 0;
        const animate = () => {
            if (step >= path.length) {
                // Check for aggro after moving
                this.checkCombatTrigger();
                return;
            }

            const dx = path[step].x - this.player.x;
            const dy = path[step].y - this.player.y;
            if (dx !== 0 || dy !== 0) {
                this.player.facing = this.getFacing(dx, dy);
            }
            this.player.x = path[step].x;
            this.player.y = path[step].y;
            this.renderer.centerOn(this.player.x, this.player.y);
            this.audio.playSfx('step');
            step++;

            // Check transition mid-path
            const t = this.checkTransition(this.player.x, this.player.y);
            if (t) {
                this.transitionArea(t);
                return;
            }

            // Check aggro mid-path (only nearby enemies)
            const hostiles = this.ai.checkAggro(this.entities, this.player, 3);
            if (hostiles.length > 0) {
                this.startCombatWith(hostiles);
                return;
            }

            setTimeout(animate, 180);
        };
        animate();
    }

    walkToAndInteract(target) {
        // Find a walkable tile adjacent to the target
        const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
        let bestTile = null;
        let bestDist = Infinity;
        for (const [dx, dy] of dirs) {
            const nx = target.x + dx;
            const ny = target.y + dy;
            if (this.isWalkable(nx, ny)) {
                const d = Utils.gridDistance(this.player.x, this.player.y, nx, ny);
                if (d < bestDist) {
                    bestDist = d;
                    bestTile = { x: nx, y: ny };
                }
            }
        }
        if (!bestTile) return;

        const path = Utils.findPath(
            this.player.x, this.player.y, bestTile.x, bestTile.y,
            (x, y) => this.isWalkable(x, y), 40
        );
        if (!path || path.length === 0) return;

        let step = 0;
        const animate = () => {
            if (step >= path.length) {
                // Interact on arrival
                if (target.type === 'npc' && target.dialogueId) {
                    this.dialogue.startDialogue(target);
                } else if (target.type === 'container') {
                    this.hud.showLootScreen(target);
                }
                return;
            }
            const dx = path[step].x - this.player.x;
            const dy = path[step].y - this.player.y;
            if (dx !== 0 || dy !== 0) {
                this.player.facing = this.getFacing(dx, dy);
            }
            this.player.x = path[step].x;
            this.player.y = path[step].y;
            this.renderer.centerOn(this.player.x, this.player.y);
            this.audio.playSfx('step');
            step++;
            setTimeout(animate, 180);
        };
        animate();
    }

    handleAttack(gridX, gridY) {
        const target = this.getEntityAt(gridX, gridY);
        if (!target) {
            this.addMessage('Nothing to attack there.', 'info');
            return;
        }

        if (target.type === 'npc' && !target.isHostile) {
            this.addMessage(`${target.name} is not hostile.`, 'info');
            return;
        }

        if (target.type === 'container') {
            this.addMessage('You can\'t attack a container.', 'info');
            return;
        }

        const weapon = InventorySystem.getEquippedWeapon(this.player);
        const range = weapon ? (weapon.range || 1) : 1;
        const dist = Utils.gridDistance(this.player.x, this.player.y, gridX, gridY);

        if (dist > range) {
            this.addMessage('Target is out of range.', 'combat');
            return;
        }

        if (!this.combat.active) {
            // Start combat
            this.startCombatWith([target]);
        }

        if (this.state === 'playerTurn') {
            this.combat.attack(this.player, target, weapon);
            this.hud.update();
            this.checkAutoEndTurn();
        }
    }

    handleTalk(gridX, gridY) {
        const target = this.getEntityAt(gridX, gridY);
        if (!target) {
            this.addMessage('No one to talk to there.', 'info');
            return;
        }

        const dist = Utils.gridDistance(this.player.x, this.player.y, gridX, gridY);
        if (dist > 2) {
            this.addMessage('Too far away to talk.', 'info');
            return;
        }

        if (target.type === 'npc' && target.dialogueId) {
            this.dialogue.startDialogue(target);
        } else if (target.type === 'container') {
            this.hud.showLootScreen(target);
        } else {
            this.addMessage(`${target.name} doesn't want to talk.`, 'dialogue');
        }
    }

    handleLook(gridX, gridY) {
        const target = this.getEntityAt(gridX, gridY);
        if (target) {
            let info = `${target.name}`;
            if (target.stats && target.stats.hp !== undefined) {
                info += ` - HP: ${target.stats.hp}/${target.stats.maxHp}`;
            }
            if (target.type === 'enemy') {
                info += ` (Hostile)`;
            }
            if (target.type === 'container') {
                info += ` (Container - ${target.items.length} items)`;
            }
            this.addMessage(info, 'info');
        } else {
            const tile = this.getTileAt(gridX, gridY);
            if (tile) {
                this.addMessage(`You see: ${tile.replace('_', ' ')}`, 'info');
            }
        }
    }

    handleUse(gridX, gridY) {
        const target = this.getEntityAt(gridX, gridY);
        if (target && target.type === 'container') {
            const dist = Utils.gridDistance(this.player.x, this.player.y, gridX, gridY);
            if (dist <= 2) {
                this.hud.showLootScreen(target);
            } else {
                this.addMessage('Too far away.', 'info');
            }
        } else {
            this.addMessage('Nothing to use here.', 'info');
        }
    }

    // ---- Game State Management ----

    startNewGame(name, special, tagSkills) {
        this.player = CharacterSystem.createPlayer(name, special, tagSkills);

        // Starting equipment
        InventorySystem.addItem(this.player, ItemDatabase.knife, 1);
        InventorySystem.addItem(this.player, ItemDatabase.healing_powder, 3);
        InventorySystem.addItem(this.player, ItemDatabase.bottle_caps, 50);
        InventorySystem.addItem(this.player, ItemDatabase.nuka_cola, 2);
        InventorySystem.addItem(this.player, ItemDatabase.tribal_garb, 1);

        // Equip starting gear
        const knife = this.player.inventory.find(i => i.id === 'knife');
        if (knife) InventorySystem.equip(this.player, knife.uid);
        const garb = this.player.inventory.find(i => i.id === 'tribal_garb');
        if (garb) InventorySystem.equip(this.player, garb.uid);

        // Generate areas
        this.areas = {
            village: createVillageArea(),
            cave: createCaveArea(),
            wasteland: createWastelandArea(),
        };

        // Load starting area
        this.loadArea('village');

        this.hideScreen('title-screen');
        this.hideScreen('char-creation');
        this.showScreen('game-hud');
        this.state = 'exploration';
        this.addMessage('Welcome to Dusthaven, Wanderer. The wasteland stretches endlessly in every direction.', 'info');
        this.addMessage('Talk to the villagers to learn about this place. Elder Mara may have work for you.', 'info');
    }

    loadArea(areaId) {
        // Save current area state
        if (this.currentArea) {
            this.areaStates[this.currentArea.id] = {
                entities: this.entities.filter(e => e.type !== 'player').map(e => Utils.deepClone(e))
            };
        }

        const area = this.areas[areaId];
        if (!area) return;

        this.currentArea = area;

        // Restore saved state or use fresh
        if (this.areaStates[areaId]) {
            this.entities = this.areaStates[areaId].entities.map(e => Utils.deepClone(e));
        } else {
            this.entities = area.entities.map(e => Utils.deepClone(e));
        }

        // Add player
        this.entities.push(this.player);

        // Store NPC home positions for wandering
        this.npcHomes = {};
        for (const ent of this.entities) {
            if (ent.type === 'npc') {
                this.npcHomes[ent.id] = { x: ent.x, y: ent.y };
            }
        }

        // Center camera
        this.renderer.centerOn(this.player.x, this.player.y);
    }

    transitionArea(transition) {
        this.audio.playSfx('door');

        // Set player position for new area
        this.player.x = transition.targetX;
        this.player.y = transition.targetY;

        // End combat if active
        if (this.combat.active) {
            this.combat.endCombat();
        }

        this.loadArea(transition.targetArea);
        this.addMessage(`Entered: ${this.currentArea.name}`, 'info');
        this.hud.update();

        // Advance time
        this.advanceTime(1);
    }

    checkTransition(x, y) {
        if (!this.currentArea || !this.currentArea.transitions) return null;
        return this.currentArea.transitions.find(t => t.x === x && t.y === y);
    }

    // ---- Entity Management ----

    addEntity(entity) {
        this.entities.push(entity);
    }

    removeEntity(entity) {
        const idx = this.entities.indexOf(entity);
        if (idx !== -1) this.entities.splice(idx, 1);
    }

    getEntityAt(x, y) {
        return this.entities.find(e => e.x === x && e.y === y && e !== this.player);
    }

    // ---- Map Queries ----

    getTileAt(x, y) {
        if (!this.currentArea) return null;
        const map = this.currentArea.map;
        if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) return null;
        return map[y][x];
    }

    isWalkable(x, y) {
        const tile = this.getTileAt(x, y);
        if (!tile) return false;
        if (this.currentArea.blocked.has(tile)) return false;
        // Check for blocking entities (characters and blocking environment objects)
        const ent = this.getEntityAt(x, y);
        if (ent && (ent.type === 'enemy' || ent.type === 'npc')) return false;
        if (ent && ent.type === 'environment' && ent.blocking) return false;
        // Block player tile for AI pathfinding
        if (this.player && x === this.player.x && y === this.player.y) return false;
        return true;
    }

    // Walkable check excluding a specific entity (for that entity's own movement)
    isWalkableFor(x, y, entity) {
        const tile = this.getTileAt(x, y);
        if (!tile) return false;
        if (this.currentArea.blocked.has(tile)) return false;
        for (const e of this.entities) {
            if (e === entity) continue;
            if (e.x === x && e.y === y) {
                if (e.type === 'enemy' || e.type === 'npc' || e.type === 'player') return false;
                if (e.type === 'environment' && e.blocking) return false;
            }
        }
        return true;
    }

    // ---- Combat ----

    checkAutoEndTurn() {
        if (!this.combat.active || this.state !== 'playerTurn') return;
        if (this.player.stats.ap <= 0) {
            this.addMessage('No AP remaining. Ending turn.', 'info');
            setTimeout(() => this.combat.endTurn(), 500);
        }
    }

    checkCombatTrigger() {
        if (this.combat.active) return;
        const hostiles = this.ai.checkAggro(this.entities, this.player, 5);
        if (hostiles.length > 0) {
            this.startCombatWith(hostiles);
        }
    }

    toggleSneak() {
        if (!this.player) return;
        this.player.sneaking = !this.player.sneaking;
        if (this.player.sneaking) {
            this.addMessage('You begin sneaking.', 'skill');
        } else {
            this.addMessage('You stop sneaking.', 'info');
        }
        this.hud.update();
    }

    startCombatWith(enemies) {
        const participants = [this.player, ...enemies];
        this.showCombatBanner();
        this.combat.startCombat(participants);
    }

    showCombatBanner() {
        // Create a cinematic "Combat Starts" banner
        let banner = document.getElementById('combat-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'combat-banner';
            document.getElementById('game-container').appendChild(banner);
        }
        banner.textContent = 'COMBAT';
        banner.style.cssText = `
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scaleX(0);
            font-family: 'Trebuchet MS', 'Arial Black', sans-serif; font-size: 64px; font-weight: bold;
            color: #c44a3a; letter-spacing: 18px; text-shadow: 0 0 30px rgba(200,60,40,0.6), 0 2px 4px #000;
            pointer-events: none; z-index: 100; white-space: nowrap; opacity: 0;
            border-top: 3px solid #c44a3a; border-bottom: 3px solid #c44a3a;
            padding: 10px 40px; background: rgba(0,0,0,0.7);
            transition: transform 0.3s ease-out, opacity 0.3s ease-out;
        `;
        // Trigger animation
        requestAnimationFrame(() => {
            banner.style.opacity = '1';
            banner.style.transform = 'translate(-50%, -50%) scaleX(1)';
        });
        // Fade out after 1.5s
        setTimeout(() => {
            banner.style.opacity = '0';
            banner.style.transform = 'translate(-50%, -50%) scaleX(1.1)';
            setTimeout(() => banner.remove(), 400);
        }, 1500);
    }

    // ---- Inventory Actions (called from UI) ----

    useItem(itemId) {
        InventorySystem.useItem(this.player, itemId, this);
        this.hud.updateInventoryScreen();
        this.hud.update();
    }

    equipItem(itemUid) {
        InventorySystem.equip(this.player, itemUid);
        this.hud.updateInventoryScreen();
        this.hud.update();
        this.addMessage('Equipment changed.', 'info');
    }

    dropItem(itemId) {
        const item = this.player.inventory.find(i => i.uid === itemId || i.id === itemId);
        if (item) {
            this.addMessage(`Dropped ${item.name}.`, 'info');
            InventorySystem.removeItem(this.player, itemId);
            this.hud.updateInventoryScreen();
        }
    }

    takeItem(container, index) {
        if (index < 0 || index >= container.items.length) return;
        const item = container.items[index];
        const result = InventorySystem.addItem(this.player, item, item.quantity || 1);

        if (result.success) {
            container.items.splice(index, 1);
            this.addMessage(`Picked up: ${item.name}${item.quantity > 1 ? ' x' + item.quantity : ''}`, 'loot');
            this.audio.playSfx('pickup');

            // Check if it's the cave crystal (quest item)
            if (item.id === 'cave_crystal') {
                this.player.questFlags.cave_crystal_returned = true;
                QuestSystem.advanceQuest(this.player, 'cave_crystal', 'return', this);
                this.addMessage('You found the Dust Crystal! Return it to Elder Mara.', 'xp');
            }
        } else {
            this.addMessage('Inventory full! Too much weight.', 'info');
        }
    }

    takeAllItems(container) {
        const toRemove = [];
        for (let i = 0; i < container.items.length; i++) {
            const item = container.items[i];
            const result = InventorySystem.addItem(this.player, item, item.quantity || 1);
            if (result.success) {
                toRemove.push(i);
                this.addMessage(`Picked up: ${item.name}${item.quantity > 1 ? ' x' + item.quantity : ''}`, 'loot');

                if (item.id === 'cave_crystal') {
                    this.player.questFlags.cave_crystal_returned = true;
                    QuestSystem.advanceQuest(this.player, 'cave_crystal', 'return', this);
                    this.addMessage('You found the Dust Crystal! Return it to Elder Mara.', 'xp');
                }
            }
        }
        // Remove in reverse to maintain indices
        for (let i = toRemove.length - 1; i >= 0; i--) {
            container.items.splice(toRemove[i], 1);
        }
        if (toRemove.length > 0) this.audio.playSfx('pickup');
    }

    useQuickSlot(index) {
        // Quick slots can hold consumables
        const consumables = this.player.inventory.filter(i => i.usable);
        if (index < consumables.length) {
            InventorySystem.useItem(this.player, consumables[index].uid, this);
            this.hud.update();
        }
    }

    // ---- UI Helpers ----

    setState(newState) {
        this.state = newState;
    }

    setAction(action) {
        if (action === 'end-turn' && this.combat.active) {
            this.combat.endTurn();
            return;
        }
        this.currentAction = action;
        this.updateHighlights();
        this.hud.update();

        // Update cursor
        this.canvas.className = '';
        if (action === 'move') this.canvas.classList.add('cursor-move');
        if (action === 'attack') this.canvas.classList.add('cursor-attack');
        if (action === 'talk') this.canvas.classList.add('cursor-talk');
        if (action === 'look') this.canvas.classList.add('cursor-look');
    }

    updateHighlights() {
        this.highlights = [];

        if (this.combat.active && this.state === 'playerTurn') {
            if (this.currentAction === 'move') {
                const range = this.combat.getMovementRange(this.player);
                this.highlights = range.map(t => ({ ...t, type: 'move' }));
            } else if (this.currentAction === 'attack') {
                const weapon = InventorySystem.getEquippedWeapon(this.player);
                const range = this.combat.getAttackRange(this.player, weapon);
                this.highlights = range.map(t => ({ ...t, type: 'attack' }));
            }
        }
    }

    showScreen(screenId) {
        const screen = document.getElementById(screenId);
        if (screen) screen.classList.add('active');
    }

    hideScreen(screenId) {
        const screen = document.getElementById(screenId);
        if (screen) screen.classList.remove('active');
    }

    showLevelUp() {
        this.screens.setupLevelUpScreen();
    }

    addMessage(text, type = 'info') {
        const log = document.getElementById('message-log-content');
        const msg = document.createElement('div');
        msg.className = `msg-${type}`;
        msg.textContent = `> ${text}`;
        log.appendChild(msg);

        // Keep only last 50 messages
        while (log.children.length > 50) {
            log.removeChild(log.firstChild);
        }

        // Scroll to bottom
        const logContainer = document.getElementById('message-log');
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    addFloatingText(x, y, text, color = '#fff') {
        this.floatingTexts.push({
            x, y, text, color,
            offsetY: 0,
            life: 60
        });
    }

    updateJournal() {
        const questList = document.getElementById('quest-list');
        const active = QuestSystem.getActiveQuests(this.player);
        const completed = QuestSystem.getCompletedQuests(this.player);

        let html = '';
        if (active.length === 0 && completed.length === 0) {
            html = '<p style="color:#8a7a60;padding:10px">No quests yet. Talk to the villagers to find work.</p>';
        }

        if (active.length > 0) {
            html += '<h3 style="color:#d4a44a;margin:0 0 8px">Active Quests</h3>';
            for (const q of active) {
                const stageText = QuestSystem.getCurrentStageText(this.player, q.id);
                html += `<div class="quest-entry">`;
                html += `<div class="quest-name">${q.name}</div>`;
                html += `<div class="quest-giver">From: ${q.giver}</div>`;
                html += `<div class="quest-desc">${q.description}</div>`;
                html += `<div class="quest-objective">Current: ${stageText}</div>`;
                html += `<div class="quest-rewards">Rewards: ${q.rewards}</div>`;
                html += `</div>`;
            }
        }

        if (completed.length > 0) {
            html += '<h3 style="color:#6b8a50;margin:12px 0 8px">Completed Quests</h3>';
            for (const q of completed) {
                html += `<div class="quest-entry completed">`;
                html += `<div class="quest-name">${q.name} [COMPLETE]</div>`;
                html += `<div class="quest-giver">From: ${q.giver}</div>`;
                html += `</div>`;
            }
        }

        questList.innerHTML = html;
    }

    advanceTime(hours) {
        this.gameTime.hour += hours;
        while (this.gameTime.hour >= 24) {
            this.gameTime.hour -= 24;
            this.gameTime.day++;
            // Heal on rest/day change
            CharacterSystem.heal(this.player, this.player.stats.healRate);
        }
    }

    gameOver() {
        this.addMessage('Game Over. You have died in the wasteland.', 'combat');
        this.addMessage('Load a save or start a new game.', 'info');
        // Could show a game over screen here
    }

    // ---- Save/Load ----

    saveGame() {
        // Save current area state first
        if (this.currentArea) {
            this.areaStates[this.currentArea.id] = {
                entities: this.entities.filter(e => e.type !== 'player').map(e => {
                    const clone = Utils.deepClone(e);
                    // Remove functions from entities for serialization
                    return clone;
                })
            };
        }

        const saveData = {
            player: Utils.deepClone(this.player),
            currentAreaId: this.currentArea.id,
            areaStates: Utils.deepClone(this.areaStates),
            gameTime: { ...this.gameTime },
            version: 1
        };

        try {
            localStorage.setItem('dustwalker_save', JSON.stringify(saveData));
            this.addMessage('Game saved.', 'info');
        } catch (e) {
            this.addMessage('Failed to save game.', 'combat');
        }
    }

    loadGame() {
        try {
            const data = localStorage.getItem('dustwalker_save');
            if (!data) {
                this.addMessage('No save file found.', 'info');
                alert('No save file found. Start a new game.');
                return;
            }

            const saveData = JSON.parse(data);
            this.player = saveData.player;
            this.areaStates = saveData.areaStates || {};
            this.gameTime = saveData.gameTime || { day: 1, hour: 8 };

            // Regenerate areas (maps are procedural)
            this.areas = {
                village: createVillageArea(),
                cave: createCaveArea(),
                wasteland: createWastelandArea(),
            };

            // Load the saved area
            this.loadArea(saveData.currentAreaId || 'village');

            this.hideScreen('title-screen');
            this.hideScreen('char-creation');
            this.showScreen('game-hud');
            this.state = 'exploration';
            this.addMessage('Game loaded.', 'info');
            this.hud.update();
        } catch (e) {
            alert('Failed to load save. Start a new game.');
        }
    }

    // ---- Main Game Loop ----

    // NPC wandering - move NPCs 1-2 tiles occasionally, staying near home
    updateNPCWander() {
        if (this.state !== 'exploration' || this.combat.active) return;
        this.wanderTimer++;
        if (this.wanderTimer < 120) return; // ~2 seconds at 60fps
        this.wanderTimer = 0;

        for (const ent of this.entities) {
            if (ent.type !== 'npc' || !this.npcHomes[ent.id]) continue;
            // 30% chance to move each cycle
            if (Math.random() > 0.3) continue;

            const home = this.npcHomes[ent.id];
            const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
            // Shuffle directions
            for (let i = dirs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
            }

            for (const [dx, dy] of dirs) {
                const nx = ent.x + dx;
                const ny = ent.y + dy;
                // Stay within 5 tiles of home
                const distFromHome = Utils.gridDistance(nx, ny, home.x, home.y);
                if (distFromHome > 5) continue;
                if (!this.isWalkableFor(nx, ny, ent)) continue;
                // Don't walk onto player
                if (this.player && nx === this.player.x && ny === this.player.y) continue;

                ent.facing = this.getFacing(dx, dy);
                ent.x = nx;
                ent.y = ny;
                break;
            }
        }
    }

    gameLoop() {
        // Update floating texts
        this.floatingTexts = this.floatingTexts.filter(ft => {
            ft.life--;
            ft.offsetY -= 0.5;
            return ft.life > 0;
        });

        // NPC wandering
        this.updateNPCWander();

        // Render
        if (this.currentArea && this.state !== 'title' && this.state !== 'creation') {
            const gameState = {
                selectedEntity: this.selectedEntity,
                highlights: this.highlights,
                hoverTile: this.hoverTile,
                floatingTexts: this.floatingTexts,
                inCombat: this.combat.active,
            };

            this.renderer.renderArea(
                this.currentArea,
                this.entities,
                { x: this.player.x, y: this.player.y },
                gameState
            );
        }

        // Update HUD
        if (this.state === 'exploration' || this.state === 'playerTurn') {
            this.hud.update();
        }

        requestAnimationFrame(() => this.gameLoop());
    }
}

// ---- Initialize Game ----
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
