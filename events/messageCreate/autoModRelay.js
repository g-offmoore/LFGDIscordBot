const { WebhookClient } = require('discord.js');
const path = require('node:path');
const fs = require('fs');

const WEBHOOK_NAME = 'ModBotRelay';
const AVATAR_PATH = path.join(__dirname, '../../assets/modbot_avatar.png');

let avatarBuffer;
try {
  avatarBuffer = fs.readFileSync(AVATAR_PATH);
} catch {
  avatarBuffer = null;
}

module.exports = async message => {
  if (message.author.bot || !message.guild) return;

  const prefixRegex = /^auto-mod:/i;
  if (!prefixRegex.test(message.content)) return;

  const relayContent = message.content.replace(prefixRegex, '').trim();
  if (!relayContent) return;

  try {
    await message.delete();
  } catch (err) {
    console.error('Failed to delete Auto-Mod trigger:', err);
  }

  try {
    let hook;
    const hooks = await message.channel.fetchWebhooks().catch(() => null);
    if (hooks) hook = hooks.find(h => h.name === WEBHOOK_NAME);

    if (!hook) {
      const createOpts = { name: WEBHOOK_NAME };
      if (avatarBuffer) createOpts.avatar = avatarBuffer;
      hook = await message.channel.createWebhook(createOpts).catch(() => null);
    }

    if (!hook) return;

    if (avatarBuffer) await hook.edit({ avatar: avatarBuffer }).catch(() => {});

    await hook.send({ content: relayContent, username: WEBHOOK_NAME });
  } catch (err) {
    console.error('Failed to relay Auto-Mod message:', err);
  }
};
