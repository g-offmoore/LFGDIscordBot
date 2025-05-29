// moderation/moderationActions.js
const { EmbedBuilder } = require('discord.js');
const path = require('node:path');
const fs   = require('fs');

const LOG_CHANNEL_ID     = process.env.LOG_CHANNEL_ID || '983865514751320124';
const WEBHOOK_NAME       = 'ModBot';
const VIBE_AVATAR_PATH   = path.join(__dirname, '../assets/modbot_vibe.png');
const HAMMER_AVATAR_PATH = path.join(__dirname, '../assets/modbot_hammer.png');

// preload avatar buffers
let vibeBuffer, hammerBuffer;
try { vibeBuffer  = fs.readFileSync(VIBE_AVATAR_PATH);   } catch {}
try { hammerBuffer = fs.readFileSync(HAMMER_AVATAR_PATH); } catch {}

module.exports = async function handleModerationButtons(client, interaction) {
  if (!interaction.isButton()) return;

  try {
    const [action, messageId] = interaction.customId.split('_');
    const mod = interaction.user;

    // grab embed context
    const modAlert = interaction.message;
    const embedData = modAlert.embeds[0];
    const userField    = embedData.fields.find(f => f.name === 'User')?.value;
    const channelField = embedData.fields.find(f => f.name === 'Channel')?.value;
    const reason       = embedData.fields.find(f => f.name === 'Reason')?.value;
    const content      = embedData.fields.find(f => f.name === 'Content')?.value;

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
            await member.send({ embeds: [dmEmbed] }).catch(console.error);
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
        break;

      default:
        await interaction.reply({ content: '❗ Unknown action.', ephemeral: true });
        return;
    }

    // log to mod-log via webhook
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel && logChannel.isTextBased()) {
      let hook = (await logChannel.fetchWebhooks().catch(() => null))?.find(h => h.name === WEBHOOK_NAME);
      if (!hook) {
        hook = await logChannel.createWebhook({
          name:   WEBHOOK_NAME,
          avatar: vibeBuffer || client.user.displayAvatarURL({ dynamic: true }),
          reason: 'Mod log webhook'
        }).catch(console.error);
      }
      if (hook) {
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
            { name: 'Original Msg', value: content?.slice(0, 1000) || '',     inline: false }
          )
          .setFooter({ text: `Rule ID: ${embedData.footer?.text || 'N/A'}` })
          .setTimestamp();
        await hook.send({ embeds: [logEmbed], username: WEBHOOK_NAME }).catch(console.error);
      }
    }

    // clean up: delete mod-alert message
    await modAlert.delete().catch(console.error);

  } catch (err) {
    console.error('Moderation action error:', err);
    if (!interaction.replied) {
      await interaction.reply({ content: '⚠️ An error occurred during moderation.', ephemeral: true });
    }
  }
};
