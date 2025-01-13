const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('level')
		.setDescription('Displays the current character levels for D&D!'),

	run: async ({ interaction }) => {
		try {
			// Get the current month (0-11, so +1 to make it 1-12)
			const currentMonth = new Date().getMonth() + 1;
			const targetUser = interaction.options.getString('user') || interaction.member.user.tag;

			// Heroic & Afterdark level (current month + 2)
			const heroicLevel = currentMonth + 2;

			// Normie level logic (advances every 2 months)
			const normieLevel = Math.floor((currentMonth - 1) / 2) + 3;

			// Respond with level information
			await interaction.reply({
				content: `Hey ${targetUser}!\nThis month we will be at the following levels:
                \n\t_**Normal players**_ (Thursday, & Saturday players who have NOT completed the tower of trials):\n\t\tLevel: ${normieLevel}
                \n\t_**Heroic & Afterdark players:**_\n\t\tLevel: ${heroicLevel}
                \n\t_**Femme nights:**_\n\t\tPlease reach out to your DMs in <#1202722317059493938> as they use a special leveling system!`
			});
		} catch (error) {
			console.error(error);

			
			await interaction.reply(`I'm sorry, something has gone wrong. <@mooreoff> will have a look at the issue.`);
		}
	},
	options: {
		deleted: false,
	},
};
