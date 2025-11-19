const { ChannelType } = require('discord.js');
const path = require('node:path');
const fs = require('fs');
const getOrCreateWebhook = require('../../utils/webhooks');

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const ENV_ALLOWLIST = process.env.DM_ANNOUNCE_ALLOWLIST || '';

function loadConfigAllowlist() {
  try {
    const configPath = path.join(__dirname, '../../config/dmAllowlist.json');
    if (!fs.existsSync(configPath)) return [];

    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return Array.isArray(parsed?.userIds) ? parsed.userIds : [];
  }
  catch {
    return [];
  }
}

function getAllowlistedIds() {
  const envIds = ENV_ALLOWLIST.split(',').map(id => id.trim()).filter(Boolean);
  const configIds = loadConfigAllowlist();
  return new Set([...envIds, ...configIds]);
}

function parseAnnounceCommand(content) {
  const match = content.trim().match(/^announce\s+(?:<#?(\d+)>|(\d+))\s+([\s\S]+)/i);
  if (!match) return null;

  const channelId = match[1] || match[2];
  const message = match[3]?.trim();
  if (!channelId || !message) return null;

  return { channelId, message };
}

async function sendLog(client, content) {
  if (!LOG_CHANNEL_ID) return;

  const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (!logChannel || logChannel.type !== ChannelType.GuildText) return;

  const hook = await getOrCreateWebhook(logChannel);
  if (!hook) return;

  await hook.send({ content, username: 'ModBotRelay' }).catch(() => {});
}

module.exports = async (message, client) => {
  try {
    if (message.author.bot || message.guild) return;

    const allowlist = getAllowlistedIds();
    if (!allowlist.has(message.author.id)) return;

    const parsed = parseAnnounceCommand(message.content || '');
    if (!parsed) {
      await message.reply('Invalid format. Use `announce <channelId|#channel> <message>`.').catch(() => {});
      return;
    }

    const targetChannel = await client.channels.fetch(parsed.channelId).catch(() => null);
    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
      await message.reply('Unable to find that text channel.').catch(() => {});
      await sendLog(client, `❌ DM announce failed: invalid channel ${parsed.channelId} from ${message.author.tag}`).catch(() => {});
      return;
    }

    const hook = await getOrCreateWebhook(targetChannel);
    if (!hook) {
      await message.reply('Could not access the channel webhook.').catch(() => {});
      await sendLog(client, `❌ DM announce failed: no webhook for ${targetChannel.id} from ${message.author.tag}`).catch(() => {});
      return;
    }

    await hook.send({ content: parsed.message, username: 'ModBotRelay' });

    await message.reply('Announcement sent.').catch(() => {});
    await sendLog(client, `✅ DM announce sent to <#${targetChannel.id}> by ${message.author.tag}.`).catch(() => {});
  }
  catch (err) {
    await sendLog(client, `❌ DM announce error from ${message.author?.tag || 'unknown'}: ${err.message}`);
  }
};
