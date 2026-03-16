// ============================================
// Dustwalker - Turn-Based Combat System
// ============================================

class CombatSystem {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.turnOrder = [];
        this.currentTurnIndex = 0;
        this.combatLog = [];
        this.pendingAnimations = [];
    }

    // Start combat when enemies are nearby
    startCombat(participants) {
        this.active = true;
        this.turnOrder = [];

        // Determine turn order by sequence (2 * PER)
        for (const p of participants) {
            const seq = p.stats.sequence || 10;
            this.turnOrder.push({
                entity: p,
                sequence: seq + Utils.randInt(0, 5)
            });
        }
        this.turnOrder.sort((a, b) => b.sequence - a.sequence);
        this.currentTurnIndex = 0;

        // Restore AP for all
        for (const t of this.turnOrder) {
            CharacterSystem.restoreAP(t.entity);
        }

        this.game.addMessage('Combat begins!', 'combat');
        this.game.audio.playSfx('click');

        this.startTurn();
    }

    getCurrentEntity() {
        if (!this.active || this.turnOrder.length === 0) return null;
        return this.turnOrder[this.currentTurnIndex].entity;
    }

    startTurn() {
        const entity = this.getCurrentEntity();
        if (!entity) return;

        CharacterSystem.restoreAP(entity);

        // Tick buffs at start of player turn
        if (entity.type === 'player') {
            InventorySystem.tickBuffs(entity, this.game);
        }

        if (entity.type === 'player') {
            this.game.addMessage(`Your turn. AP: ${entity.stats.ap}`, 'info');
            this.game.setState('playerTurn');
        } else {
            this.game.addMessage(`${entity.name}'s turn.`, 'combat');
            // AI takes its turn
            setTimeout(() => this.game.ai.executeTurn(entity), 500);
        }
    }

    endTurn() {
        // Remove dead entities
        this.turnOrder = this.turnOrder.filter(t => t.entity.stats.hp > 0);

        if (this.turnOrder.length === 0) {
            this.endCombat();
            return;
        }

        // Check if combat is over
        const hasEnemies = this.turnOrder.some(t => t.entity.isHostile);
        const hasPlayer = this.turnOrder.some(t => t.entity.type === 'player');

        if (!hasEnemies) {
            this.game.addMessage('All enemies defeated!', 'combat');
            this.endCombat();
            return;
        }

        if (!hasPlayer) {
            this.game.addMessage('You have been defeated...', 'combat');
            this.endCombat();
            this.game.gameOver();
            return;
        }

        this.currentTurnIndex = (this.currentTurnIndex) % this.turnOrder.length;
        if (this.currentTurnIndex >= this.turnOrder.length) this.currentTurnIndex = 0;

        // Move to next
        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
        this.startTurn();
    }

    // Calculate hit chance
    calculateHitChance(attacker, defender, weapon) {
        let skill = 50;
        if (attacker.skills) {
            if (weapon && weapon.skill) {
                skill = attacker.skills[weapon.skill] || 50;
            } else {
                skill = attacker.skills.unarmed || attacker.skills.melee || 50;
            }
        }

        const distance = Utils.gridDistance(attacker.x, attacker.y, defender.x, defender.y);
        const distPenalty = weapon && weapon.type === 'ranged' ? (distance - 1) * 4 : 0;
        const acBonus = defender.stats.armorClass || 0;

        // Night penalty: -15% hit chance when dark (affects everyone)
        let nightPenalty = 0;
        if (this.game && this.game.isNightTime()) {
            nightPenalty = 15;
        }

        return Utils.clamp(skill - distPenalty - acBonus - nightPenalty, 5, 95);
    }

    // Perform an attack
    attack(attacker, defender, weapon) {
        const mode = attacker.attackMode || 'normal';
        let baseApCost = weapon ? (weapon.apCost || 4) : 3;
        let apCost = baseApCost;
        let hitBonus = 0;
        let critBonus = 0;
        let damageMultiplier = 1;
        let burstHits = 1;

        // Attack mode modifiers
        if (mode === 'aimed') {
            apCost = Math.ceil(baseApCost * 1.2); // +20% AP
            hitBonus = 15;
            critBonus = 50; // +50% crit chance (additive to base)
        } else if (mode === 'burst' && weapon && weapon.type === 'ranged' && weapon.burstCapable) {
            apCost = baseApCost + 3;
            burstHits = Utils.randInt(1, 3);
        }

        // Face the defender
        const adx = defender.x - attacker.x;
        const ady = defender.y - attacker.y;
        if (adx !== 0 || ady !== 0) {
            attacker.facing = this.game.getFacing(adx, ady);
        }

        // Play attack animation
        attacker.animState = 'attack';
        setTimeout(() => { attacker.animState = 'idle'; }, 500);

        if (!CharacterSystem.useAP(attacker, apCost)) {
            if (attacker.type === 'player') {
                this.game.addMessage('Not enough AP!', 'combat');
            }
            return { success: false, reason: 'no_ap' };
        }

        let totalDamage = 0;
        let anyHit = false;
        let anyCrit = false;
        let killed = false;

        for (let burst = 0; burst < burstHits; burst++) {
            if (killed) break;

            const hitChance = this.calculateHitChance(attacker, defender, weapon) + hitBonus;
            const clampedHit = Utils.clamp(hitChance, 5, 95);
            const roll = Utils.randInt(1, 100);
            const hit = roll <= clampedHit;

            if (!hit) {
                if (burstHits === 1) {
                    this.game.addMessage(
                        `${attacker.name} misses ${defender.name}! (${clampedHit}% chance)`,
                        'combat'
                    );
                    this.game.audio.playSfx('miss');
                    this.game.addFloatingText(defender.x, defender.y, 'MISS', '#aaa');
                }
                continue;
            }

            anyHit = true;

            // Calculate damage
            let damage;
            if (weapon) {
                damage = Utils.rollDice(weapon.damage || '1d4');
                if (weapon.type === 'melee') {
                    damage += attacker.stats.meleeDmg || 0;
                }
            } else {
                damage = 1 + (attacker.stats.meleeDmg || 0);
            }

            // Critical hit check
            const baseCritChance = attacker.stats.critChance || 5;
            const finalCritChance = baseCritChance + critBonus;
            const isCrit = Utils.randInt(1, 100) <= finalCritChance;
            if (isCrit) {
                damage = Math.floor(damage * 2);
                anyCrit = true;
            }

            damage = Math.floor(damage * damageMultiplier);
            const result = CharacterSystem.takeDamage(defender, damage);
            totalDamage += result.damage;

            if (result.killed) {
                killed = true;
                this.onEntityKilled(attacker, defender);
            }
        }

        if (anyHit) {
            const critText = anyCrit ? ' CRITICAL!' : '';
            const burstText = burstHits > 1 ? ` (${burstHits} round burst)` : '';
            this.game.addMessage(
                `${attacker.name} hits ${defender.name} for ${totalDamage} damage!${critText}${burstText}`,
                'combat'
            );

            const isRanged = weapon && weapon.type === 'ranged';
            if (anyCrit) {
                this.game.audio.playSfx('critical');
            } else if (isRanged) {
                this.game.audio.playSfx('gunshot');
            } else {
                this.game.audio.playSfx('hit');
            }
            this.game.addFloatingText(
                defender.x, defender.y,
                `${anyCrit ? 'CRIT! ' : ''}-${totalDamage}`,
                anyCrit ? '#ff4' : '#f44'
            );
        } else if (burstHits > 1) {
            this.game.addMessage(
                `${attacker.name}'s burst misses ${defender.name} entirely!`,
                'combat'
            );
            this.game.audio.playSfx('miss');
            this.game.addFloatingText(defender.x, defender.y, 'MISS', '#aaa');
        }

        return { success: true, hit: anyHit, damage: totalDamage, killed, critical: anyCrit };
    }

    onEntityKilled(killer, victim) {
        this.game.addMessage(`${victim.name} is dead.`, 'combat');
        this.game.audio.playSfx('death');

        // Quest tracking for special kills
        if (killer.type === 'player') {
            if (victim.name === 'Warlord Krag') {
                killer.questFlags.raider_camp_cleared = true;
                if (killer.questFlags.raider_quest_accepted) {
                    QuestSystem.advanceQuest(killer, 'raider_camp', 'return', this.game);
                }
                this.game.addMessage('Warlord Krag has fallen! Return to Hank with the news.', 'xp');
            }
        }

        // XP reward
        if (killer.type === 'player' && victim.xpReward) {
            const leveled = CharacterSystem.addXP(killer, victim.xpReward);
            this.game.addMessage(`+${victim.xpReward} XP`, 'xp');
            this.game.addFloatingText(killer.x, killer.y, `+${victim.xpReward} XP`, '#6af');

            if (leveled) {
                this.game.addMessage(`Level up! You are now level ${killer.level}!`, 'xp');
                this.game.audio.playSfx('levelup');
                this.game.showLevelUp();
            }

            // Track kill
            killer.killedEnemies[victim.name] = (killer.killedEnemies[victim.name] || 0) + 1;
        }

        // Drop loot
        if (victim.loot && victim.loot.length > 0) {
            const lootItems = [];
            for (const lootEntry of victim.loot) {
                if (Utils.percentCheck(lootEntry.chance || 100)) {
                    const item = Utils.deepClone(ItemDatabase[lootEntry.id]);
                    if (item) {
                        item.quantity = lootEntry.quantity || 1;
                        lootItems.push(item);
                    }
                }
            }
            if (lootItems.length > 0) {
                // Create a loot container at the death spot
                const container = CharacterSystem.createContainer(
                    Utils.uid(), `${victim.name}'s remains`, victim.x, victim.y, lootItems, 'bones'
                );
                this.game.addEntity(container);
            }
        }

        // Remove from entities
        this.game.removeEntity(victim);
    }

    endCombat() {
        this.active = false;
        this.turnOrder = [];
        this.currentTurnIndex = 0;
        this.game.selectedEntity = null;
        this.game.setState('exploration');
    }

    // Get valid movement tiles for current entity
    getMovementRange(entity) {
        const range = entity.stats.ap; // 1 AP per tile
        const tiles = [];
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                const nx = entity.x + dx;
                const ny = entity.y + dy;
                const dist = Utils.gridDistance(entity.x, entity.y, nx, ny);
                if (dist > 0 && dist <= range && this.game.isWalkable(nx, ny)) {
                    tiles.push({ x: nx, y: ny, cost: dist });
                }
            }
        }
        return tiles;
    }

    // Get valid attack targets in range
    getAttackRange(entity, weapon) {
        const range = weapon ? (weapon.range || 1) : 1;
        const tiles = [];
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                const nx = entity.x + dx;
                const ny = entity.y + dy;
                const dist = Utils.gridDistance(entity.x, entity.y, nx, ny);
                if (dist > 0 && dist <= range) {
                    tiles.push({ x: nx, y: ny });
                }
            }
        }
        return tiles;
    }

    // Move entity during combat (costs AP) - one tile at a time with smooth animation
    combatMove(entity, targetX, targetY) {
        // Check tile is not occupied
        if (!this.game.isWalkableFor(targetX, targetY, entity)) {
            if (entity.type === 'player') {
                this.game.addMessage('That tile is blocked!', 'combat');
            }
            return false;
        }

        const dist = Utils.gridDistance(entity.x, entity.y, targetX, targetY);
        const apCost = dist; // 1 AP per tile

        if (!CharacterSystem.useAP(entity, apCost)) {
            if (entity.type === 'player') {
                this.game.addMessage('Not enough AP to move there!', 'combat');
            }
            return false;
        }

        // Use pathfinding to find step-by-step route
        const path = Utils.findPath(
            entity.x, entity.y, targetX, targetY,
            (x, y) => this.game.isWalkableFor(x, y, entity),
            20
        );

        if (!path || path.length === 0) {
            // Direct move fallback for adjacent tiles
            const dx = targetX - entity.x;
            const dy = targetY - entity.y;
            if (dx !== 0 || dy !== 0) {
                entity.facing = this.game.getFacing(dx, dy);
            }
            const fromX = entity.x, fromY = entity.y;
            entity.x = targetX;
            entity.y = targetY;
            // Smooth visual interpolation
            entity.renderX = fromX;
            entity.renderY = fromY;
            entity.animState = 'walk';
            let sub = 0;
            const tween = () => {
                sub++;
                const t = Math.min(1, sub / 8);
                const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                entity.renderX = fromX + (targetX - fromX) * ease;
                entity.renderY = fromY + (targetY - fromY) * ease;
                if (entity.type === 'player') this.game.renderer.centerOn(entity.renderX, entity.renderY);
                if (t < 1) {
                    requestAnimationFrame(tween);
                } else {
                    entity.renderX = targetX;
                    entity.renderY = targetY;
                    entity.animState = 'idle';
                }
            };
            requestAnimationFrame(tween);
        } else {
            // Animate step-by-step along path
            this._animateCombatPath(entity, path, 0);
        }

        this.game.audio.playSfx('step');
        return true;
    }

    // Animate entity along a combat path tile by tile
    _animateCombatPath(entity, path, stepIdx) {
        if (stepIdx >= path.length) {
            entity.animState = 'idle';
            return;
        }
        const target = path[stepIdx];
        const fromX = entity.x, fromY = entity.y;
        const dx = target.x - fromX;
        const dy = target.y - fromY;
        if (dx !== 0 || dy !== 0) {
            entity.facing = this.game.getFacing(dx, dy);
        }
        entity.x = target.x;
        entity.y = target.y;
        entity.renderX = fromX;
        entity.renderY = fromY;
        entity.animState = 'walk';
        let sub = 0;
        const tween = () => {
            sub++;
            const t = Math.min(1, sub / 8);
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            entity.renderX = fromX + dx * ease;
            entity.renderY = fromY + dy * ease;
            if (entity.type === 'player') this.game.renderer.centerOn(entity.renderX, entity.renderY);
            if (t < 1) {
                requestAnimationFrame(tween);
            } else {
                entity.renderX = target.x;
                entity.renderY = target.y;
                this.game.audio.playSfx('step');
                setTimeout(() => this._animateCombatPath(entity, path, stepIdx + 1), 50);
            }
        };
        requestAnimationFrame(tween);
    }
}
