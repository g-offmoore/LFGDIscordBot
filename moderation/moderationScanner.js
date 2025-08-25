// moderation/moderationScanner.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const path = require('node:path');
const fs = require('fs');
const yaml = require('js-yaml');

const redis = require('../utils/redis');
const getOrCreateWebhook = require('../utils/webhooks');

const MOD_CHANNEL_ID      = '1008371145793351740';
const LOG_CHANNEL_ID      = process.env.LOG_CHANNEL_ID || '983865514751320124';
const AUTO_APPROVE_HOURS  = parseInt(process.env.AUTO_APPROVE_HOURS || '24', 10);
const RULE_FILE = path.join(__dirname, '../config/mod_rules.yaml');
const WHITELIST_ROLE_ID   = '1261745811595989044';

// Load rules with priority & action
let compiledRules = [];
try {
  const raw = fs.readFileSync(RULE_FILE, 'utf8');
  const parsed = yaml.load(raw);
  const rules = parsed.rules || [];
  compiledRules = rules.map(rule => ({
    id: rule.id,
    action: rule.action || 'flag_and_hide',
    reason: rule.reason,
    priority: rule.priority || 'primary',
    regex: new RegExp(rule.pattern, 'i')
  }));
  console.log(`Loaded ${compiledRules.length} mod rules.`);
} catch (err) {
  console.error('❌ Error loading mod rules:', err);
  process.exit(1);
}

module.exports = async function handleMessageModeration(client, message) {
  if (message.author.bot || !message.guild) return;
  const content = message.content;
  const matches = compiledRules.filter(r => r.regex.test(content));
  if (!matches.length) return;

  // Skip auto moderation for whitelisted role, but notify admins
  if (message.member?.roles.cache.has(WHITELIST_ROLE_ID)) {
    const adminIds = (process.env.ADMIN_NOTIFY_USER_IDS || '').split(',').filter(Boolean);
    if (adminIds.length) {
      const notifyEmbed = new EmbedBuilder()
        .setTitle('Whitelisted Message Flagged')
        .setColor(0x5865f2)
        .setDescription(content.slice(0, 1000) || '(none)')
        .addFields(
          { name: 'Author', value: `<@${message.author.id}>`, inline: true },
          { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
          { name: 'Reason(s)', value: matches.map(m => m.reason).join('; '), inline: false },
          { name: 'Rules', value: matches.map(m => m.id).join(', '), inline: false }
        )
        .setTimestamp();
      for (const id of adminIds) {
        const user = await client.users.fetch(id).catch(() => null);
        if (user) {
          await user.send({ embeds: [notifyEmbed] }).catch(() => {});
        }
      }
    }
    return;
  }

  const deleteMessage = matches.some(r => r.priority === 'primary' && r.action === 'flag_and_hide');
  const holdReview = matches.some(r => r.action === 'hold_for_review');
  const allSecondary = matches.every(r => r.priority === 'secondary');
  const softFlag = !deleteMessage && (holdReview || allSecondary || matches.every(r => r.action === 'flag_only'));

  const record = {
    messageId: message.id,
    channelId: message.channel.id,
    guildId: message.guild.id,
    authorId: message.author.id,
    content: content.slice(0, 2000),
    attachmentUrls: [...message.attachments.values()].map(a => a.url),
    ruleIds: matches.map(r => r.id),
    priorities: matches.map(r => r.priority),
    actions: matches.map(r => r.action),
    status: 'pending',
    createdAt: Date.now()
  };
  if (softFlag) {
    record.autoApproveAt = Date.now() + AUTO_APPROVE_HOURS * 3600 * 1000;
  }
  await redis.set(`flag:${message.id}`, JSON.stringify(record), { EX: 60 * 60 * 24 * 7 });
  if (softFlag) {
    await redis.zAdd('autoApproveQueue', { score: record.autoApproveAt, value: message.id });
  }

  if (deleteMessage) {
    try { await message.delete(); } catch (e) { console.error('Failed to delete flagged message:', e); }
  }

  try {
    const modChannel = await client.channels.fetch(MOD_CHANNEL_ID).catch(() => null);
    if (!modChannel || !modChannel.isTextBased()) return;
    const hook = await getOrCreateWebhook(modChannel);
    if (!hook) return;

    const detectedPriority = deleteMessage ? 'primary' : 'secondary';
    const embed = new EmbedBuilder()
      .setColor(deleteMessage ? 0xff0000 : 0xffa500)
      .setTitle('🚨 Message Flagged')
      .addFields(
        { name: 'User', value: `${message.author.tag} (<@${message.author.id}>)`, inline: false },
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: false },
        { name: 'Reason(s)', value: matches.map(m => m.reason).join('; '), inline: false },
        { name: 'Content', value: content.slice(0, 1000) || '(none)', inline: false },
        { name: 'Detected priority', value: detectedPriority, inline: false }
      )
      .setFooter({ text: `Rule IDs: ${matches.map(m => m.id).join(',')}` })
      .setTimestamp();

    const row = new ActionRowBuilder();
    row.addComponents(new ButtonBuilder().setCustomId(`warn_${message.id}`).setLabel('⚠️ Warn').setStyle(ButtonStyle.Primary));
    row.addComponents(new ButtonBuilder().setCustomId(`ban_${message.id}`).setLabel('🔨 Ban').setStyle(ButtonStyle.Danger));
    if (deleteMessage) {
      row.addComponents(new ButtonBuilder().setCustomId(`allow_${message.id}`).setLabel('✅ Allow').setStyle(ButtonStyle.Success));
      row.addComponents(new ButtonBuilder().setCustomId(`approveRepost_${message.id}`).setLabel('Approve & Repost').setStyle(ButtonStyle.Secondary));
    } else {
      row.addComponents(new ButtonBuilder().setCustomId(`delete_${message.id}`).setLabel('🗑️ Delete').setStyle(ButtonStyle.Danger));
      row.addComponents(new ButtonBuilder().setCustomId(`approve_${message.id}`).setLabel('Approve').setStyle(ButtonStyle.Success));
      row.addComponents(new ButtonBuilder().setCustomId(`approveRepost_${message.id}`).setLabel('Approve & Repost').setStyle(ButtonStyle.Secondary));
    }

    await hook.send({ username: 'ModBotRelay', embeds: [embed], components: [row] });
  } catch (err) {
    console.error('Error sending mod alert via webhook:', err);
  }

  // Notify admins for soft flags
  if (softFlag) {
    const adminIds = (process.env.ADMIN_NOTIFY_USER_IDS || '').split(',').filter(Boolean);
    if (adminIds.length) {
      const notifyEmbed = new EmbedBuilder()
        .setTitle('Soft Flag Created')
        .setColor(0xffa500)
        .setDescription(content.slice(0, 1000) || '(none)')
        .addFields(
          { name: 'Author', value: `<@${message.author.id}>`, inline: true },
          { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
          { name: 'Rules', value: matches.map(m => m.id).join(', '), inline: false },
          { name: 'Auto-approve', value: `<t:${Math.floor(record.autoApproveAt/1000)}:R>`, inline: false }
        );
      for (const id of adminIds) {
        const user = await client.users.fetch(id).catch(() => null);
        if (user) {
          await user.send({ embeds: [notifyEmbed] }).catch(async () => {
            const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
            const hook = logChannel ? await getOrCreateWebhook(logChannel) : null;
            if (hook) await hook.send({ embeds: [notifyEmbed], username: 'ModBot' });
          });
        }
      }
    }
  }
};
