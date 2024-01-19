const { Interaction } = require('discord.js');
const suggestion = require('../../models/Suggestion');
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

    const targetsuggestion = await suggestion.findOne({ suggestionId });
    const targetMessage = await interaction.channel.messages.fetch(targetsuggestion.messageId);
    const targetMessageEmbed = targetMessage.embeds[0];


    // Handle approve
    if (action === 'approve') {
      if (!interaction.memberPermissions.has('Administrator')) {
        await interaction.editReply('You do not have permission to approve suggestions.');
        return;
      }

      targetsuggestion.status = 'approved';

      targetMessageEmbed.data.color = 0x84e660;
      targetMessageEmbed.fields[1].value = '✅ Approved';

      await targetsuggestion.save();

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

      targetsuggestion.status = 'rejected';

      targetMessageEmbed.data.color = 0xff6161;
      targetMessageEmbed.fields[1].value = '❌ Rejected';

      await targetsuggestion.save();

      interaction.editReply('Suggestion rejected!');

      targetMessage.edit({
        embeds: [targetMessageEmbed],
        components: [targetMessage.components[0]],
      });

      return;
    }

    // Handle upvote and downvote
const hasUpvoted = targetsuggestion.upvotes.includes(interaction.user.id);
const hasDownvoted = targetsuggestion.downvotes.includes(interaction.user.id);

if (action === 'upvote' && !hasUpvoted) {
  // If the user has downvoted before, remove their downvote
  if (hasDownvoted) {
    targetsuggestion.downvotes = targetsuggestion.downvotes.filter((id) => id !== interaction.user.id);
  }

  targetsuggestion.upvotes.push(interaction.user.id);
  await targetsuggestion.save();

  interaction.editReply('Upvoted suggestion!');
} else if (action === 'downvote' && !hasDownvoted) {
  // If the user has upvoted before, remove their upvote
  if (hasUpvoted) {
    targetsuggestion.upvotes = targetsuggestion.upvotes.filter((id) => id !== interaction.user.id);
  }

  targetsuggestion.downvotes.push(interaction.user.id);
  await targetsuggestion.save();

  interaction.editReply('Downvoted suggestion!');
} else {
  // If the user has already voted (either upvoted or downvoted), remove their vote
  if (hasUpvoted) {
    targetsuggestion.upvotes = targetsuggestion.upvotes.filter((id) => id !== interaction.user.id);
  } else if (hasDownvoted) {
    targetsuggestion.downvotes = targetsuggestion.downvotes.filter((id) => id !== interaction.user.id);
  }

  await targetsuggestion.save();

  interaction.editReply('Vote removed!');
}

targetMessageEmbed.fields[2].value = formatResults(
  targetsuggestion.upvotes,
  targetsuggestion.downvotes
);

targetMessage.edit({
  embeds: [targetMessageEmbed],
});

  } catch (error) {
    console.log(error);
  }
};