const { MessageChannel, client } = require('discord.js');
const Suggestion = require('../models/Suggestion');

module.exports = {
  data: {
    name: 'last5messages',
    description: 'Fetch the last 5 messages in a channel.',
  },
  run: async ({ interaction }) =>{
    try {
        const suggestions = await Suggestion.find();
      const channelId = '1193018806893813790'; // Replace with your actual channel ID
      const channel = interaction.guild?.channels.cache.get(channelId) ||
                      (await interaction.client.channels.fetch(channelId));

    
        const messages = await channel.messages.fetch(suggestions.messageId);

        messages.forEach((message) => {
          console.log(`Message ID: ${message.id}, Content: ${message.content}`);
        });

        // Use followUp method to send a reply in the same channel
        await interaction.reply('Fetched the last 5 messages.');

    } catch (error) {
      console.error('An unexpected error occurred:', error);
      await interaction.reply('An unexpected error occurred.');
    }
  },
  options: {
    userPermissions: ['Administrator'],
    deleted: true,
  },
};

