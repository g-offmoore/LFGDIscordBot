// moderation/moderationScanner.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const path = require('node:path');
const fs = require('fs');
const yaml = require('js-yaml');

const MOD_CHANNEL_ID      = '1008371145793351740';
const WEBHOOK_NAME        = 'ModBotRelay';
// Local avatar image path (PNG/JPEG) in your project
const WEBHOOK_AVATAR_PATH = path.join(__dirname, '../assets/modbot_avatar.png');

// Use absolute path based on this file's directory
const RULE_FILE = path.join(__dirname, '../config/mod_rules.yaml');

// Load and compile once at module import time
let compiledRules = [];
try {
  const raw = fs.readFileSync(RULE_FILE, 'utf8');
  const parsed = yaml.load(raw);
  const scamRules = parsed.rules || [];
  compiledRules = scamRules.map(rule => ({
    id:     rule.id,
    action: rule.action,
    reason: rule.reason,
    regex:  new RegExp(rule.pattern, 'i')
  }));
  console.log(`Loaded ${compiledRules.length} scam rules.`);
} catch (err) {
  console.error('❌ Error loading scam rules:', err);
  process.exit(1);
}

// Preload avatar buffer
let avatarBuffer;
try {
  avatarBuffer = fs.readFileSync(WEBHOOK_AVATAR_PATH);
} catch (err) {
  console.warn('🚧 Could not load webhook avatar from assets, falling back to bot avatar');
  avatarBuffer = null;
}

module.exports = async function handleMessageModeration(client, message) {
  // Ignore bots and DMs
  if (message.author.bot || !message.guild) return;

  const content = message.content;
  const match = compiledRules.find(r => r.regex.test(content));
  if (!match) return;

  // Hide the flagged message until review
  try {
    await message.delete();
  } catch (delErr) {
    console.error('Failed to delete flagged message:', delErr);
  }

  try {
    const modChannel = await client.channels.fetch(MOD_CHANNEL_ID).catch(() => null);
    if (!modChannel || !modChannel.isTextBased()) return;

    // Find existing webhook
    let hook;
    const webhooks = await modChannel.fetchWebhooks().catch(() => null);
    if (webhooks) {
      hook = webhooks.find(h => h.name === WEBHOOK_NAME);
    }

    // Create webhook if none exists
    if (!hook) {
      const createOpts = { 
        name: WEBHOOK_NAME, 
        reason: 'Auto-moderation alerts' 
      };
      if (avatarBuffer) {
        createOpts.avatar = avatarBuffer;
      }
      hook = await modChannel.createWebhook(createOpts).catch(err => {
        console.error('Failed to create mod webhook:', err);
        return null;
      });
    }

    if (!hook) return;

    // Update existing webhook's avatar if we have a buffer
    if (avatarBuffer) {
      await hook.edit({ avatar: avatarBuffer }).catch(err => {
        console.error('Failed to update mod webhook avatar:', err);
      });
    }

    // Build embed and action row
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🚨 Potential Scam Message Detected')
      .setDescription('This message was removed. If approved, the user will need to repost their content via ModBot.')
      .addFields(
        { name: 'User',    value: `${message.author.tag} (<@${message.author.id}>)`, inline: false },
        { name: 'Channel', value: `<#${message.channel.id}>`,                         inline: false },
        { name: 'Reason',  value: match.reason,                                       inline: false },
        { name: 'Content', value: content.slice(0, 1000),                             inline: false }
      )
      .setFooter({ text: `Rule ID: ${match.id}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`warn_${message.id}`).setLabel('⚠️ Warn').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`ban_${message.id}`).setLabel('🔨 Ban').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`allow_${message.id}`).setLabel('✅ Allow').setStyle(ButtonStyle.Success)
    );

    // Send via webhook, using the webhook's configured avatar
    await hook.send({
      username:  WEBHOOK_NAME,
      avatarURL: null,
      embeds:    [embed],
      components:[row]
    });

  } catch (err) {
    console.error('Error sending mod alert via webhook:', err);
  }
};
