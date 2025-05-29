// moderation/moderationActions.js
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || '983865514751320124';

module.exports = async function handleModerationButtons(client, interaction) {
  if (!interaction.isButton()) return;

  const [action, messageId] = interaction.customId.split('_');
  const mod = interaction.user;

  try {
    // Fetch the message that triggered the button
    const msg = await interaction.channel.messages.fetch(messageId).catch(() => null);
    if (!msg) {
      return interaction.reply({ content: '❗ Original message not found.', ephemeral: true });
    }

    // Fetch the member who authored the message
    const member = await interaction.guild.members.fetch(msg.author.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: '❗ User not found in server.', ephemeral: true });
    }

    let resultText;
    switch (action) {
      case 'warn':
        await member.send({
          content: '⚠️ Your message violated our community guidelines. Please contact a moderator with any questions.'
        }).catch(() => {});
        await interaction.reply({ content: `⚠️ Warned <@${member.id}>.`, ephemeral: true });
        resultText = `⚠️ **Warned** <@${member.id}> by ${mod.tag}`;
        break;

      case 'delete':
        await msg.delete().catch(() => {});
        await interaction.reply({ content: `❌ Deleted message from <@${member.id}>.`, ephemeral: true });
        resultText = `❌ **Deleted** message by ${mod.tag}`;
        break;

      case 'ban':
        await member.ban({ reason: 'Scam/Spam auto-moderation' }).catch(() => {});
        await interaction.reply({ content: `🔨 Banned <@${member.id}>.`, ephemeral: true });
        resultText = `🔨 **Banned** <@${member.id}> by ${mod.tag}`;
        break;

      case 'allow':
        await member.send({
          content: '✅ Your message was incorrectly flagged by our automated system. Thank you for your understanding.'
        }).catch(() => {});
        await interaction.reply({ content: `✅ Marked <@${member.id}> as safe.`, ephemeral: true });
        resultText = `✅ **Allowed** <@${member.id}> by ${mod.tag}`;
        break;

      default:
        return interaction.reply({ content: '❗ Unknown action.', ephemeral: true });
    }

    // Log the moderation decision
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel && resultText) {
      await logChannel.send({ content: resultText, allowedMentions: { users: [] } });
    }
  } catch (err) {
    console.error('Moderation action error:', err);
    await interaction.reply({ content: '⚠️ An error occurred during moderation.', ephemeral: true });
  }
};
