/* eslint-disable no-inline-comments */
const redis = require('../../utils/redis'); // shared Redis client
const Adventurer = require('../../models/adventurers');

module.exports = {
	run: async ({ message }) => {
		try {
			// Ignore bots or empty messages
			if (message.author.bot || !message.content) return;

			// Only proceed if we have awarditems context in Redis
			const contextKey = `awarditemsContext:${message.author.id}`;
			const rawContext = await redis.get(contextKey);
			if (!rawContext) return;

			const { command, goldAmount } = JSON.parse(rawContext);
			if (command !== 'awarditems') return;

			// Collect tagged users
			const taggedUsers = message.mentions.users;
			if (taggedUsers.size === 0) {
				await message.reply('No adventurers tagged. Please tag the adventurers to award.');
				return;
			}

			// Compute gold per user
			const perUserGold = goldAmount / taggedUsers.size;

			// Award each tagged adventurer
			for (const [userId] of taggedUsers) {
				let adv = await Adventurer.findOne({ userid: userId });

				if (!adv) {
					adv = new Adventurer({
						userid:       userId,
						items:        [], // start empty
						moonstones:   0,
						gold:         0,
						transactions: [],
					});
				}

				adv.moonstones += 1;
				adv.gold += perUserGold;
				await adv.save();
			}

			// Confirm to the user
			await message.reply(
				`✅ Awarded 1 Moonstone and ${perUserGold} Gold to each tagged adventurer.`,
			);

			// Clean up Redis context
			await redis.del(contextKey);
		}
		catch (err) {
			console.error('Error processing awarditems follow-up:', err);
		}
	},

	options: {
		deleted: true,
	},
};
