// ============================================
// Dustwalker - Dialogue System
// ============================================

class DialogueSystem {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.currentDialogue = null;
        this.currentNode = null;
        this.npcEntity = null;
    }

    startDialogue(npcEntity) {
        const dialogueId = npcEntity.dialogueId;
        if (!dialogueId || !DialogueDatabase[dialogueId]) {
            this.game.addMessage(`${npcEntity.name} has nothing to say.`, 'dialogue');
            return;
        }

        this.active = true;
        this.currentDialogue = DialogueDatabase[dialogueId];
        this.npcEntity = npcEntity;

        // Find starting node based on quest flags
        let startNode = 'start';
        if (this.currentDialogue.getStartNode) {
            startNode = this.currentDialogue.getStartNode(this.game.player) || 'start';
        }

        this.showNode(startNode);
        this.game.showScreen('dialogue-screen');
    }

    showNode(nodeId) {
        const node = this.currentDialogue.nodes[nodeId];
        if (!node) {
            this.endDialogue();
            return;
        }

        this.currentNode = node;

        // Update UI
        document.getElementById('dialogue-npc-name').textContent = this.npcEntity.name;

        // Handle text (can be a function for dynamic text)
        const text = typeof node.text === 'function' ? node.text(this.game.player) : node.text;
        document.getElementById('dialogue-text').textContent = text;

        // Build options
        const optionsEl = document.getElementById('dialogue-options');
        optionsEl.innerHTML = '';

        const options = typeof node.options === 'function' ? node.options(this.game.player) : node.options;

        for (let i = 0; i < options.length; i++) {
            const opt = options[i];

            // Check conditions
            if (opt.condition && !opt.condition(this.game.player)) continue;

            const btn = document.createElement('button');
            btn.className = 'dialogue-option';

            let label = `${i + 1}. ${opt.text}`;

            // Skill check display
            if (opt.skillCheck) {
                const skillVal = CharacterSystem.getSkillValue(this.game.player, opt.skillCheck.skill);
                const skillName = SKILLS[opt.skillCheck.skill]?.name || opt.skillCheck.skill;
                const canPass = skillVal >= opt.skillCheck.difficulty;
                label += ` <span class="${canPass ? 'skill-req' : 'skill-fail'}">[${skillName} ${opt.skillCheck.difficulty}%]</span>`;
            }

            btn.innerHTML = label;
            btn.addEventListener('click', () => this.selectOption(opt));
            optionsEl.appendChild(btn);
        }
    }

    selectOption(option) {
        this.game.audio.playSfx('click');

        // Perform skill check if needed
        if (option.skillCheck) {
            const result = CharacterSystem.skillCheck(
                this.game.player,
                option.skillCheck.skill,
                option.skillCheck.difficulty
            );

            if (result.success) {
                this.game.addMessage(`[${SKILLS[option.skillCheck.skill]?.name}] Success!`, 'skill');
                if (option.skillCheck.xp) {
                    CharacterSystem.addXP(this.game.player, option.skillCheck.xp);
                    this.game.addMessage(`+${option.skillCheck.xp} XP`, 'xp');
                }
                if (option.onSuccess) {
                    option.onSuccess(this.game.player, this.game);
                }
                if (option.successNode) {
                    this.showNode(option.successNode);
                    return;
                }
            } else {
                this.game.addMessage(`[${SKILLS[option.skillCheck.skill]?.name}] Failed.`, 'skill');
                if (option.onFail) {
                    option.onFail(this.game.player, this.game);
                }
                if (option.failNode) {
                    this.showNode(option.failNode);
                    return;
                }
            }
        }

        // Execute action
        if (option.action) {
            option.action(this.game.player, this.game);
        }

        // Navigate to next node
        if (option.next) {
            this.showNode(option.next);
        } else if (option.end) {
            this.endDialogue();
        } else {
            this.endDialogue();
        }
    }

    endDialogue() {
        this.active = false;
        this.currentDialogue = null;
        this.currentNode = null;
        this.npcEntity = null;
        this.game.hideScreen('dialogue-screen');
        this.game.setState('exploration');
    }
}
