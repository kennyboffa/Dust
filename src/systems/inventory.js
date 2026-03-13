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
                    CharacterSystem.heal(char, item.healAmount || 10);
                    game.addMessage(`Used ${item.name}. Healed ${item.healAmount || 10} HP.`, 'info');
                    game.audio.playSfx('pickup');
                    used = true;
                } else {
                    game.addMessage('Already at full health.', 'info');
                }
                break;
            case 'buff':
                game.addMessage(`Used ${item.name}. ${item.buffDesc || 'Feeling better.'}`, 'info');
                // Apply temporary stat boost (simplified)
                if (item.buffStat && item.buffAmount) {
                    char.special[item.buffStat] += item.buffAmount;
                    CharacterSystem.recalcStats(char);
                    // Could add a timer system for temporary buffs
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

    static getEquippedWeapon(char) {
        return char.equipment.weapon;
    }
}
