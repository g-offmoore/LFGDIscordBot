const LOG_CHANNEL_ID = '983865514751320124';

module.exports = async function handleModerationButtons(client, interaction) {
  if (!interaction.isButton()) return;

  const [action, messageId] = interaction.customId.split('_');
  const mod = interaction.user;

  try {
    const msg = await interaction.channel.messages.fetch(messageId).catch(() => null);
    if (!msg) {
      await interaction.reply({ content: 'Original message not found.', ephemeral: true });
      return;
    }

    const member = await interaction.guild.members.fetch(msg.author.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: 'User not found in server.', ephemeral: true });
      return;
    }

    let resultText = '';
    switch (action) {
      case 'warn':
        await interaction.reply({ content: `⚠️ Warned <@${member.id}>.`, ephemeral: true });
        await member.send({
          content: "⚠️ Your message violated our community guidelines. Please reach out to a moderator or staff if you have any questions.",
        }).catch(() => {});
        resultText = `⚠️ **Warned** user <@${member.id}> by ${mod.tag}`;
        break;

      case 'delete':
        await msg.delete().catch(() => {});
        await interaction.reply({ content: `❌ Message deleted and user flagged: <@${member.id}>`, ephemeral: true });
        resultText = `❌ **Deleted** message from <@${member.id}> by ${mod.tag}`;
        break;

      case 'ban':
        await member.ban({ reason: 'Scam/Spam auto-moderation' }).catch(() => {});
        await interaction.reply({ content: `🔨 Banned <@${member.id}> from the server.`, ephemeral: true });
        resultText = `🔨 **Banned** user <@${member.id}> by ${mod.tag}`;
        break;

      case 'allow':
        const defaultMsg = "✅ Your message was incorrectly flagged by our automated system. Thank you for your patience and understanding.";
        await member.send(defaultMsg).catch(() => {});
        await interaction.reply({ content: `✅ Marked message from <@${member.id}> as safe.`, ephemeral: true });
        resultText = `✅ **Allowed** message from <@${member.id}> by ${mod.tag}`;
        break;
    }

    // Log moderation decision to a separate channel
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel && resultText) {
      await logChannel.send({
        content: resultText,
        allowedMentions: { users: [] },
      });
    }

  } catch (err) {
    console.error('Moderation action error:', err);
    await interaction.reply({ content: 'An error occurred during moderation.', ephemeral: true });
  }
};
