// ============================================
// Dustwalker - Quest Definitions
// ============================================

const QuestDatabase = {
    cave_crystal: {
        id: 'cave_crystal',
        name: 'The Dust Crystal',
        giver: 'Elder Mara',
        description: 'Elder Mara has asked you to venture into the Dusthaven Caves and retrieve a Dust Crystal from the deepest chamber.',
        stages: [
            { id: 'accepted', text: 'Enter the Dusthaven Caves north of the village.' },
            { id: 'crystal_found', text: 'Retrieve the Dust Crystal from the caves.' },
            { id: 'return', text: 'Return the Dust Crystal to Elder Mara.' },
            { id: 'complete', text: 'Quest complete! Dusthaven is saved.' },
        ],
        rewards: '200 Bottle Caps, Leather Armor, 500 XP',
    },

    raider_camp: {
        id: 'raider_camp',
        name: 'Raider Menace',
        giver: 'Hank the Merchant',
        description: 'Raiders led by Warlord Krag have set up camp east of Dusthaven. Hank wants them dealt with before they attack the village.',
        stages: [
            { id: 'accepted', text: 'Travel east to find the raider camp.' },
            { id: 'clear_camp', text: 'Eliminate the raiders and their leader, Warlord Krag.' },
            { id: 'return', text: 'Return to Hank with news of your victory.' },
            { id: 'complete', text: 'Quest complete! The raider threat is eliminated.' },
        ],
        rewards: '300 Bottle Caps, Sawed-Off Shotgun or 150 extra Caps',
    },
};

class QuestSystem {
    static getActiveQuests(player) {
        const quests = [];
        for (const [id, quest] of Object.entries(QuestDatabase)) {
            const stageFlag = player.questFlags[`quest_${id}_stage`];
            if (stageFlag !== undefined && stageFlag !== 'complete') {
                quests.push({ ...quest, currentStage: stageFlag });
            }
        }
        return quests;
    }

    static getCompletedQuests(player) {
        const quests = [];
        for (const [id, quest] of Object.entries(QuestDatabase)) {
            if (player.questFlags[`quest_${id}_stage`] === 'complete') {
                quests.push({ ...quest, currentStage: 'complete' });
            }
        }
        return quests;
    }

    static startQuest(player, questId, game) {
        const quest = QuestDatabase[questId];
        if (!quest) return;
        player.questFlags[`quest_${questId}_stage`] = quest.stages[0].id;
        game.addMessage(`New quest: ${quest.name}`, 'xp');
    }

    static advanceQuest(player, questId, stageId, game) {
        player.questFlags[`quest_${questId}_stage`] = stageId;
        const quest = QuestDatabase[questId];
        if (quest) {
            const stage = quest.stages.find(s => s.id === stageId);
            if (stage) {
                if (stageId === 'complete') {
                    game.addMessage(`Quest complete: ${quest.name}`, 'xp');
                } else {
                    game.addMessage(`Quest updated: ${quest.name}`, 'info');
                }
            }
        }
    }

    static getCurrentStageText(player, questId) {
        const quest = QuestDatabase[questId];
        if (!quest) return '';
        const stageId = player.questFlags[`quest_${questId}_stage`];
        const stage = quest.stages.find(s => s.id === stageId);
        return stage ? stage.text : '';
    }
}
