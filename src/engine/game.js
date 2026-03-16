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

        document.getElementById('btn-map-rest').addEventListener('click', () => {
            this.audio.playSfx('click');
            this.restOnMap();
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
                    if (slot === 'armor') this.updatePlayerArmorSprite();
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
            case 'w':
                if (this.combat.active) this.switchWeapon();
                break;
            case 'q':
                if (this.combat.active) this.cycleAttackMode();
                break;
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
                if (target.locked) {
                    this.attemptLockpick(target);
                } else {
                    this.hud.showLootScreen(target);
                }
                return;
            }
            if ((target.type === 'npc' && target.dialogueId) || target.type === 'container') {
                this.walkToAndInteract(target);
                return;
            }
        }

        if (this.combat.active) {
            // Combat movement — use isWalkableFor which excludes the mover
            if (!this.isWalkableFor(gridX, gridY, this.player)) {
                this.addMessage('That tile is blocked!', 'combat');
                return;
            }
            const dist = Utils.gridDistance(this.player.x, this.player.y, gridX, gridY);
            if (dist > this.player.stats.ap) {
                this.addMessage('Not enough AP to move there!', 'combat');
                return;
            }
            this.selectedEntity = null;
            this.combat.combatMove(this.player, gridX, gridY);
            this.hud.update();
            this.updateHighlights();
            this.checkAutoEndTurn();
            return;
        }

        if (!this.isWalkable(gridX, gridY) && !this.checkTransition(gridX, gridY)) {
            return;
        }

        {
            // Free movement (pathfinding) — allow transition tiles as walkable
            const path = Utils.findPath(
                this.player.x, this.player.y, gridX, gridY,
                (x, y) => this.isWalkable(x, y) || !!this.checkTransition(x, y),
                40
            );

            if (path && path.length > 0) {
                this.animateMovement(path);
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
        this.player.animState = 'walk';
        this._isMoving = true;

        const tweenStep = () => {
            if (step >= path.length) {
                this.player.animState = 'idle';
                this._isMoving = false;
                this.player.renderX = this.player.x;
                this.player.renderY = this.player.y;
                this.checkCombatTrigger();
                return;
            }

            const targetX = path[step].x;
            const targetY = path[step].y;
            const dx = targetX - this.player.x;
            const dy = targetY - this.player.y;
            if (dx !== 0 || dy !== 0) {
                this.player.facing = this.getFacing(dx, dy);
            }

            // Smooth interpolation: 12 sub-frames per tile for slower, more natural movement
            const subFrames = 12;
            let subStep = 0;
            const startX = this.player.x;
            const startY = this.player.y;

            const tweenSub = () => {
                subStep++;
                const t = subStep / subFrames;
                // Ease-in-out for natural feel
                const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                this.player.renderX = startX + dx * ease;
                this.player.renderY = startY + dy * ease;
                this.renderer.centerOn(this.player.renderX, this.player.renderY);

                if (subStep < subFrames) {
                    requestAnimationFrame(tweenSub);
                } else {
                    // Snap to final position
                    this.player.x = targetX;
                    this.player.y = targetY;
                    this.player.renderX = targetX;
                    this.player.renderY = targetY;
                    this.renderer.centerOn(this.player.x, this.player.y);

                    const currentTile = this.getTileAt(this.player.x, this.player.y);
                    if (currentTile === 'door') {
                        this.audio.playSfx('door_open');
                    } else {
                        this.audio.playSfx('step');
                    }
                    step++;

                    // Check transition mid-path
                    const tr = this.checkTransition(this.player.x, this.player.y);
                    if (tr) {
                        this.player.animState = 'idle';
                        this._isMoving = false;
                        this.transitionArea(tr);
                        return;
                    }

                    // Check aggro mid-path
                    const hostiles = this.ai.checkAggro(this.entities, this.player, 3);
                    if (hostiles.length > 0) {
                        this.player.animState = 'idle';
                        this._isMoving = false;
                        this.startCombatWith(hostiles);
                        return;
                    }

                    // Pause between tile steps for natural pace
                    setTimeout(tweenStep, 60);
                }
            };
            requestAnimationFrame(tweenSub);
        };
        tweenStep();
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
        this.player.animState = 'walk';
        const animate = () => {
            if (step >= path.length) {
                this.player.animState = 'idle';
                // Interact on arrival
                if (target.type === 'npc' && target.dialogueId) {
                    this.dialogue.startDialogue(target);
                } else if (target.type === 'container') {
                    if (target.locked) {
                        this.attemptLockpick(target);
                    } else {
                        this.hud.showLootScreen(target);
                    }
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
            // Clicked empty tile — deselect
            this.selectedEntity = null;
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
            // Two-click targeting: first click selects, second click attacks
            if (this.selectedEntity !== target) {
                // First click — highlight/select the target
                this.selectedEntity = target;
                const hitChance = this.combat.calculateHitChance(this.player, target, weapon);
                const apCost = weapon ? (weapon.apCost || 4) : 3;
                this.addMessage(`Target: ${target.name} | Hit: ${hitChance}% | AP: ${apCost} | Click again to attack`, 'combat');
                this.hud.update();
                return;
            }

            // Second click — perform the attack
            this.combat.attack(this.player, target, weapon);
            this.selectedEntity = null;
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
            if (target.locked) {
                this.attemptLockpick(target);
            } else {
                this.hud.showLootScreen(target);
            }
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
                if (target.locked) {
                    info += ` (Locked - difficulty ${target.lockDifficulty})`;
                } else {
                    info += ` (Container - ${target.items.length} items)`;
                }
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
                if (target.locked) {
                    this.attemptLockpick(target);
                } else {
                    this.hud.showLootScreen(target);
                }
            } else {
                this.addMessage('Too far away.', 'info');
            }
        } else if (target && target.type === 'environment' && target.spriteType === 'campfire') {
            const dist = Utils.gridDistance(this.player.x, this.player.y, gridX, gridY);
            if (dist <= 2) {
                this.restAtCampfire();
            } else {
                this.addMessage('Move closer to the campfire.', 'info');
            }
        } else {
            this.addMessage('Nothing to use here.', 'info');
        }
    }

    restAtCampfire() {
        if (this.combat.active) {
            this.addMessage('Cannot rest during combat!', 'combat');
            return;
        }
        const hoursToMorning = this.gameTime.hour >= 7 && this.gameTime.hour < 20
            ? 1 : (24 - this.gameTime.hour + 7) % 24 || 8;
        this.advanceTime(Math.max(1, hoursToMorning));
        const healAmt = Math.floor(this.player.stats.maxHp * 0.3);
        CharacterSystem.heal(this.player, healAmt);
        this.addMessage(`You rest by the fire. Healed ${healAmt} HP. ${this.getTimeString()}`, 'info');
        this.audio.playSfx('heal');
        this.hud.update();
    }

    restOnMap() {
        if (this.combat.active) {
            this.addMessage('Cannot rest during combat!', 'combat');
            return;
        }
        // Rest 8 hours, heal 50% HP
        this.advanceTime(8);
        const healAmt = Math.floor(this.player.stats.maxHp * 0.5);
        CharacterSystem.heal(this.player, healAmt);
        this.addMessage(`You make camp and rest for 8 hours. Healed ${healAmt} HP. ${this.getTimeString()}`, 'info');
        this.audio.playSfx('heal');
        this.hud.update();
        // Refresh the map display
        this.screens.drawWorldMap();
    }

    // ---- Game State Management ----

    startNewGame(name, special, tagSkills) {
        this.player = CharacterSystem.createPlayer(name, special, tagSkills);

        // Starting equipment
        InventorySystem.addItem(this.player, ItemDatabase.knife, 1);
        InventorySystem.addItem(this.player, ItemDatabase.healing_powder, 3);
        InventorySystem.addItem(this.player, ItemDatabase.bottle_caps, 50);
        InventorySystem.addItem(this.player, ItemDatabase.nuka_cola, 2);
        InventorySystem.addItem(this.player, ItemDatabase.lockpick, 3);
        InventorySystem.addItem(this.player, ItemDatabase.tribal_garb, 1);

        // Equip starting gear
        const knife = this.player.inventory.find(i => i.id === 'knife');
        if (knife) InventorySystem.equip(this.player, knife.uid);
        const garb = this.player.inventory.find(i => i.id === 'tribal_garb');
        if (garb) InventorySystem.equip(this.player, garb.uid);
        this.updatePlayerArmorSprite();

        // Generate areas
        this.areas = {
            village: createVillageArea(),
            cave: createCaveArea(),
            wasteland: createWastelandArea(),
            oasis: createOasisArea(),
            bunker: createBunkerArea(),
        };

        // Load starting area
        this.loadArea('village');

        this.hideScreen('title-screen');
        this.hideScreen('char-creation');

        // Show intro narrative
        this.showIntroNarrative(() => {
            this.showScreen('game-hud');
            this.state = 'exploration';
            this.addMessage('Welcome to Dusthaven, Wanderer. The wasteland stretches endlessly in every direction.', 'info');
            this.addMessage('Talk to the villagers to learn about this place. Elder Mara may have work for you.', 'info');
        });
    }

    showIntroNarrative(onComplete) {
        const introText = [
            'The year is 2247.',
            '',
            'Two centuries after the bombs fell, the world is a graveyard of the old civilization. What remains is dust, ruins, and the desperate creatures that cling to life between them.',
            '',
            'You are a wanderer — born in the wastes, raised by the sand and the silence. You carry no flag, owe no allegiance. Only the road ahead and the dust at your back.',
            '',
            'Word has reached you of a small settlement called Dusthaven, hidden among the crags of the eastern wasteland. They say the elder there knows of something buried — something from before the war. Something that could change everything.',
            '',
            'The journey has been long. Your water is low. Your boots are cracked. But as the sun sets behind the ridgeline, you see it — a cluster of buildings on the horizon, smoke rising from a cookfire.',
            '',
            'Dusthaven.',
        ];

        this.showScreen('intro-screen');
        this.state = 'intro';
        const textEl = document.getElementById('intro-text');
        const promptEl = document.getElementById('intro-prompt');
        textEl.innerHTML = '';
        promptEl.style.display = 'none';

        let lineIdx = 0;
        let charIdx = 0;
        let currentLine = '';
        let done = false;

        const typeNext = () => {
            if (done) return;
            if (lineIdx >= introText.length) {
                promptEl.style.display = 'block';
                done = true;
                return;
            }
            const line = introText[lineIdx];
            if (line === '') {
                textEl.innerHTML += '<br>';
                lineIdx++;
                charIdx = 0;
                setTimeout(typeNext, 200);
                return;
            }
            if (charIdx === 0) {
                currentLine = '';
                textEl.innerHTML += '<span id="intro-line-' + lineIdx + '"></span>';
            }
            if (charIdx < line.length) {
                currentLine += line[charIdx];
                const span = document.getElementById('intro-line-' + lineIdx);
                if (span) span.textContent = currentLine;
                charIdx++;
                setTimeout(typeNext, 28);
            } else {
                textEl.innerHTML += '<br>';
                lineIdx++;
                charIdx = 0;
                setTimeout(typeNext, 300);
            }
        };

        setTimeout(typeNext, 800);

        // Skip/advance on click or keypress
        const skipHandler = () => {
            if (!done) {
                // Fast-forward: show all text immediately
                done = true;
                textEl.innerHTML = introText.map(l => l === '' ? '<br>' : l).join('<br>');
                promptEl.style.display = 'block';
            } else {
                // Dismiss intro
                this.hideScreen('intro-screen');
                document.removeEventListener('keydown', skipHandler);
                document.getElementById('intro-screen').removeEventListener('click', skipHandler);
                if (onComplete) onComplete();
            }
        };
        document.addEventListener('keydown', skipHandler);
        document.getElementById('intro-screen').addEventListener('click', skipHandler);
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

        // Discover area on first visit
        if (areaId === 'oasis') this.player.questFlags.found_oasis = true;
        if (areaId === 'bunker') this.player.questFlags.found_bunker = true;

        // Store NPC home positions for wandering
        this.npcHomes = {};
        for (const ent of this.entities) {
            if (ent.type === 'npc') {
                this.npcHomes[ent.id] = { x: ent.x, y: ent.y };
            }
        }

        // Center camera
        this.renderer.centerOn(this.player.x, this.player.y);

        // Start area-appropriate ambient music
        this.audio.startMusic(areaId);
    }

    transitionArea(transition) {
        this.audio.playSfx('door');

        // End combat if active
        if (this.combat.active) {
            this.combat.endCombat();
        }

        // Random encounter chance when traveling between major areas
        const fromId = this.currentArea.id;
        const toId = transition.targetArea;
        const isFromEncounter = this.currentArea.isEncounter;
        if (!isFromEncounter && fromId !== toId && fromId !== 'encounter') {
            // 40% chance of random encounter between major areas
            if (Utils.percentCheck(40)) {
                const encounterTypes = ['combat', 'combat', 'trader', 'empty'];
                const encType = Utils.randChoice(encounterTypes);
                const encounterArea = generateEncounterArea(fromId, toId, encType);
                this.areas['encounter'] = encounterArea;

                // Place player at start of encounter area
                this.player.x = encounterArea.playerStart.x;
                this.player.y = encounterArea.playerStart.y;
                this.player.facing = 'east';
                this.loadArea('encounter');

                if (encType === 'combat') {
                    this.addMessage('You encounter hostiles in the wasteland!', 'combat');
                } else if (encType === 'trader') {
                    this.addMessage('You come across a trader on the road.', 'info');
                } else {
                    this.addMessage('You travel through the wasteland...', 'info');
                }
                this.hud.update();
                this.advanceTime(1);
                return;
            }
        }

        // Determine entry side based on exit position on current map
        const curMap = this.currentArea.map;
        const curH = curMap.length;
        const curW = curMap[0].length;
        const exitX = transition.x;
        const exitY = transition.y;

        // Which edge is the exit on?
        const atTop = exitY <= 1;
        const atBottom = exitY >= curH - 2;
        const atLeft = exitX <= 1;
        const atRight = exitX >= curW - 2;

        // Load target area to get its dimensions
        const targetArea = this.areas[transition.targetArea];
        if (!targetArea) return;
        const tgtH = targetArea.map.length;
        const tgtW = targetArea.map[0].length;

        // Place player on opposite edge of target area
        let entryX = transition.targetX;
        let entryY = transition.targetY;

        // For areas with same entry/exit (like caves), use the hardcoded target position
        if (targetArea.sameEntryExit) {
            // Use transition's targetX/targetY directly (or playerStart)
            entryX = transition.targetX !== undefined ? transition.targetX : (targetArea.playerStart?.x || 1);
            entryY = transition.targetY !== undefined ? transition.targetY : (targetArea.playerStart?.y || 1);
        } else if (atTop) {
            // Exited north, enter from south
            entryY = tgtH - 2;
            entryX = Utils.clamp(Math.floor(tgtW / 2), 1, tgtW - 2);
        } else if (atBottom) {
            // Exited south, enter from north
            entryY = 1;
            entryX = Utils.clamp(Math.floor(tgtW / 2), 1, tgtW - 2);
        } else if (atLeft) {
            // Exited west, enter from east
            entryX = tgtW - 2;
            entryY = Utils.clamp(Math.floor(tgtH / 2), 1, tgtH - 2);
        } else if (atRight) {
            // Exited east, enter from west
            entryX = 1;
            entryY = Utils.clamp(Math.floor(tgtH / 2), 1, tgtH - 2);
        }

        // Find a walkable tile near the entry point
        const blocked = targetArea.blocked || new Set();
        for (let r = 0; r < 5; r++) {
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    const tx = entryX + dx;
                    const ty = entryY + dy;
                    if (tx >= 0 && tx < tgtW && ty >= 0 && ty < tgtH) {
                        const tile = targetArea.map[ty][tx];
                        if (!blocked.has(tile)) {
                            entryX = tx;
                            entryY = ty;
                            r = 99; dx = 99; dy = 99; // break all loops
                        }
                    }
                }
            }
        }

        this.player.x = entryX;
        this.player.y = entryY;

        // Set facing based on entry direction
        if (atTop) this.player.facing = 'north';
        else if (atBottom) this.player.facing = 'south';
        else if (atLeft) this.player.facing = 'west';
        else if (atRight) this.player.facing = 'east';

        this.loadArea(transition.targetArea);
        this.addMessage(`Entered: ${this.currentArea.name}`, 'info');
        this.hud.update();

        // Advance time
        this.advanceTime(1);

        // Auto-save on area transition
        try { this.saveGame(); } catch (e) { /* silent fail */ }
    }

    checkTransition(x, y) {
        if (!this.currentArea || !this.currentArea.transitions) return null;
        return this.currentArea.transitions.find(t => t.x === x && t.y === y);
    }

    // ---- Fast Travel ----

    fastTravel(targetAreaId) {
        const targetArea = this.areas[targetAreaId];
        if (!targetArea) return;

        // End combat if active
        if (this.combat.active) {
            this.combat.endCombat();
        }

        // Check for random encounter based on outdoorsman skill
        const outdoorsman = (this.player.skills && this.player.skills.outdoorsman) || 0;
        // Base 50% encounter chance, reduced by outdoorsman skill
        const encounterChance = Utils.clamp(50 - outdoorsman, 10, 80);

        if (Utils.percentCheck(encounterChance)) {
            // Random encounter! Show a prompt
            this.fastTravelTarget = targetAreaId;
            this.showEncounterPrompt();
            return;
        }

        // No encounter, travel directly
        this.completeFastTravel(targetAreaId);
    }

    showEncounterPrompt() {
        // Create encounter prompt overlay
        const overlay = document.createElement('div');
        overlay.id = 'encounter-prompt';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:999;';

        const panel = document.createElement('div');
        panel.style.cssText = 'background:#1a1408;border:2px solid #3a2a10;padding:24px;text-align:center;font-family:"Special Elite","Courier New",monospace;color:#c4a44a;max-width:400px;';

        panel.innerHTML = `
            <h3 style="color:#d4a44a;margin:0 0 12px">Encounter!</h3>
            <p style="color:#a08040;margin:0 0 16px">You spot something ahead on the road. Stop to investigate?</p>
            <button id="btn-encounter-stop" style="margin:4px;padding:8px 16px;background:#2a1a08;border:1px solid #5a4a20;color:#c4a44a;cursor:pointer;font-family:inherit;">Stop</button>
            <button id="btn-encounter-skip" style="margin:4px;padding:8px 16px;background:#2a1a08;border:1px solid #5a4a20;color:#c4a44a;cursor:pointer;font-family:inherit;">Keep Moving</button>
        `;

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        document.getElementById('btn-encounter-stop').addEventListener('click', () => {
            overlay.remove();
            // Generate and enter encounter area
            const encounterTypes = ['combat', 'combat', 'trader', 'empty'];
            const encType = Utils.randChoice(encounterTypes);
            const fromId = this.currentArea.id;
            const encounterArea = generateEncounterArea(fromId, this.fastTravelTarget, encType);
            this.areas['encounter'] = encounterArea;

            this.player.x = encounterArea.playerStart.x;
            this.player.y = encounterArea.playerStart.y;
            this.player.facing = 'east';
            this.loadArea('encounter');
            this.hideScreen('map-screen');

            if (encType === 'combat') {
                this.addMessage('You encounter hostiles!', 'combat');
            } else if (encType === 'trader') {
                this.addMessage('You find a trader on the road.', 'info');
            } else {
                this.addMessage('You explore the area...', 'info');
            }
            this.hud.update();
            this.advanceTime(1);
        });

        document.getElementById('btn-encounter-skip').addEventListener('click', () => {
            overlay.remove();
            this.completeFastTravel(this.fastTravelTarget);
        });
    }

    completeFastTravel(targetAreaId) {
        const targetArea = this.areas[targetAreaId];
        if (!targetArea) return;

        const start = targetArea.playerStart || { x: 10, y: 10 };
        this.player.x = start.x;
        this.player.y = start.y;

        this.loadArea(targetAreaId);
        this.hideScreen('map-screen');
        this.addMessage(`Arrived at: ${this.currentArea.name}`, 'info');
        this.hud.update();

        // Fast travel advances more time
        this.advanceTime(Utils.randInt(2, 5));
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

    switchWeapon() {
        InventorySystem.switchWeapons(this.player);
        const weapon = InventorySystem.getEquippedWeapon(this.player);
        const name = weapon ? weapon.name : 'Unarmed';
        this.addMessage(`Switched to: ${name}`, 'combat');
        this.audio.playSfx('click');
        this.updateHighlights();
        this.hud.update();
    }

    cycleAttackMode() {
        const weapon = InventorySystem.getEquippedWeapon(this.player);
        const modes = ['normal'];
        // Aimed shot available for all weapons
        modes.push('aimed');
        // Burst only for certain ranged weapons
        if (weapon && weapon.type === 'ranged' && weapon.burstCapable) {
            modes.push('burst');
        }
        const currentIdx = modes.indexOf(this.player.attackMode || 'normal');
        const nextIdx = (currentIdx + 1) % modes.length;
        this.player.attackMode = modes[nextIdx];

        const modeDescs = {
            normal: 'Normal attack',
            aimed: 'Aimed Shot (+20% AP, +15% hit, +50% crit)',
            burst: 'Burst Fire (+3 AP, hits 1-3 times)'
        };
        this.addMessage(`Attack mode: ${modeDescs[this.player.attackMode]}`, 'combat');
        this.audio.playSfx('click');
        this.hud.update();
    }

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
        this.audio.playSfx('combat_start');
        this.showCombatBanner();
        this.combat.startCombat(participants);
        if (this.isNightTime()) {
            this.addMessage('It is dark. All combatants suffer -15% hit chance.', 'combat');
        }
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
        this.updatePlayerArmorSprite();
        this.hud.updateInventoryScreen();
        this.hud.update();
        this.addMessage('Equipment changed.', 'info');
    }

    updatePlayerArmorSprite() {
        const armor = this.player.equipment.armor;
        const armorId = armor ? armor.id : null;
        this.renderer.regeneratePlayerSprites(armorId);
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

    attemptLockpick(container) {
        // Check for lockpicks in inventory
        const hasElectronic = this.player.inventory.find(i => i.id === 'electronic_lockpick');
        const hasLockpick = this.player.inventory.find(i => i.id === 'lockpick');

        if (!hasLockpick && !hasElectronic) {
            this.addMessage(`${container.name} is locked. You need lockpicks.`, 'info');
            this.audio.playSfx('locked');
            return;
        }

        // Calculate lockpick skill
        let skill = CharacterSystem.getSkillValue(this.player, 'lockpick');
        if (hasElectronic) skill += 30;

        const difficulty = container.lockDifficulty;
        const chance = Utils.clamp(skill - difficulty + 50, 5, 95);
        const roll = Math.random() * 100;

        if (roll < chance) {
            // Success
            container.locked = false;
            this.addMessage(`You picked the lock on ${container.name}. (Skill: ${skill} vs ${difficulty})`, 'loot');
            this.audio.playSfx('unlock');
            // Consume a regular lockpick (electronic is not consumed)
            if (!hasElectronic && hasLockpick) {
                InventorySystem.removeItem(this.player, hasLockpick.uid || hasLockpick.id, 1);
                this.addMessage('Lockpick consumed.', 'info');
            }
            this.hud.showLootScreen(container);
        } else {
            // Failure - always consume a regular lockpick
            if (hasLockpick) {
                InventorySystem.removeItem(this.player, hasLockpick.uid || hasLockpick.id, 1);
                this.addMessage(`Failed to pick ${container.name}. Lockpick broke! (Skill: ${skill} vs ${difficulty})`, 'combat');
            } else {
                this.addMessage(`Failed to pick ${container.name}. (Skill: ${skill} vs ${difficulty})`, 'combat');
            }
            this.audio.playSfx('locked');
        }
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

    // Returns 0.0 (pitch black) to 1.0 (full daylight)
    getLightLevel() {
        const h = this.gameTime.hour;
        // Dawn: 5-7, Day: 7-18, Dusk: 18-20, Night: 20-5
        if (h >= 7 && h < 18) return 1.0;          // Full day
        if (h >= 18 && h < 20) return 1.0 - (h - 18) / 2 * 0.6; // Dusk
        if (h >= 5 && h < 7) return 0.4 + (h - 5) / 2 * 0.6;    // Dawn
        return 0.35;                                  // Night
    }

    isNightTime() {
        return this.getLightLevel() < 0.6;
    }

    getTimeString() {
        const h = this.gameTime.hour;
        const period = h >= 20 || h < 5 ? 'Night' : h >= 18 ? 'Dusk' : h >= 7 ? 'Day' : 'Dawn';
        return `Day ${this.gameTime.day}, ${String(h).padStart(2, '0')}:00 (${period})`;
    }

    gameOver() {
        this.audio.playSfx('death');
        this.audio.stopMusic();

        const quotes = [
            '"War... war never changes."',
            '"The wasteland does not forgive."',
            '"In the end, the dust reclaims all."',
            '"Another wanderer lost to the sands."',
            '"Your bones will bleach under the wasteland sun."',
            '"The vultures were patient. They always are."',
        ];
        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        const quoteEl = document.getElementById('death-quote');
        if (quoteEl) quoteEl.textContent = quote;

        this.showScreen('death-screen');
        this.state = 'dead';

        document.getElementById('btn-death-load').onclick = () => {
            this.hideScreen('death-screen');
            this.loadGame();
        };
        document.getElementById('btn-death-quit').onclick = () => {
            this.hideScreen('death-screen');
            this.hideScreen('game-hud');
            this.showScreen('title-screen');
            this.state = 'title';
        };
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
                oasis: createOasisArea(),
                bunker: createBunkerArea(),
            };

            // Load the saved area
            this.loadArea(saveData.currentAreaId || 'village');
            this.updatePlayerArmorSprite();

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
                ent.animState = 'walk';
                const fromX = ent.x, fromY = ent.y;
                ent.x = nx;
                ent.y = ny;
                // Smooth interpolation for NPCs
                ent.renderX = fromX;
                ent.renderY = fromY;
                let npcSub = 0;
                const npcTween = () => {
                    npcSub++;
                    const t = Math.min(1, npcSub / 14);
                    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                    ent.renderX = fromX + (nx - fromX) * ease;
                    ent.renderY = fromY + (ny - fromY) * ease;
                    if (t < 1) requestAnimationFrame(npcTween);
                    else { ent.renderX = nx; ent.renderY = ny; ent.animState = 'idle'; }
                };
                requestAnimationFrame(npcTween);
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
        if (this.currentArea && this.state !== 'title' && this.state !== 'creation' && this.state !== 'dead') {
            const gameState = {
                selectedEntity: this.selectedEntity,
                highlights: this.highlights,
                hoverTile: this.hoverTile,
                floatingTexts: this.floatingTexts,
                inCombat: this.combat.active,
                lightLevel: this.getLightLevel(),
                timeString: this.getTimeString(),
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
