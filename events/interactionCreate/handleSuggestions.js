const { Interaction } = require('discord.js');
const Suggestions = require('../../models/Suggestion');
const formatResults = require('../../utils/formatResults');

/**
 *
 * @param {Interaction} interaction
 */
module.exports = async (interaction) => {
  if (!interaction.isButton() || !interaction.customId) return;

  try {
    const [type, suggestionsId, action] = interaction.customId.split('.');

    if (!type || !suggestionsId || !action) return;
    if (type !== 'suggestions') return;

    await interaction.deferReply({ ephemeral: true });

    const targetsuggestions = await suggestions.findOne({ suggestionsId });
    const targetMessage = await interaction.channel.messages.fetch(targetsuggestions.messageId);
    const targetMessageEmbed = targetMessage.embeds[0];


    // Handle approve
    if (action === 'approve') {
      if (!interaction.memberPermissions.has('Administrator')) {
        await interaction.editReply('You do not have permission to approve suggestions.');
        return;
      }

      targetsuggestions.status = 'approved';

      targetMessageEmbed.data.color = 0x84e660;
      targetMessageEmbed.fields[1].value = '✅ Approved';

      await targetsuggestions.save();

      interaction.editReply('Suggestion approved!');

      targetMessage.edit({
        embeds: [targetMessageEmbed],
        components: [targetMessage.components[0]],
      });

      return;
    }

    // Handle reject
    if (action === 'reject') {
      if (!interaction.memberPermissions.has('Administrator')) {
        await interaction.editReply('You do not have permission to reject suggestions.');
        return;
      }

      targetsuggestions.status = 'rejected';

      targetMessageEmbed.data.color = 0xff6161;
      targetMessageEmbed.fields[1].value = '❌ Rejected';

      await targetsuggestions.save();

      interaction.editReply('Suggestion rejected!');

      targetMessage.edit({
        embeds: [targetMessageEmbed],
        components: [targetMessage.components[0]],
      });

      return;
    }

    //handle upvote
    if (action === 'upvote') {
      const hasVoted =
        targetsuggestions.upvotes.includes(interaction.user.id) ||
        targetsuggestions.downvotes.includes(interaction.user.id);

      if (hasVoted) {
        await interaction.editReply('You have already cast your vote for this suggestion.');
        return;
      }

      targetsuggestions.upvotes.push(interaction.user.id);

      await targetsuggestions.save();

      interaction.editReply('Upvoted suggestion!');

      targetMessageEmbed.fields[2].value = formatResults(
        targetsuggestions.upvotes,
        targetsuggestions.downvotes
      );

      targetMessage.edit({
        embeds: [targetMessageEmbed],
      });

      return;
    }

    //handle downvote
    if (action === 'downvote') {
      const hasVoted =
        targetsuggestions.upvotes.includes(interaction.user.id) ||
        targetsuggestions.downvotes.includes(interaction.user.id);

      if (hasVoted) {
        await interaction.editReply('You have already cast your vote for this suggestion.');
        return;
      }

      targetsuggestions.downvotes.push(interaction.user.id);

      await targetsuggestions.save();

      interaction.editReply('Downvoted suggestion!');

      targetMessageEmbed.fields[2].value = formatResults(
        targetsuggestions.upvotes,
        targetsuggestions.downvotes
      );

      targetMessage.edit({
        embeds: [targetMessageEmbed],
      });

      return;
    }

      // Handle Status Change Action
      if (action === 'status') {
        const newStatus = interaction.options.getString('status');
        if (['in progress', 'pending', 'completed'].includes(newStatus.toLowerCase())) {
          targetsuggestions.status = newStatus.toLowerCase();
          await targetsuggestions.save();
  
          targetMessageEmbed.fields[1].value = `Status: ${newStatus}`;
          interaction.editReply(`Suggestion status updated to "${newStatus}"!`);
  
          targetMessage.edit({
            embeds: [targetMessageEmbed],
            components: [targetMessage.components[0]],
          });
          return;
        } else {
          await interaction.editReply('Invalid status option. Please choose "In Progress," "Pending," or "Completed."');
          return;
        }
      }
  
      // Handle Developer Notes Action
      if (action === 'notes') {
        const developerNotes = interaction.options.getString('notes');
        targetsuggestions.developerNotes = developerNotes;
        await targetsuggestions.save();
  
        interaction.editReply('Developer notes updated!');
        return;
      }

  } catch (error) {
    console.log(error);
  }
};