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
const FLAG_RECORD_TTL_SECONDS = 60 * 60 * 24 * 7;

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

function formatReasons(matches) {
  return matches.map(m => m.reason).filter(Boolean).join('; ') || 'Matched auto-mod rule';
}

function formatRuleIds(matches) {
  return matches.map(m => m.id).filter(Boolean).join(',') || 'unknown';
}

async function sendAutoBanAudit(client, message, matches, record, outcome) {
  try {
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    const hook = logChannel ? await getOrCreateWebhook(logChannel) : null;
    if (!hook) return;

    const embed = new EmbedBuilder()
      .setColor(outcome.banned ? 0xff0000 : 0xffa500)
      .setTitle(outcome.banned ? 'Auto-Mod Ban Applied' : 'Auto-Mod Ban Failed')
      .addFields(
        { name: 'User', value: `${message.author.tag} (<@${message.author.id}>)`, inline: false },
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: false },
        { name: 'Reason(s)', value: formatReasons(matches).slice(0, 1000), inline: false },
        { name: 'Content', value: record.content?.slice(0, 1000) || '(none)', inline: false },
        {
          name: 'Result',
          value: [
            `Message deleted: ${outcome.deletedMessage ? 'yes' : 'no'}`,
            `User banned: ${outcome.banned ? 'yes' : 'no'}`,
            outcome.error ? `Error: ${outcome.error}` : null
          ].filter(Boolean).join('\n').slice(0, 1000),
          inline: false
        }
      )
      .setFooter({ text: `Rule IDs: ${formatRuleIds(matches)}` })
      .setTimestamp();

    await hook.send({ embeds: [embed] });
  } catch (err) {
    console.error('Error sending auto-ban audit log:', err);
  }
}

function appendOutcomeError(outcome, detail) {
  outcome.error = outcome.error ? `${outcome.error}; ${detail}` : detail;
}

async function applyAutoBan(client, message, matches, record) {
  const outcome = {
    deletedMessage: false,
    banned: false,
    error: null,
    processedAt: Date.now()
  };

  try {
    await message.delete();
    outcome.deletedMessage = true;
  } catch (err) {
    appendOutcomeError(outcome, `delete failed: ${err.message}`);
    console.error('Failed to delete auto-ban message:', err);
  }

  let member = message.member;
  if (!member) {
    member = await message.guild.members.fetch(message.author.id).catch(err => {
      appendOutcomeError(outcome, `member fetch failed: ${err.message}`);
      return null;
    });
  }

  if (!member) {
    appendOutcomeError(outcome, 'member not found in guild');
  } else if (!member.bannable) {
    appendOutcomeError(outcome, 'member is not bannable by this bot');
  } else {
    try {
      const reason = `Auto-ban: ${formatReasons(matches)} (${formatRuleIds(matches)})`.slice(0, 512);
      await member.ban({ reason });
      outcome.banned = true;
    } catch (err) {
      appendOutcomeError(outcome, `ban failed: ${err.message}`);
      console.error('Failed to auto-ban user:', err);
    }
  }

  record.status = outcome.banned ? 'auto_banned' : 'auto_ban_failed';
  record.autoBan = outcome;
  await redis.set(`flag:${message.id}`, JSON.stringify(record), { EX: FLAG_RECORD_TTL_SECONDS });
  await sendAutoBanAudit(client, message, matches, record, outcome);
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
  const autoBan = matches.some(r => r.action === 'auto_ban');
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
    status: autoBan ? 'pending_auto_ban' : 'pending',
    createdAt: Date.now()
  };
  if (softFlag) {
    record.autoApproveAt = Date.now() + AUTO_APPROVE_HOURS * 3600 * 1000;
  }
  await redis.set(`flag:${message.id}`, JSON.stringify(record), { EX: FLAG_RECORD_TTL_SECONDS });
  if (softFlag) {
    await redis.zAdd('autoApproveQueue', { score: record.autoApproveAt, value: message.id });
  }

  if (autoBan) {
    await applyAutoBan(client, message, matches, record);
    return;
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

    await hook.send({ embeds: [embed], components: [row] });
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
            if (hook) await hook.send({ embeds: [notifyEmbed] });
          });
        }
      }
    }
  }
};
