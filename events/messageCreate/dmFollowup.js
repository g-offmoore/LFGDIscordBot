/* eslint-disable no-inline-comments */
const { redis } = require('../../index'); // Ensure Redis client is accessible

module.exports = {
	// This function runs when the interaction is triggered
	run: async ({ interaction }) => {
		if (message.author.bot || message.content === '') return;

		// Fetch the context from Redis to check if this message is a follow-up to the 'awarditems' command
		const contextKey = `awarditemsContext:${message.author.id}`;
		const context = await redis.get(contextKey);

		if (!context) return; // If there's no context, it's not a follow-up, so do nothing

		const { userId, command } = JSON.parse(context);

		// Ensure the message is a follow-up to the 'awarditems' command
		if (command !== 'awarditems') return;

		// Now, handle the user tags in the message
		const taggedUsers = message.mentions.users;

		if (taggedUsers.size === 0) {
			// No users were tagged, inform the DM and possibly await another message
			return message.reply({ content: 'No adventurers tagged. Please tag the adventurers to award.', ephemeral: true });
		}

		// Process the tagged users here, as previously discussed in the award items logic
		// Process awards for each player
		for (const tag of playerTags) {
			let adventurer = await adventurers.findOne({ userid: UNAME });

			if (!adventurer) {
				// Create a new adventurer if not found
				adventurer = new adventurers({
					userid: UNAME,
					items: [], // Initialize with an empty inventory
					moonstones: 0, // Initial Moonstones
					gold: 0, // Initial Gold
					transactions: [], // Initialize with an empty transactions log
				});
				// Optional: Set initial values if needed, e.g., setting a default tier or other properties
			}

			// Now, whether the adventurer was just created or found, we can proceed to update their inventory and balance
			adventurer.moonstones += 1; // Awarding 1 Moonstone
			adventurer.gold += goldAmount / playerTags.length; // Evenly distribute the specified gold amount

			// Save the updated or new adventurer document
			await adventurer.save();
		}

		await interaction.reply({ content: `Successfully awarded 1 Moonstone and ${goldAmount / playerTags.length} Gold to each selected adventurer!`, ephemeral: true });


		// Don't forget to clear the Redis context after processing to clean up
		await redis.del(contextKey);
	},

	options: {
		deleted: true,
	},
};