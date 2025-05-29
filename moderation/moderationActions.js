// moderation/moderationActions.js
const { InteractionResponseFlags, EmbedBuilder } = require('discord.js');
const path = require('node:path');
const fs   = require('fs');

const LOG_CHANNEL_ID      = process.env.LOG_CHANNEL_ID || '983865514751320124';
const WEBHOOK_NAME        = 'ModBot';
const VIBE_AVATAR_PATH    = path.join(__dirname, '../assets/modbot_vibe.png');
const HAMMER_AVATAR_PATH  = path.join(__dirname, '../assets/modbot_avatar.png');

// preload avatar buffers
let vibeBuffer, hammerBuffer;
try { vibeBuffer  = fs.readFileSync(VIBE_AVATAR_PATH);   } catch {}
try { hammerBuffer = fs.readFileSync(HAMMER_AVATAR_PATH); } catch {}

module.exports = async function handleModerationButtons(client, interaction) {
  if (!interaction.isButton()) return;

  const [action, messageId] = interaction.customId.split('_');
  const mod                = interaction.user;

  // grab our mod‐alert embed for context
  const embed        = interaction.message.embeds[0];
  const userField    = embed.fields.find(f => f.name === 'User')?.value;
  const channelField = embed.fields.find(f => f.name === 'Channel')?.value;
  const reason       = embed.fields.find(f => f.name === 'Reason')?.value;
  const content      = embed.fields.find(f => f.name === 'Content')?.value;

  // extract IDs
  const userIdMatch = /<@(\d+)>/.exec(userField || '');
  const userId      = userIdMatch ? userIdMatch[1] : null;

  let resultText = '';

  switch (action) {
    case 'warn': {
      if (userId) {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (member) {
          // send a DM with context
          const dmEmbed = new EmbedBuilder()
            .setTitle('⚠️ Your message was flagged')
            .setColor(0xffa500)
            .addFields(
              { name: 'Reason',       value: reason,                   inline: false },
              { name: 'Your message', value: content?.slice(0, 1000) || '', inline: false },
              { name: 'Next steps',   value: 'Please review our guidelines.', inline: false }
            );
          await member.send({ embeds: [dmEmbed] }).catch(() => {});
        }
      }

      await interaction.reply({
        content: `⚠️ Warned ${userField}.`,
        flags: InteractionResponseFlags.Ephemeral
      });
      resultText = `⚠️ **Warned** ${userField} by ${mod.tag}`;
      break;
    }


    case 'ban': {
      if (userId) {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (member) await member.ban({ reason: 'Scam/Spam auto-mod' }).catch(() => {});
      }
      await interaction.reply({
        content: '🔨 Banned user.',
        flags: InteractionResponseFlags.Ephemeral
      });
      resultText = `🔨 **Banned** user by ${mod.tag}`;
      break;
    }

    case 'allow':
      await interaction.reply({
        content: '✅ Approved. Please ask the user to repost their message.',
        flags: InteractionResponseFlags.Ephemeral
      });
      resultText = `✅ **Allowed** message by ${mod.tag}`;
      break;

    default:
      return interaction.reply({
        content: '❗ Unknown action.',
        flags: InteractionResponseFlags.Ephemeral
      });
  }

  // log the decision via webhook
  const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (logChannel && logChannel.isTextBased()) {
    let hook = (await logChannel.fetchWebhooks().catch(() => null))?.find(h => h.name === WEBHOOK_NAME);
    if (!hook) {
      hook = await logChannel.createWebhook({
        name:   WEBHOOK_NAME,
        avatar: vibeBuffer || client.user.displayAvatarURL({ dynamic: true }),
        reason: 'Mod log webhook'
      }).catch(() => null);
    }
    if (hook) {
      // pick avatar based on action
      const avatar = (action === 'ban' || action === 'delete') ? hammerBuffer : vibeBuffer;
      if (avatar) {
        await hook.edit({ avatar }).catch(() => {});
      }
      await hook.send({ content: resultText, username: WEBHOOK_NAME }).catch(() => {});
    }
  }
};
