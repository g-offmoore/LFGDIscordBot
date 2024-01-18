const { CommandInteraction,GatewayIntentBits } = require('discord.js');
const Suggestion = require('../models/Suggestion');


module.exports = {
  data: {
    name: 'refresh-suggestions',
    description: 'Refresh all suggestion messages.',
     // Make sure only the bot owner can use this command.
  },
  
/**
 * @typedef {Object} Suggestion
 * @property {string} _id
 * @property {string} authorId
 * @property {string} guildId
 * @property {string} messageId
 * @property {string} content
 * @property {string} status
 * @property {string} developerNotes
 * @property {string[]} upvotes
 * @property {string[]} downvotes
 * @property {string} suggestionId
 * @property {Date} createdAt
 * @property {Date} updatedAt
 * @property {number} __v
 */
  /**
   * @param {Object} param0
   * @param {CommandInteraction} param0.interaction
   */
  run: async ({ interaction }) => {
    try {
      const suggestions = await Suggestion.find();
      console.log('suggestions:', suggestions);

      const targetChannelId = interaction.channelId;
      const targetChannel = interaction.guild.channels.cache.get(targetChannelId);

      // Check if the bot has the necessary permissions in the target channel
      if (!targetChannel || !targetChannel.permissionsFor(interaction.client.user).has('VIEW_CHANNEL')) {
        console.error(`Bot doesn't have the necessary permissions in the channel.`);
        return interaction.reply({ content: 'Bot doesn\'t have the necessary permissions in the channel.', ephemeral: true });
      }

      for (const suggestion of suggestions) {
        const testMessageId = suggestion.messageId;

        try {
          const targetMessage = await targetChannel.messages.fetch(testMessageId);
          console.log(`Updating message ${testMessageId} in channel ${targetChannel.name}`);

          const targetMessageEmbed = new MessageEmbed(targetMessage.embeds[0]);
          targetMessageEmbed.addFields({ name: 'Dev Notes', value: suggestion.developerNotes || 'No developer notes available' });

          await targetMessage.edit({
            content: `${interaction.user} Suggestion updated!`,
            embeds: [targetMessageEmbed],
          });

          await targetMessage.pin();
        } catch (error) {
          console.error(`Error fetching or updating message ${testMessageId}:`, error.message);
        }
      }

      await interaction.reply('All suggestion messages have been refreshed.');
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'An error occurred while refreshing suggestion messages.', ephemeral: true });
    }
  },
  options: {
    userPermissions: ['Administrator'],
    deleted: true,
  },
};
   /*   const suggestions = await Suggestion.find();
      console.log('suggestions:', suggestions);


      const targetChannelId = interaction.channelId;
      const targetChannel = interaction.guild.channels.cache.get(targetChannelId);


      // Iterate through each suggestion and update its corresponding message
      for (const suggestion of suggestions) {
        // Fetch the target message using suggestion.messageId
        const targetMessage = await targetChannel.messages.fetch(suggestion.messageId);
         
          console.log(`Updating message ${suggestion.messageId} in channel ${targetChannel.name}`);



        // Access the first embed of the target message
        const targetMessageEmbed = new EmbedBuilder(targetMessage.embeds[0]);

        // Update the suggestion embed with Dev Notes
        targetMessageEmbed
          .addFields({ name: 'Dev Notes', value: suggestion.developerNotes || 'No developer notes available' });

        // Edit the suggestion message
        await targetMessage.edit({
          content: `${interaction.user} Suggestion updated!`,
          embeds: [targetMessageEmbed],
          // ... (other components or rows if needed)
        });

        await targetMessage.pin();
      

      
    }
    await interaction.reply('All suggestion messages have been refreshed.');
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'An error occurred while refreshing suggestion messages.', ephemeral: true });
    }
  },
  options: {
    userPermissions: ['Administrator'],
    deleted: false,
  },
};
      // Fetch all suggestions from the database
      //const suggestions = await Suggestion.find();


//       // Iterate through each suggestion and update its corresponding message
//       for (const suggestion of suggestions) {
//         const targetMessage = await suggestions.messageId
//         console.log(targetMessage);
//         const targetMessageEmbed = targetMessage.embeds[0];
//         const targetSuggestion = await Suggestion.findOne({ suggestionId });
//         const targetMessage = await interaction.channel.messages.fetch(targetSuggestion.messageId);
//         const targetMessageEmbed = targetMessage.embeds[0];

//         // Update the suggestion embed with Dev Notes
//         targetMessageEmbed
//         .addFields({ name: 'Dev Notes', value: developerNotes || 'No developer notes available' });

//         // Edit the suggestion message
//         suggestionMessage.edit({
//         content: `${interaction.user} Suggestion updated!`,
//         embeds: [updatedSuggestionEmbed],
//         // ... (other components or rows if needed)
//         });
  
//         await suggestionMessage.pin();
//     }
  

//       await interaction.reply('All suggestion messages have been refreshed.');
//     } catch (error) {
//       console.error(error);
//       await interaction.reply(content='An error occurred while refreshing suggestion messages.', ephemheral=true);
//     }
//   },
//   options: {
//     userPermissions: ['Administrator'],
//     deleted: false,
//   },
// };
*/