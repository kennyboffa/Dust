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

        document.getElementById('btn-confirm-levelup').onclick = () => {
            this.game.hideScreen('levelup-screen');
        };

        this.game.showScreen('levelup-screen');
    }

    drawWorldMap() {
        const canvas = document.getElementById('map-canvas');
        const ctx = canvas.getContext('2d');

        const locations = [
            {
                id: 'village',
                name: 'Dusthaven Village',
                mapX: 200, mapY: 180,
                discovered: true,
                connections: ['cave']
            },
            {
                id: 'cave',
                name: 'Dusthaven Caves',
                mapX: 200, mapY: 80,
                discovered: this.game.player.questFlags.cave_quest_accepted || false,
                connections: ['village']
            },
            {
                id: 'wasteland_east',
                name: '???',
                mapX: 320, mapY: 150,
                discovered: false,
                connections: ['village']
            },
            {
                id: 'bunker',
                name: '???',
                mapX: 100, mapY: 250,
                discovered: false,
                connections: ['village']
            }
        ];

        this.game.renderer.drawWorldMap(ctx, locations, this.game.currentArea?.id || 'village');
    }
}
