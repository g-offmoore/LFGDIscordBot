const { SlashCommandBuilder } = require('discord.js');
const adventurers = require('../models/adventurers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('View your or someone else\'s balance')
        .addStringOption(option => option.setName('user').setDescription('Specify the user (optional)').setRequired(false)),

    run: async ({ interaction, client, handler }) => {
        try {
            const { options } = interaction;
            const targetUser = options.getString('user') || interaction.member.user.tag;

                    // Check if the interaction is in the allowed channel
                    if (interaction.channelId !== process.env.Channel2) {
						await interaction.reply({content: 'This command is only allowed in the Moonstone Menagerie channel.', ephemeral: true });
						return;
					}


            let PCharacter = await adventurers.findOne({ userid: targetUser });

            if (!PCharacter) {
                await interaction.reply('Character not found.');
                return;
            }

            await interaction.reply({content: `**${targetUser}'s Balance:**\nGold: ${PCharacter.gold}🪙\nMoonstones: ${PCharacter.moonstones}💎`,ephemeral:true});
        } catch (error) {
            console.error(error);
            await interaction.reply('An error occurred while processing the balance command.');
        }
    }
};