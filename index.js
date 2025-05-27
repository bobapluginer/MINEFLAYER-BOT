const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals: { GoalFollow, GoalBlock } } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock').plugin;
const mcDataLoader = require('minecraft-data');

const bot = mineflayer.createBot({
    host: 'localhost',
    port: 52802,
    username: 'BotPvper'
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(collectBlock);

bot.once('spawn', () => {
    const mcData = mcDataLoader(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);
    bot.chat('Бот запущен и готов!');
});

bot.on('chat', async (username, message) => {
    if (username === bot.username) return;
    const args = message.split(' ');
    const command = args[0].toLowerCase();

    if (command === 'pvp') {
        const targetName = args[1];
        const target = bot.players[targetName]?.entity;
        if (!target) return bot.chat(`Не вижу игрока ${targetName}`);
        bot.chat(`Преследую и атакую ${targetName}`);
        startPvP(target);
    }

    if (message.toLowerCase() === 'komne') {
        const player = bot.players[username]?.entity;
        if (!player) return bot.chat("Не вижу тебя.");
        bot.chat(`Иду к ${username}`);
        bot.pathfinder.setGoal(new GoalFollow(player, 1), false);

        const interval = setInterval(() => {
            if (!player?.position) return clearInterval(interval);
            if (bot.entity.position.distanceTo(player.position) < 2) {
                bot.pathfinder.setGoal(null);
                bot.chat("Подошёл и остановился.");
                clearInterval(interval);
            }
        }, 500);
    }

    if (command === 'mine') {
        const oreType = args[1]?.toLowerCase();
        if (!oreType) return bot.chat('Укажи руду: gold, diamond, netherite, copper');
        mineOre(oreType);
    }
});

function startPvP(target) {
    bot.pathfinder.setGoal(new GoalFollow(target, 1), true);
    const interval = setInterval(() => {
        if (!target?.isValid) {
            bot.chat('Цель пропала.');
            clearInterval(interval);
            return;
        }
        const sword = bot.inventory.items().find(item => item.name.includes('sword'));
        if (sword) bot.equip(sword, 'hand').catch(() => {});
        if (bot.entity.position.distanceTo(target.position) <= 3) {
            bot.attack(target);
        }
    }, 500);
}

function mineOre(ore) {
    const blockNames = {
        gold: ['gold_ore', 'deepslate_gold_ore'],
        diamond: ['diamond_ore', 'deepslate_diamond_ore'],
        netherite: ['ancient_debris'],
        copper: ['copper_ore', 'deepslate_copper_ore']
    };

    const targets = blockNames[ore];
    if (!targets) return bot.chat('Неизвестный тип руды: ' + ore);

    const pickaxe = bot.inventory.items().find(i => i.name.includes('pickaxe'));
    if (!pickaxe) return bot.chat('У меня нет кирки!');

    bot.equip(pickaxe, 'hand').then(() => {
        const blocks = bot.findBlocks({
            matching: block => targets.includes(block.name),
            maxDistance: 100,
            count: 3
        });

        if (!blocks.length) return bot.chat(`Не нашёл руду: ${ore}`);

        const collectTargets = blocks.map(pos => bot.blockAt(pos)).filter(b => b);
        bot.chat(`Добываю ${ore}...`);
        bot.collectBlock.collect(collectTargets).catch(err => {
            bot.chat('Ошибка при добыче: ' + err.message);
        });
    }).catch(() => bot.chat('Не смог взять кирку в руку.'));
}
