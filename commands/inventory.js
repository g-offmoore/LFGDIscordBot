const { SlashCommandBuilder } = require('discord.js');
const adventurers = require('../models/adventurers');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('inventory')
		.setDescription('View your or someone else\'s inventory')
		.addStringOption(option => option.setName('user').setDescription('Specify the user (optional)').setRequired(false)),

	run: async ({ interaction }) => {
		try {
			const { options } = interaction;
			const targetUser = options.getString('user') || interaction.member.user.tag;
			// Check if the interaction is in the allowed channel
			if (interaction.channelId !== process.env.Channel2) {
				await interaction.reply({ content: 'This command is only allowed in the Moonstone Menagerie channel.', ephemeral: true });
				return;
			}

			// Find the adventurer in the database
			const PCharacter = await adventurers.findOne({ userid: targetUser });

			if (!PCharacter) {
				await interaction.reply('Character not found.');
				return;
			}
			// Check if the items array is empty
			if (PCharacter.items.length === 0) {
				await interaction.reply({ content: 'Your inventory is empty. Go out there and acquire some items!', ephemeral: true });
				return;
			}

			const inventoryItems = PCharacter.items.map(item => `${item.quantity}x ${item.name}`).join('\n');

			await interaction.reply({ content: `**${targetUser}'s Inventory:**\n${inventoryItems}`, ephemeral: true });
		}
		catch (error) {
			console.error(error);
			await interaction.reply('An error occurred while processing the inventory command.');
		}
	},
};
