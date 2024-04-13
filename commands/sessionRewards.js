/* eslint-disable no-inline-comments */
const { SlashCommandBuilder } = require('discord.js');
// Assuming Redis setup is already done and client is available as redisClient
const { redis } = require('../index');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('awarditems')
		.setDescription('Initiates the process to award Gold to adventurers.')
		.addIntegerOption(option =>
			option.setName('adventurers')
				.setDescription('Number of adventurers to award')
				.setRequired(true),
		)
		.addIntegerOption(option =>
			option.setName('gold')
				.setDescription('Total amount of Gold to distribute')
				.setRequired(true),
		),
	async run({ interaction }) {
		// Verify the user has permission
		const allowedRoleID = process.env.DM_ROLE_ID; // Adjust according to your environment
		if (!interaction.member.roles.cache.has(allowedRoleID)) {
			await interaction.reply({ content: 'You do not have the required role to use this command.', ephemeral: true });
			return;
		}

		const adventurersCount = interaction.options.getInteger('adventurers');
		const goldAmount = interaction.options.getInteger('gold');

		// Verify the gold can be split evenly
		if (goldAmount % adventurersCount !== 0) {
			const suggestedGold = Math.ceil(goldAmount / adventurersCount) * adventurersCount;
			await interaction.reply({ content: `The gold amount cannot be split evenly among ${adventurersCount} adventurers. Try ${suggestedGold} Gold instead.\n\n closing session.`, ephemeral: true });
			return;
		}

		// Map the MessageID and Username for the follow-up interaction
		const followUpInfo = { username: interaction.user.username, messageId: interaction.id };
		await redis.set(`awarditemsFollowUp:${interaction.id}`, JSON.stringify(followUpInfo));

		// Send follow-up ephemeral message to DM to tag each user
		await interaction.followUp({ content: `Please tag ${adventurersCount} adventurers in your next message.`, ephemeral: true });
	},
	options: {
		deleted: true,
	},
};
