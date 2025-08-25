const { ChannelType } = require('discord.js');
const path = require('node:path');
const fs = require('fs');

const WEBHOOK_NAME = 'ModBotRelay';
const AVATAR_PATH = path.join(__dirname, '../assets/modbot_avatar.png');
let avatarBuffer;
try {
  avatarBuffer = fs.readFileSync(AVATAR_PATH);
} catch {
  avatarBuffer = null;
}

module.exports = async function getOrCreateWebhook(channel) {
  if (!channel || channel.type !== ChannelType.GuildText) return null;
  let hook;
  const webhooks = await channel.fetchWebhooks().catch(() => null);
  if (webhooks) hook = webhooks.find(h => h.name === WEBHOOK_NAME);
  if (!hook) {
    const options = { name: WEBHOOK_NAME };
    if (avatarBuffer) options.avatar = avatarBuffer;
    hook = await channel.createWebhook(options).catch(() => null);
  }
  if (hook && avatarBuffer) {
    await hook.edit({ avatar: avatarBuffer }).catch(() => {});
  }
  return hook;
};
