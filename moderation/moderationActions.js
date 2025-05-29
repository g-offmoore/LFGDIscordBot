const { InteractionResponseFlags } = require('discord.js');
const path = require('node:path');
const fs = require('fs');

const LOG_CHANNEL_ID        = process.env.LOG_CHANNEL_ID || '983865514751320124';
const WEBHOOK_NAME         = 'ModBotRelay';
const VIBE_AVATAR_PATH     = path.join(__dirname, '../assets/modbot_vibe.png');
const HAMMER_AVATAR_PATH   = path.join(__dirname, '../assets/modbot_hammer.png');

// Preload avatar buffers
let vibeBuffer, hammerBuffer;
try { vibeBuffer = fs.readFileSync(VIBE_AVATAR_PATH); } catch { vibeBuffer = null; }
try { hammerBuffer = fs.readFileSync(HAMMER_AVATAR_PATH); } catch { hammerBuffer = null; }

module.exports = async function handleModerationButtons(client, interaction) {
  if (!interaction.isButton()) return;

  const [action, messageId] = interaction.customId.split('_');
  const mod = interaction.user;

  try {
    // Fetch the mod-alert embed for context
    const embed = interaction.message.embeds[0];
    const contentField = embed.fields.find(f => f.name === 'Content')?.value;
    const channelField = embed.fields.find(f => f.name === 'Channel')?.value;
    const userField    = embed.fields.find(f => f.name === 'User')?.value;
    const channelId    = channelField?.replace(/[<#>]/g, '');
    const userIdMatch  = /<@(\d+)>/.exec(userField || '');
    const userId       = userIdMatch ? userIdMatch[1] : null;

    let resultText = '';
    switch (action) {
      case 'warn':
        if (userId) {
          const member = await interaction.guild.members.fetch(userId).catch(() => null);
          if (member) {
            await member.send({ content: '⚠️ Your message violated our guidelines.' }).catch(() => {});
          }
        }
        await interaction.reply({ content: `⚠️ Warned ${userField}.`, flags: InteractionResponseFlags.Ephemeral });
        resultText = `⚠️ **Warned** ${userField} by ${mod.tag}`;
        break;

      case 'delete':
        await interaction.reply({ content: '❌ Message permanently deleted.', flags: InteractionResponseFlags.Ephemeral });
        resultText = `❌ **Deleted** message by ${mod.tag}`;
        break;

      case 'ban':
        if (userId) {
          const member = await interaction.guild.members.fetch(userId).catch(() => null);
          if (member) await member.ban({ reason: 'Scam/Spam auto-mod' }).catch(() => {});
        }
        await interaction.reply({ content: '🔨 Banned user.', flags: InteractionResponseFlags.Ephemeral });
        resultText = `🔨 **Banned** user by ${mod.tag}`;
        break;

      case 'allow':
        await interaction.reply({ content: '✅ Approved. Please ask the user to repost their message.', flags: InteractionResponseFlags.Ephemeral });
        resultText = `✅ **Allowed** message by ${mod.tag}`;
        break;

      default:
        return interaction.reply({ content: '❗ Unknown action.', flags: InteractionResponseFlags.Ephemeral });
    }

    // Log via webhook in the log channel
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel && logChannel.isTextBased()) {
      let hook;
      const hooks = await logChannel.fetchWebhooks().catch(() => null);
      if (hooks) hook = hooks.find(h => h.name === WEBHOOK_NAME);
      if (!hook) {
        hook = await logChannel.createWebhook({
          name:   WEBHOOK_NAME,
          avatar: vibeBuffer || client.user.displayAvatarURL({ dynamic: true }),
          reason: 'Mod log webhook'
        }).catch(() => null);
      }
      if (hook) {
        // Set avatar based on action
        const selectedAvatar = (action === 'ban' || action === 'delete') ? hammerBuffer : vibeBuffer;
        if (selectedAvatar) {
          await hook.edit({ avatar: selectedAvatar }).catch(() => {});
        }
        await hook.send({ content: resultText, username: WEBHOOK_NAME }).catch(() => {});
      }
    }

  } catch (err) {
    console.error('Moderation action error:', err);
    if (!interaction.replied) {
      await interaction.reply({ content: '⚠️ An error occurred.', flags: InteractionResponseFlags.Ephemeral });
    }
  }
};
