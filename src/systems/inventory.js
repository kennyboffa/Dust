// ============================================
// Dustwalker - Inventory & Equipment System
// ============================================

class InventorySystem {
    static addItem(char, item, quantity = 1) {
        // Check carry weight
        const currentWeight = CharacterSystem.getCarryWeight(char);
        const addedWeight = (item.weight || 0) * quantity;

        if (currentWeight + addedWeight > char.maxCarryWeight) {
            return { success: false, reason: 'overweight' };
        }

        // Check for stackable
        if (item.stackable) {
            const existing = char.inventory.find(i => i.id === item.id);
            if (existing) {
                existing.quantity = (existing.quantity || 1) + quantity;
                return { success: true, stacked: true };
            }
        }

        const newItem = Utils.deepClone(item);
        newItem.quantity = quantity;
        newItem.uid = Utils.uid();
        char.inventory.push(newItem);
        return { success: true, stacked: false };
    }

    static removeItem(char, itemUid, quantity = 1) {
        const idx = char.inventory.findIndex(i => i.uid === itemUid || i.id === itemUid);
        if (idx === -1) return false;

        const item = char.inventory[idx];
        if (item.quantity > quantity) {
            item.quantity -= quantity;
        } else {
            char.inventory.splice(idx, 1);
        }
        return true;
    }

    static equip(char, itemUid) {
        const item = char.inventory.find(i => i.uid === itemUid);
        if (!item) return false;

        let slot;
        if (item.type === 'weapon' || item.type === 'melee' || item.type === 'ranged') {
            slot = 'weapon';
        } else if (item.type === 'armor') {
            slot = 'armor';
        } else if (item.type === 'accessory') {
            slot = 'accessory';
        } else {
            return false;
        }

        // Unequip current
        if (char.equipment[slot]) {
            InventorySystem.unequip(char, slot);
        }

        // Remove from inventory and equip
        const idx = char.inventory.findIndex(i => i.uid === itemUid);
        char.inventory.splice(idx, 1);
        char.equipment[slot] = item;

        CharacterSystem.recalcStats(char);
        return true;
    }

    static unequip(char, slot) {
        const item = char.equipment[slot];
        if (!item) return false;

        char.equipment[slot] = null;
        char.inventory.push(item);
        CharacterSystem.recalcStats(char);
        return true;
    }

    static useItem(char, itemUid, game) {
        const item = char.inventory.find(i => i.uid === itemUid || i.id === itemUid);
        if (!item || !item.usable) return false;

        let used = false;

        switch (item.useEffect) {
            case 'heal':
                if (char.stats.hp < char.stats.maxHp) {
                    let healAmt = item.healAmount || 10;
                    if (char.perks && char.perks.includes('medic')) {
                        healAmt = Math.floor(healAmt * 1.5);
                    }
                    CharacterSystem.heal(char, healAmt);
                    game.addMessage(`Used ${item.name}. Healed ${healAmt} HP.`, 'info');
                    game.audio.playSfx('heal');
                    used = true;
                } else {
                    game.addMessage('Already at full health.', 'info');
                }
                break;
            case 'buff':
                game.addMessage(`Used ${item.name}. ${item.buffDesc || 'Feeling better.'}`, 'info');
                if (item.buffStat && item.buffAmount) {
                    // Track active buffs with duration
                    if (!char.activeBuffs) char.activeBuffs = [];
                    // Don't stack same buff
                    const existingBuff = char.activeBuffs.find(b => b.stat === item.buffStat && b.source === item.id);
                    if (existingBuff) {
                        existingBuff.turnsLeft = item.buffDuration || 20;
                        game.addMessage(`${item.name} effect refreshed.`, 'info');
                    } else {
                        char.activeBuffs.push({
                            stat: item.buffStat,
                            amount: item.buffAmount,
                            turnsLeft: item.buffDuration || 20,
                            source: item.id,
                            name: item.name,
                        });
                        char.special[item.buffStat] += item.buffAmount;
                        CharacterSystem.recalcStats(char);
                    }
                }
                used = true;
                break;
            case 'antidote':
                game.addMessage(`Used ${item.name}. Poison cleared.`, 'info');
                used = true;
                break;
            default:
                game.addMessage(`Cannot use ${item.name} right now.`, 'info');
        }

        if (used) {
            InventorySystem.removeItem(char, item.uid || item.id, 1);
        }

        return used;
    }

    static tickBuffs(char, game) {
        if (!char.activeBuffs || char.activeBuffs.length === 0) return;
        const expired = [];
        for (const buff of char.activeBuffs) {
            buff.turnsLeft--;
            if (buff.turnsLeft <= 0) {
                expired.push(buff);
            }
        }
        for (const buff of expired) {
            char.special[buff.stat] -= buff.amount;
            CharacterSystem.recalcStats(char);
            game.addMessage(`${buff.name} wore off.`, 'info');
        }
        char.activeBuffs = char.activeBuffs.filter(b => b.turnsLeft > 0);
    }

    static getEquippedWeapon(char) {
        return char.equipment.weapon;
    }
}
