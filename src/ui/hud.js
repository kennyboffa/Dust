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

        // Update HP bar
        const hpBar = document.getElementById('hp-bar');
        const hpPercent = (player.stats.hp / player.stats.maxHp) * 100;
        hpBar.style.width = hpPercent + '%';
        hpBar.querySelector('span').textContent = `HP: ${player.stats.hp}/${player.stats.maxHp}`;

        // Update AP bar
        const apBar = document.getElementById('ap-bar');
        const apPercent = (player.stats.ap / player.stats.maxAp) * 100;
        apBar.style.width = apPercent + '%';
        apBar.querySelector('span').textContent = `AP: ${player.stats.ap}/${player.stats.maxAp}`;

        // Update name
        document.getElementById('portrait-name').textContent =
            `${player.name} Lv.${player.level}`;

        // Update location
        const area = this.game.currentArea;
        if (area) {
            document.getElementById('hud-location').textContent = area.name;
        }

        // Update time
        document.getElementById('hud-time').textContent =
            `Day ${this.game.gameTime.day} - ${String(this.game.gameTime.hour).padStart(2,'0')}:00`;

        // Update action button states
        const btns = document.querySelectorAll('.action-btn');
        btns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.action === this.game.currentAction);
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
                    <button id="combat-end-turn-btn">END TURN</button>
                `;
                document.getElementById('game-hud').appendChild(combatBar);
                document.getElementById('combat-end-turn-btn').addEventListener('click', () => {
                    this.game.audio.playSfx('click');
                    this.game.combat.endTurn();
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
        } else if (combatBar) {
            combatBar.style.display = 'none';
        }
    }

    updateInventoryScreen() {
        const player = this.game.player;
        if (!player) return;

        // Equipped items
        const slots = ['weapon', 'armor', 'accessory'];
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
