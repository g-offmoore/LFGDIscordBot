const { Interaction } = require('discord.js');
const Suggestion = require('../../models/Suggestion');
const formatResults = require('../../utils/formatResults');

/**
 *
 * @param {Interaction} interaction
 */
module.exports = async (interaction) => {
  if (!interaction.isButton() || !interaction.customId) return;

  try {
    const [type, suggestionId, action] = interaction.customId.split('.');

    if (!type || !suggestionId || !action) return;
    if (type !== 'suggestion') return;

    await interaction.deferReply({ ephemeral: true });

    const targetSuggestion = await Suggestion.findOne({ suggestionId });
    const targetMessage = await interaction.channel.messages.fetch(targetSuggestion.messageId);
    const targetMessageEmbed = targetMessage.embeds[0];


    // Handle approve
    if (action === 'approve') {
      if (!interaction.memberPermissions.has('Administrator')) {
        await interaction.editReply('You do not have permission to approve suggestions.');
        return;
      }

      targetSuggestion.status = 'approved';

      targetMessageEmbed.data.color = 0x84e660;
      targetMessageEmbed.fields[1].value = '✅ Approved';

      await targetSuggestion.save();

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

      targetSuggestion.status = 'rejected';

      targetMessageEmbed.data.color = 0xff6161;
      targetMessageEmbed.fields[1].value = '❌ Rejected';

      await targetSuggestion.save();

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
        targetSuggestion.upvotes.includes(interaction.user.id) ||
        targetSuggestion.downvotes.includes(interaction.user.id);

      if (hasVoted) {
        await interaction.editReply('You have already cast your vote for this suggestion.');
        return;
      }

      targetSuggestion.upvotes.push(interaction.user.id);

      await targetSuggestion.save();

      interaction.editReply('Upvoted suggestion!');

      targetMessageEmbed.fields[2].value = formatResults(
        targetSuggestion.upvotes,
        targetSuggestion.downvotes
      );

      targetMessage.edit({
        embeds: [targetMessageEmbed],
      });

      return;
    }

    //handle downvote
    if (action === 'downvote') {
      const hasVoted =
        targetSuggestion.upvotes.includes(interaction.user.id) ||
        targetSuggestion.downvotes.includes(interaction.user.id);

      if (hasVoted) {
        await interaction.editReply('You have already cast your vote for this suggestion.');
        return;
      }

      targetSuggestion.downvotes.push(interaction.user.id);

      await targetSuggestion.save();

      interaction.editReply('Downvoted suggestion!');

      targetMessageEmbed.fields[2].value = formatResults(
        targetSuggestion.upvotes,
        targetSuggestion.downvotes
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
          targetSuggestion.status = newStatus.toLowerCase();
          await targetSuggestion.save();
  
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
        targetSuggestion.developerNotes = developerNotes;
        await targetSuggestion.save();
  
        interaction.editReply('Developer notes updated!');
        return;
      }

  } catch (error) {
    console.log(error);
  }
};