// moderation/moderationActions.js
const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const path = require('node:path');
const fs   = require('fs');

const redis = require('../utils/redis');
const getOrCreateWebhook = require('../utils/webhooks');

const LOG_CHANNEL_ID     = process.env.LOG_CHANNEL_ID || '983865514751320124';
const WEBHOOK_NAME       = 'ModBot';
const VIBE_AVATAR_PATH   = path.join(__dirname, '../assets/modbot_vibe.png');
const HAMMER_AVATAR_PATH = path.join(__dirname, '../assets/modbot_hammer.png');

// preload avatar buffers
let vibeBuffer, hammerBuffer;
try { vibeBuffer  = fs.readFileSync(VIBE_AVATAR_PATH);   } catch {}
try { hammerBuffer = fs.readFileSync(HAMMER_AVATAR_PATH); } catch {}

async function logAction(client, action, userField, mod, channelField, reason, content, embedFooter) {
  const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (!logChannel || !logChannel.isTextBased()) return;
  let hook = (await logChannel.fetchWebhooks().catch(() => null))?.find(h => h.name === WEBHOOK_NAME);
  if (!hook) {
    hook = await logChannel.createWebhook({
      name:   WEBHOOK_NAME,
      avatar: vibeBuffer || client.user.displayAvatarURL({ dynamic: true }),
      reason: 'Mod log webhook'
    }).catch(console.error);
  }
  if (!hook) return;
  const avatar = action === 'ban' ? hammerBuffer : vibeBuffer;
  if (avatar) await hook.edit({ avatar }).catch(console.error);

  const logEmbed = new EmbedBuilder()
    .setTitle('📝 Moderation Action')
    .setColor(action === 'ban' ? 0xff0000 : action === 'warn' ? 0xffa500 : 0x00ff00)
    .addFields(
      { name: 'Action',       value: action.toUpperCase(),             inline: true },
      { name: 'User',         value: userField,                       inline: true },
      { name: 'Moderator',    value: `${mod.tag} (<@${mod.id}>)`,     inline: true },
      { name: 'Channel',      value: channelField,                    inline: false },
      { name: 'Reason',       value: reason,                          inline: false },
      { name: 'Original Msg', value: content?.slice(0, 1000) || '',   inline: false }
    )
    .setFooter({ text: embedFooter || 'N/A' })
    .setTimestamp();
  await hook.send({ embeds: [logEmbed], username: WEBHOOK_NAME }).catch(console.error);
}

module.exports = async function handleModerationInteractions(client, interaction) {
  try {
    if (interaction.isButton()) {
      const [action, messageId] = interaction.customId.split('_');
      const mod = interaction.user;

      // load flag record
      let flag = await redis.get(`flag:${messageId}`);
      if (flag) flag = JSON.parse(flag); else flag = null;
      if (flag && flag.status !== 'pending' && action !== 'warn' && action !== 'ban') {
        await interaction.reply({ content: 'This flag has already been handled.', ephemeral: true });
        return;
      }

      // grab embed context
      const modAlert = interaction.message;
      const embedData = modAlert.embeds[0] || {};
      const userField    = embedData.fields?.find(f => f.name === 'User')?.value || '';
      const channelField = embedData.fields?.find(f => f.name === 'Channel')?.value || '';
      const reason       = embedData.fields?.find(f => f.name === 'Reason')?.value || '';
      const content      = embedData.fields?.find(f => f.name === 'Content')?.value || '';

      // extract user ID
      const userIdMatch = /<@(\d+)>/.exec(userField || '');
      const userId = userIdMatch ? userIdMatch[1] : null;

      let resultText = '';

      switch (action) {
        case 'warn':
          if (userId) {
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (member) {
              const dmEmbed = new EmbedBuilder()
                .setTitle('⚠️ Your message was flagged')
                .setColor(0xffa500)
                .addFields(
                  { name: 'Reason',        value: reason,                   inline: false },
                  { name: 'Your message',  value: content?.slice(0, 1000) || '', inline: false },
                  { name: 'Next steps',    value: 'Please review our guidelines.', inline: false }
                );
              await member.send({ embeds: [dmEmbed] }).catch(() => {});
            }
          }
          await interaction.reply({ content: `⚠️ Warned ${userField}.`, ephemeral: true });
          resultText = `Warned ${userField}`;
          break;
        case 'ban':
          if (!userId) {
            await interaction.reply({ content: '❌ Unable to extract user ID.', ephemeral: true });
            return;
          }
          {
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (!member) {
              await interaction.reply({ content: '❌ User not found in this guild.', ephemeral: true });
              return;
            }
            if (!member.bannable) {
              await interaction.reply({ content: '❌ Cannot ban this user (check permissions/role hierarchy).', ephemeral: true });
              return;
            }
            try {
              await member.ban({ reason: 'Scam/Spam auto-mod' });
            } catch (banErr) {
              console.error('Failed to ban user:', banErr);
              await interaction.reply({ content: '❌ An error occurred while banning the user.', ephemeral: true });
              return;
            }
          }
          await interaction.reply({ content: '🔨 Banned user.', ephemeral: true });
          resultText = `Banned ${userField}`;
          break;
        case 'allow':
          await interaction.reply({ content: '✅ Approved. Please ask the user to repost their message.', ephemeral: true });
          resultText = `Allowed ${userField}`;
          if (flag) {
            flag.status = 'approved';
            await redis.set(`flag:${messageId}`, JSON.stringify(flag));
          }
          break;
        case 'approve':
          await interaction.reply({ content: '✅ Approved.', ephemeral: true });
          resultText = `Approved ${userField}`;
          if (flag) {
            flag.status = 'approved';
            await redis.set(`flag:${messageId}`, JSON.stringify(flag));
            await redis.zRem('autoApproveQueue', messageId).catch(() => {});
          }
          break;
        case 'approveRepost':
          // show modal
          const modal = new ModalBuilder()
            .setCustomId(`repostModal_${messageId}`)
            .setTitle('Approve & Repost');
          const note = new TextInputBuilder()
            .setCustomId('note')
            .setLabel('Moderator note (optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setMaxLength(500);
          modal.addComponents(new ActionRowBuilder().addComponents(note));
          await interaction.showModal(modal);
          return;
        case 'delete':
          if (flag) {
            try {
              const channel = await client.channels.fetch(flag.channelId).catch(() => null);
              if (channel) {
                const msg = await channel.messages.fetch(flag.messageId).catch(() => null);
                if (msg) await msg.delete().catch(() => {});
              }
              flag.status = 'deleted';
              await redis.set(`flag:${messageId}`, JSON.stringify(flag));
              await redis.zRem('autoApproveQueue', messageId).catch(() => {});
            } catch (err) {
              console.error('Delete action failed', err);
            }
          }
          await interaction.reply({ content: '🗑️ Message deleted.', ephemeral: true });
          resultText = `Deleted ${userField}`;
          break;
        default:
          await interaction.reply({ content: '❗ Unknown action.', ephemeral: true });
          return;
      }

      await logAction(client, action, userField, mod, channelField, reason, content, embedData.footer?.text);
      await modAlert.delete().catch(() => {});
    } else if (interaction.isModalSubmit()) {
      const [prefix, messageId] = interaction.customId.split('_');
      if (prefix !== 'repostModal') return;
      let flag = await redis.get(`flag:${messageId}`);
      if (!flag) {
        await interaction.reply({ content: 'Flag record missing.', ephemeral: true });
        return;
      }
      flag = JSON.parse(flag);
      if (flag.status !== 'pending') {
        await interaction.reply({ content: 'Already processed.', ephemeral: true });
        return;
      }
      const note = interaction.fields.getTextInputValue('note') || '';
      try {
       const channel = await interaction.client.channels.fetch(flag.channelId).catch(() => null);
       const hook = await getOrCreateWebhook(channel);
        if (hook) {
          const msg = {
            content: `✅ Approved post from <@${flag.authorId}>:\n${flag.content}\n\n— Approved by <@${interaction.user.id}>${note ? `: ${note}` : ''}`,
            username: WEBHOOK_NAME
          };
          if (flag.attachmentUrls && flag.attachmentUrls.length) {
            msg.files = flag.attachmentUrls;
          }
          await hook.send(msg);
        }
        flag.status = 'approved';
        await redis.set(`flag:${messageId}`, JSON.stringify(flag));
        await redis.zRem('autoApproveQueue', messageId).catch(() => {});
      } catch (err) {
        console.error('Approve & Repost failed', err);
      }
      await interaction.reply({ content: 'Reposted.', ephemeral: true });
      await logAction(interaction.client, 'approveRepost', `<@${flag.authorId}>`, interaction.user, `<#${flag.channelId}>`, 'approved', flag.content, `Rule IDs: ${flag.ruleIds.join(',')}`);
    }
  } catch (err) {
    console.error('Moderation action error:', err);
    if (!interaction.replied) {
      await interaction.reply({ content: '⚠️ An error occurred during moderation.', ephemeral: true });
    }
  }
};
