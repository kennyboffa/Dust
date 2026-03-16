// ============================================
// Dustwalker - Screen Manager (Character Creation, Level Up, Map)
// ============================================

class ScreenManager {
    constructor(game) {
        this.game = game;
    }

    setupCharCreation() {
        const statsEl = document.getElementById('special-stats');
        statsEl.innerHTML = '';

        const stats = {
            strength: 5, perception: 5, endurance: 5, charisma: 5,
            intelligence: 5, agility: 5, luck: 5
        };
        let pointsUsed = 0;
        const maxPoints = 5;
        const taggedSkills = new Set();

        const updatePoints = () => {
            document.getElementById('stat-points-remaining').textContent = maxPoints - pointsUsed;
        };

        for (const [key, info] of Object.entries(SPECIAL_STATS)) {
            const row = document.createElement('div');
            row.className = 'stat-row';

            const name = document.createElement('span');
            name.className = 'stat-name';
            name.textContent = `${info.abbr} - ${key.charAt(0).toUpperCase() + key.slice(1)}`;

            const minus = document.createElement('button');
            minus.textContent = '-';
            minus.addEventListener('click', () => {
                if (stats[key] > 1) {
                    stats[key]--;
                    pointsUsed--;
                    val.textContent = stats[key];
                    updatePoints();
                }
            });

            const val = document.createElement('span');
            val.className = 'stat-value';
            val.textContent = stats[key];

            const plus = document.createElement('button');
            plus.textContent = '+';
            plus.addEventListener('click', () => {
                if (stats[key] < 10 && pointsUsed < maxPoints) {
                    stats[key]++;
                    pointsUsed++;
                    val.textContent = stats[key];
                    updatePoints();
                }
            });

            const desc = document.createElement('span');
            desc.className = 'stat-desc';
            desc.textContent = info.desc;

            row.appendChild(name);
            row.appendChild(minus);
            row.appendChild(val);
            row.appendChild(plus);
            row.appendChild(desc);
            statsEl.appendChild(row);
        }

        // Tag skills
        const tagEl = document.getElementById('tag-skills');
        tagEl.innerHTML = '';

        for (const [key, skill] of Object.entries(SKILLS)) {
            const label = document.createElement('label');
            label.className = 'skill-tag';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    if (taggedSkills.size >= 3) {
                        checkbox.checked = false;
                        return;
                    }
                    taggedSkills.add(key);
                } else {
                    taggedSkills.delete(key);
                }
                // Update styling
                document.querySelectorAll('.skill-tag').forEach(el => {
                    el.classList.toggle('tagged', el.querySelector('input').checked);
                });
            });

            const span = document.createElement('span');
            span.textContent = `${skill.name} (${skill.category})`;

            label.appendChild(checkbox);
            label.appendChild(span);
            tagEl.appendChild(label);
        }

        // Start game button
        document.getElementById('btn-start-game').addEventListener('click', () => {
            if (taggedSkills.size < 3) {
                alert('Please select 3 tag skills!');
                return;
            }

            const name = document.getElementById('char-name').value || 'Wanderer';
            this.game.startNewGame(name, stats, Array.from(taggedSkills));
        });

        document.getElementById('btn-back-title').addEventListener('click', () => {
            this.game.showScreen('title-screen');
        });
    }

    setupLevelUpScreen() {
        const player = this.game.player;
        const content = document.getElementById('levelup-skills');
        content.innerHTML = '';

        document.getElementById('new-level').textContent = player.level;
        document.getElementById('skill-points-available').textContent = player.skillPoints;

        const pointsAllocated = {};

        for (const [key, skill] of Object.entries(SKILLS)) {
            const row = document.createElement('div');
            row.className = 'levelup-skill-row';

            const name = document.createElement('span');
            name.className = 'skill-name';
            const isTag = player.tagSkills.includes(key);
            name.textContent = `${isTag ? '* ' : ''}${skill.name}`;

            const val = document.createElement('span');
            val.className = 'skill-val';
            val.textContent = player.skills[key] || 0;

            const plus = document.createElement('button');
            plus.textContent = '+';
            plus.addEventListener('click', () => {
                if (player.skillPoints > 0) {
                    CharacterSystem.investSkillPoint(player, key);
                    val.textContent = player.skills[key];
                    document.getElementById('skill-points-available').textContent = player.skillPoints;
                }
            });

            row.appendChild(name);
            row.appendChild(val);
            row.appendChild(plus);
            content.appendChild(row);
        }

        // Perk selection every 3 levels
        const perkSection = document.getElementById('levelup-perks');
        if (perkSection) perkSection.remove();

        if (player.level % 3 === 0) {
            const availablePerks = PerkSystem.getAvailablePerks(player);
            if (availablePerks.length > 0) {
                const perkDiv = document.createElement('div');
                perkDiv.id = 'levelup-perks';
                perkDiv.innerHTML = '<h3 style="margin-top:12px;color:#d4a44a">Choose a Perk</h3>';

                let selectedPerkId = null;

                for (const perk of availablePerks) {
                    const entry = document.createElement('div');
                    entry.className = 'perk-pick';
                    entry.innerHTML = `<div class="perk-name">${perk.name}</div><div class="perk-desc">${perk.desc}</div>`;
                    entry.addEventListener('click', () => {
                        selectedPerkId = perk.id;
                        perkDiv.querySelectorAll('.perk-pick').forEach(el => el.classList.remove('selected'));
                        entry.classList.add('selected');
                    });
                    perkDiv.appendChild(entry);
                }

                content.parentNode.insertBefore(perkDiv, document.getElementById('btn-confirm-levelup'));

                document.getElementById('btn-confirm-levelup').onclick = () => {
                    if (selectedPerkId) {
                        PerkSystem.applyPerk(player, selectedPerkId);
                        this.game.addMessage(`Perk acquired: ${PerkDatabase.find(p => p.id === selectedPerkId).name}`, 'xp');
                    }
                    this.game.hideScreen('levelup-screen');
                };
            } else {
                document.getElementById('btn-confirm-levelup').onclick = () => {
                    this.game.hideScreen('levelup-screen');
                };
            }
        } else {
            document.getElementById('btn-confirm-levelup').onclick = () => {
                this.game.hideScreen('levelup-screen');
            };
        }

        this.game.showScreen('levelup-screen');
    }

    drawWorldMap() {
        const canvas = document.getElementById('map-canvas');
        const ctx = canvas.getContext('2d');

        this.worldMapLocations = [
            {
                id: 'village',
                name: 'Dusthaven Village',
                mapX: 200, mapY: 180,
                discovered: true,
                connections: ['cave', 'oasis']
            },
            {
                id: 'cave',
                name: 'Dusthaven Caves',
                mapX: 200, mapY: 80,
                discovered: this.game.player.questFlags.cave_quest_accepted || false,
                connections: ['village']
            },
            {
                id: 'wasteland',
                name: 'Raider Camp',
                mapX: 320, mapY: 150,
                discovered: this.game.player.questFlags.raider_quest_accepted || this.game.player.questFlags.met_hank || false,
                connections: ['village']
            },
            {
                id: 'oasis',
                name: 'Desert Oasis',
                mapX: 80, mapY: 180,
                discovered: this.game.player.questFlags.found_oasis || this.game.areaStates['oasis'] !== undefined,
                connections: ['village', 'bunker']
            },
            {
                id: 'bunker',
                name: 'Pre-War Bunker',
                mapX: 80, mapY: 260,
                discovered: this.game.player.questFlags.found_bunker || this.game.areaStates['bunker'] !== undefined,
                connections: ['oasis']
            }
        ];

        this.game.renderer.drawWorldMap(ctx, this.worldMapLocations, this.game.currentArea?.id || 'village');

        // Set up click handler for fast travel
        canvas.onclick = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;

            for (const loc of this.worldMapLocations) {
                if (!loc.discovered || loc.id === (this.game.currentArea?.id || 'village')) continue;
                const dx = mx - loc.mapX;
                const dy = my - loc.mapY;
                if (dx * dx + dy * dy < 20 * 20) {
                    this.game.fastTravel(loc.id);
                    return;
                }
            }
        };
    }
}
