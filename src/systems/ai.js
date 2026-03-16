// ============================================
// Dustwalker - Enemy AI System
// ============================================

class AISystem {
    constructor(game) {
        this.game = game;
    }

    executeTurn(entity) {
        if (!entity || entity.stats.hp <= 0) {
            this.game.combat.endTurn();
            return;
        }

        switch (entity.aiType) {
            case 'aggressive':
                this.aggressiveAI(entity);
                break;
            case 'defensive':
                this.defensiveAI(entity);
                break;
            case 'ranged':
                this.rangedAI(entity);
                break;
            default:
                this.aggressiveAI(entity);
        }
    }

    aggressiveAI(entity) {
        const player = this.game.player;
        const dist = Utils.gridDistance(entity.x, entity.y, player.x, player.y);
        const attackRange = entity.attackRange || 1;

        let actionsRemaining = 3; // Max actions per turn to prevent infinite loops

        const doAction = () => {
            if (actionsRemaining <= 0 || entity.stats.ap <= 0 || entity.stats.hp <= 0) {
                setTimeout(() => this.game.combat.endTurn(), 300);
                return;
            }
            actionsRemaining--;

            const currentDist = Utils.gridDistance(entity.x, entity.y, player.x, player.y);

            if (currentDist <= attackRange && entity.stats.ap >= 3) {
                // Attack
                const weapon = entity.equipment ? InventorySystem.getEquippedWeapon(entity) : null;
                this.game.combat.attack(entity, player, weapon);
                setTimeout(doAction, 600);
            } else if (entity.stats.ap >= 1) {
                // Move towards player
                this.moveTowards(entity, player.x, player.y);
                setTimeout(doAction, 400);
            } else {
                setTimeout(() => this.game.combat.endTurn(), 300);
            }
        };

        setTimeout(doAction, 300);
    }

    defensiveAI(entity) {
        const player = this.game.player;
        const dist = Utils.gridDistance(entity.x, entity.y, player.x, player.y);
        const attackRange = entity.attackRange || 1;

        // Only attack if player is in range, otherwise hold position
        if (dist <= attackRange && entity.stats.ap >= 3) {
            const weapon = entity.equipment ? InventorySystem.getEquippedWeapon(entity) : null;
            this.game.combat.attack(entity, player, weapon);
            setTimeout(() => this.game.combat.endTurn(), 600);
        } else {
            setTimeout(() => this.game.combat.endTurn(), 300);
        }
    }

    rangedAI(entity) {
        const player = this.game.player;
        const dist = Utils.gridDistance(entity.x, entity.y, player.x, player.y);
        const attackRange = entity.attackRange || 5;

        let actionsRemaining = 2;

        const doAction = () => {
            if (actionsRemaining <= 0 || entity.stats.ap <= 0) {
                setTimeout(() => this.game.combat.endTurn(), 300);
                return;
            }
            actionsRemaining--;

            const currentDist = Utils.gridDistance(entity.x, entity.y, player.x, player.y);

            if (currentDist <= attackRange && entity.stats.ap >= 4) {
                // Attack from range
                const weapon = entity.equipment ? InventorySystem.getEquippedWeapon(entity) : null;
                this.game.combat.attack(entity, player, weapon);
                setTimeout(doAction, 600);
            } else if (currentDist < 2 && entity.stats.ap >= 1) {
                // Too close, back away
                this.moveAway(entity, player.x, player.y);
                setTimeout(doAction, 400);
            } else if (entity.stats.ap >= 1) {
                // Move closer to get in range
                this.moveTowards(entity, player.x, player.y);
                setTimeout(doAction, 400);
            } else {
                setTimeout(() => this.game.combat.endTurn(), 300);
            }
        };

        setTimeout(doAction, 300);
    }

    moveTowards(entity, targetX, targetY) {
        const path = Utils.findPath(
            entity.x, entity.y, targetX, targetY,
            (x, y) => this.game.isWalkableFor(x, y, entity) || (x === targetX && y === targetY),
            30
        );

        if (path && path.length > 0) {
            const next = path[0];
            if (this.game.isWalkableFor(next.x, next.y, entity)) {
                const mdx = next.x - entity.x;
                const mdy = next.y - entity.y;
                if (mdx !== 0 || mdy !== 0) {
                    entity.facing = this.game.getFacing(mdx, mdy);
                }
                entity.animState = 'walk';
                CharacterSystem.useAP(entity, 1);
                entity.x = next.x;
                entity.y = next.y;
                this.game.audio.playSfx('step');
                setTimeout(() => { entity.animState = 'idle'; }, 300);
            }
        }
    }

    moveAway(entity, threatX, threatY) {
        const dx = entity.x - threatX;
        const dy = entity.y - threatY;
        const ndx = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
        const ndy = dy === 0 ? 0 : (dy > 0 ? 1 : -1);

        const newX = entity.x + ndx;
        const newY = entity.y + ndy;

        if (this.game.isWalkableFor(newX, newY, entity)) {
            if (ndx !== 0 || ndy !== 0) {
                entity.facing = this.game.getFacing(ndx, ndy);
            }
            entity.animState = 'walk';
            CharacterSystem.useAP(entity, 1);
            entity.x = newX;
            entity.y = newY;
            setTimeout(() => { entity.animState = 'idle'; }, 300);
        }
    }

    // Check if any enemies can detect the player (perception vs sneak)
    checkAggro(entities, player, baseRange = 6) {
        const playerSneak = (player.skills && player.skills.sneak) || 0;
        const isSneaking = player.sneaking || false;

        // Night reduces detection range by 40%
        const nightMod = (this.game && this.game.isNightTime()) ? 0.6 : 1.0;

        const hostiles = entities.filter(e => {
            if (!e.isHostile || e.stats.hp <= 0) return false;
            const dist = Utils.gridDistance(e.x, e.y, player.x, player.y);
            // Each enemy has perception-based detection range
            const perception = (e.stats && e.stats.perception) || 5;
            const detectRange = Math.max(2, Math.floor((baseRange + Math.floor((perception - 5) / 2)) * nightMod));

            if (dist > detectRange) return false;

            // If player is sneaking, roll detection vs sneak
            if (isSneaking && dist > 1) {
                // Detection chance: base 50% + 5% per perception - 1% per sneak skill
                // Closer enemies detect more easily
                const distBonus = Math.max(0, (detectRange - dist) * 8);
                const detectChance = Utils.clamp(
                    50 + perception * 5 - playerSneak + distBonus, 5, 95
                );
                const roll = Utils.randInt(1, 100);
                return roll <= detectChance;
            }

            return true;
        });
        return hostiles;
    }
}
