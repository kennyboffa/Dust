// ============================================
// Dustwalker - HUD Manager
// ============================================

class HUDManager {
    constructor(game) {
        this.game = game;
    }

    update() {
        const player = this.game.player;
        if (!player) return;

        // Update old HP bar (bottom portrait)
        const hpBar = document.getElementById('hp-bar');
        const hpPercent = (player.stats.hp / player.stats.maxHp) * 100;
        hpBar.style.width = hpPercent + '%';
        hpBar.querySelector('span').textContent = `HP: ${player.stats.hp}/${player.stats.maxHp}`;

        // Update old AP bar (bottom portrait)
        const apBar = document.getElementById('ap-bar');
        const apPercent = (player.stats.ap / player.stats.maxAp) * 100;
        apBar.style.width = apPercent + '%';
        apBar.querySelector('span').textContent = `AP: ${player.stats.ap}/${player.stats.maxAp}`;

        // Update name
        document.getElementById('portrait-name').textContent =
            `${player.name} Lv.${player.level}`;

        // Update top-right status panel
        const statusHp = document.getElementById('status-hp-bar');
        if (statusHp) {
            statusHp.style.width = hpPercent + '%';
            statusHp.querySelector('span').textContent = `HP: ${player.stats.hp}/${player.stats.maxHp}`;
        }
        const statusAp = document.getElementById('status-ap-bar');
        if (statusAp) {
            statusAp.style.width = apPercent + '%';
            statusAp.querySelector('span').textContent = `AP: ${player.stats.ap}/${player.stats.maxAp}`;
        }
        const statusName = document.getElementById('status-name');
        if (statusName) {
            statusName.textContent = `${player.name} Lv.${player.level}`;
        }

        // Update location
        const area = this.game.currentArea;
        if (area) {
            document.getElementById('hud-location').textContent = area.name;
        }

        // Update time
        document.getElementById('hud-time').textContent =
            `Day ${this.game.gameTime.day} - ${String(this.game.gameTime.hour).padStart(2,'0')}:00`;

        // Update exploration status overlay (compact HP/AP bars)
        const explHpFill = document.getElementById('expl-hp-fill');
        if (explHpFill) {
            explHpFill.style.width = hpPercent + '%';
            document.getElementById('expl-hp-text').textContent = `HP ${player.stats.hp}/${player.stats.maxHp}`;
        }
        const explApFill = document.getElementById('expl-ap-fill');
        if (explApFill) {
            explApFill.style.width = apPercent + '%';
            document.getElementById('expl-ap-text').textContent = `AP ${player.stats.ap}/${player.stats.maxAp}`;
        }

        // Update tiredness/mood bars if they exist
        if (player.wellbeing) {
            const tiredBar = document.getElementById('tired-bar');
            if (tiredBar) {
                tiredBar.style.width = player.wellbeing.tiredness + '%';
                tiredBar.style.background = player.wellbeing.tiredness >= 70 ? '#c44a30' : player.wellbeing.tiredness >= 40 ? '#b87820' : '#5a8a30';
                const tiredLabel = document.getElementById('tired-label');
                if (tiredLabel) tiredLabel.textContent = `Tired: ${Math.round(player.wellbeing.tiredness)}%`;
            }
            const moodBar = document.getElementById('mood-bar');
            if (moodBar) {
                moodBar.style.width = player.wellbeing.mood + '%';
                moodBar.style.background = player.wellbeing.mood >= 90 ? '#8830c0' : player.wellbeing.mood >= 60 ? '#5040a0' : '#3060a0';
                const moodLabel = document.getElementById('mood-label');
                if (moodLabel) moodLabel.textContent = `Mood: ${player.wellbeing.mood >= 90 ? 'Depressed' : player.wellbeing.mood >= 60 ? 'Low' : player.wellbeing.mood >= 30 ? 'OK' : 'Good'}`;
            }
        }

        // Update action button states
        const btns = document.querySelectorAll('.action-btn');
        btns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.action === this.game.currentAction);
        });

        // Quick slots - show usable items
        const consumables = player.inventory.filter(i => i.usable);
        const quickSlots = document.querySelectorAll('.quick-slot');
        quickSlots.forEach((slot, idx) => {
            if (idx < consumables.length) {
                const item = consumables[idx];
                const shortName = item.name.length > 6 ? item.name.substring(0, 6) : item.name;
                slot.textContent = shortName;
                slot.title = `${item.name} (${idx + 1})`;
                slot.classList.add('has-item');
            } else {
                slot.textContent = idx + 1;
                slot.title = `Quick Slot ${idx + 1}`;
                slot.classList.remove('has-item');
            }
        });

        // Combat indicator
        const hud = document.getElementById('game-hud');
        hud.classList.toggle('combat-active', this.game.combat.active);

        // Combat overlay bar
        let combatBar = document.getElementById('combat-bar');
        if (this.game.combat.active) {
            if (!combatBar) {
                combatBar = document.createElement('div');
                combatBar.id = 'combat-bar';
                combatBar.innerHTML = `
                    <span id="combat-status">COMBAT</span>
                    <span id="combat-ap-display">AP: 0</span>
                    <div id="combat-weapon-panel">
                        <button id="combat-weapon-btn" title="Switch Weapon (W)">WEAPON</button>
                        <button id="combat-mode-btn" title="Attack Mode (Q)">MODE</button>
                    </div>
                    <button id="combat-end-turn-btn">END TURN</button>
                `;
                document.getElementById('game-hud').appendChild(combatBar);
                document.getElementById('combat-end-turn-btn').addEventListener('click', () => {
                    this.game.audio.playSfx('click');
                    this.game.combat.endTurn();
                });
                document.getElementById('combat-weapon-btn').addEventListener('click', () => {
                    this.game.audio.playSfx('click');
                    this.game.switchWeapon();
                });
                document.getElementById('combat-mode-btn').addEventListener('click', () => {
                    this.game.audio.playSfx('click');
                    this.game.cycleAttackMode();
                });
            }
            combatBar.style.display = 'flex';
            const isPlayerTurn = this.game.state === 'playerTurn';
            document.getElementById('combat-status').textContent =
                isPlayerTurn ? 'YOUR TURN' : 'ENEMY TURN';
            document.getElementById('combat-ap-display').textContent =
                `AP: ${player.stats.ap}/${player.stats.maxAp}`;
            document.getElementById('combat-end-turn-btn').style.display =
                isPlayerTurn ? 'block' : 'none';

            // Update weapon display
            const weapon = InventorySystem.getEquippedWeapon(player);
            const weaponBtn = document.getElementById('combat-weapon-btn');
            weaponBtn.textContent = weapon ? weapon.name : 'Unarmed';
            weaponBtn.title = player.equipment.weapon2
                ? `Switch to: ${player.equipment.weapon2.name} (W)`
                : 'No secondary weapon (W)';

            // Update attack mode display
            const modeBtn = document.getElementById('combat-mode-btn');
            const modeLabels = { normal: 'Normal', aimed: 'Aimed', burst: 'Burst' };
            modeBtn.textContent = modeLabels[player.attackMode || 'normal'] || 'Normal';
        } else if (combatBar) {
            combatBar.style.display = 'none';
        }
    }

    updateInventoryScreen() {
        const player = this.game.player;
        if (!player) return;

        // Equipped items
        const slots = ['weapon', 'weapon2', 'armor', 'accessory'];
        for (const slot of slots) {
            const el = document.querySelector(`.equip-slot[data-slot="${slot}"] span`);
            const item = player.equipment[slot];
            el.textContent = item ? item.name : '—';
        }

        // Inventory list
        const listEl = document.getElementById('inventory-list');
        listEl.innerHTML = '';

        for (const item of player.inventory) {
            const div = document.createElement('div');
            div.className = 'inv-item';
            div.dataset.uid = item.uid || item.id;

            const nameSpan = document.createElement('span');
            nameSpan.textContent = item.name;

            const qtySpan = document.createElement('span');
            qtySpan.className = 'item-qty';
            qtySpan.textContent = item.quantity > 1 ? `x${item.quantity}` : '';

            div.appendChild(nameSpan);
            div.appendChild(qtySpan);

            div.addEventListener('click', () => this.selectItem(item));
            listEl.appendChild(div);
        }

        // Weight
        const weight = CharacterSystem.getCarryWeight(player);
        document.getElementById('inv-weight').textContent =
            `${weight.toFixed(1)}/${player.maxCarryWeight} lbs`;
    }

    selectItem(item) {
        const detailEl = document.getElementById('item-detail-content');
        let html = `<strong>${item.name}</strong>`;
        html += `<p style="margin:6px 0;font-size:12px;color:#8a7a60">${item.desc || ''}</p>`;

        if (item.damage) html += `<div class="detail-stat">Damage: ${item.damage}</div>`;
        if (item.range) html += `<div class="detail-stat">Range: ${item.range}</div>`;
        if (item.apCost) html += `<div class="detail-stat">AP Cost: ${item.apCost}</div>`;
        if (item.armorClass) html += `<div class="detail-stat">AC: +${item.armorClass}</div>`;
        if (item.damageResist) html += `<div class="detail-stat">DR: ${item.damageResist}%</div>`;
        if (item.healAmount) html += `<div class="detail-stat">Heals: ${item.healAmount} HP</div>`;
        if (item.weight) html += `<div class="detail-stat">Weight: ${item.weight} lbs</div>`;
        if (item.value) html += `<div class="detail-stat">Value: ${item.value} caps</div>`;

        html += '<div class="detail-actions">';
        if (item.usable) {
            html += `<button onclick="window.game.useItem('${item.uid || item.id}')">Use</button>`;
        }
        if (['weapon', 'melee', 'ranged', 'armor', 'accessory'].includes(item.type)) {
            html += `<button onclick="window.game.equipItem('${item.uid}')">Equip</button>`;
        }
        html += `<button onclick="window.game.dropItem('${item.uid || item.id}')">Drop</button>`;
        html += '</div>';

        detailEl.innerHTML = html;

        // Highlight selected
        document.querySelectorAll('.inv-item').forEach(el => {
            el.classList.toggle('selected', el.dataset.uid === (item.uid || item.id));
        });
    }

    updateCharacterScreen() {
        const player = this.game.player;
        if (!player) return;

        // SPECIAL stats
        const statsEl = document.getElementById('char-stats-display');
        let statsHtml = '<h3>S.P.E.C.I.A.L.</h3>';
        for (const [key, info] of Object.entries(SPECIAL_STATS)) {
            statsHtml += `<div class="cs-stat"><span>${info.abbr}</span><span class="cs-val">${player.special[key]}</span></div>`;
        }
        statsHtml += '<h3 style="margin-top:10px">Derived</h3>';
        statsHtml += `<div class="cs-stat"><span>HP</span><span class="cs-val">${player.stats.hp}/${player.stats.maxHp}</span></div>`;
        statsHtml += `<div class="cs-stat"><span>AP</span><span class="cs-val">${player.stats.maxAp}</span></div>`;
        statsHtml += `<div class="cs-stat"><span>Melee Dmg</span><span class="cs-val">+${player.stats.meleeDmg}</span></div>`;
        statsHtml += `<div class="cs-stat"><span>Crit Chance</span><span class="cs-val">${player.stats.critChance}%</span></div>`;
        statsHtml += `<div class="cs-stat"><span>Armor Class</span><span class="cs-val">${player.stats.armorClass}</span></div>`;
        statsHtml += `<div class="cs-stat"><span>Dmg Resist</span><span class="cs-val">${player.stats.damageResist}%</span></div>`;
        statsHtml += `<div class="cs-stat"><span>XP</span><span class="cs-val">${player.xp}/${player.xpToNext}</span></div>`;
        statsHtml += `<div class="cs-stat"><span>Level</span><span class="cs-val">${player.level}</span></div>`;
        if (player.wellbeing) {
            statsHtml += '<h3 style="margin-top:10px">Wellbeing</h3>';
            const tiredColor = player.wellbeing.tiredness >= 70 ? '#c44a30' : player.wellbeing.tiredness >= 40 ? '#c4a44a' : '#6a9a40';
            const moodColor = player.wellbeing.mood >= 90 ? '#8030b0' : player.wellbeing.mood >= 60 ? '#5040a0' : '#4080c0';
            statsHtml += `<div class="cs-stat"><span>Tiredness</span><span class="cs-val" style="color:${tiredColor}">${Math.round(player.wellbeing.tiredness)}%</span></div>`;
            statsHtml += `<div class="cs-stat"><span>Mood</span><span class="cs-val" style="color:${moodColor}">${player.wellbeing.mood >= 90 ? 'Depressed' : player.wellbeing.mood >= 60 ? 'Low' : player.wellbeing.mood >= 30 ? 'OK' : 'Good'}</span></div>`;
        }
        // Bunker medical station option
        if (this.game.currentArea && this.game.currentArea.id === 'bunker') {
            const healAmount = Math.floor(player.stats.maxHp * 0.5);
            const missing = player.stats.maxHp - player.stats.hp;
            statsHtml += '<div style="margin-top:12px;border-top:1px solid #205840;padding-top:10px">';
            statsHtml += '<div style="font-size:11px;color:#50b090;letter-spacing:0.1em;margin-bottom:6px">[ MEDICAL STATION ]</div>';
            if (missing > 0) {
                statsHtml += `<button onclick="window.game.useBunkerMedStation()" style="width:100%;padding:7px 6px;background:#0a1f18;border:1px solid #205840;color:#50b090;cursor:pointer;font-family:inherit;font-size:12px">`;
                statsHtml += `Treat Wounds (+${healAmount} HP) &mdash; 2 hrs</button>`;
            } else {
                statsHtml += '<div style="font-size:11px;color:#307050">No injuries &mdash; HP Full</div>';
            }
            statsHtml += '</div>';
        }

        statsEl.innerHTML = statsHtml;

        // Skills
        const skillsEl = document.getElementById('char-skills-display');
        let skillsHtml = '<h3>Skills</h3>';
        for (const [key, skill] of Object.entries(SKILLS)) {
            const val = player.skills[key] || 0;
            const isTag = player.tagSkills.includes(key);
            skillsHtml += `<div class="cs-skill"><span>${isTag ? '* ' : ''}${skill.name}</span><span class="cs-val">${val}%</span></div>`;
        }
        skillsEl.innerHTML = skillsHtml;

        // Perks display
        const perksEl = document.getElementById('perks-list');
        if (player.perks && player.perks.length > 0) {
            let perksHtml = '';
            for (const perkId of player.perks) {
                const perk = PerkDatabase.find(p => p.id === perkId);
                if (perk) {
                    perksHtml += `<div class="perk-entry"><div class="perk-name">${perk.name}</div><div class="perk-desc">${perk.desc}</div></div>`;
                }
            }
            perksEl.innerHTML = perksHtml;
        } else {
            perksEl.innerHTML = '<span style="color:#6b5a3a;font-size:12px">None yet. Perks are offered every 3 levels.</span>';
        }
    }

    showLootScreen(container) {
        document.getElementById('loot-title').textContent = container.name;
        const itemsEl = document.getElementById('loot-items');
        itemsEl.innerHTML = '';

        for (let i = 0; i < container.items.length; i++) {
            const item = container.items[i];
            const div = document.createElement('div');
            div.className = 'loot-item';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${item.name}${item.quantity > 1 ? ' x' + item.quantity : ''}`;

            const takeBtn = document.createElement('button');
            takeBtn.textContent = 'Take';
            takeBtn.addEventListener('click', () => {
                this.game.takeItem(container, i);
                this.showLootScreen(container); // Refresh
            });

            div.appendChild(nameSpan);
            div.appendChild(takeBtn);
            itemsEl.appendChild(div);
        }

        if (container.items.length === 0) {
            itemsEl.innerHTML = '<p style="color:#6b5a3a;padding:10px">Empty</p>';
        }

        // Take All button
        document.getElementById('btn-take-all').onclick = () => {
            this.game.takeAllItems(container);
            this.showLootScreen(container);
        };

        this.game.showScreen('loot-screen');
    }
}
