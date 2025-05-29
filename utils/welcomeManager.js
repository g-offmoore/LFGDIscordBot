// utils/welcomeManager.js
require('dotenv/config');
const { WebhookClient } = require('discord.js');
const axios            = require('axios');
const logger           = require('./logger');
const redis            = require('../utils/redis');

// ─── Configuration ───────────────────────────────────────────────────────────
// exactly your original env names:
const AI_ENDPOINT      = process.env.AI_WELCOME_ENDPOINT || 'http://localhost:11434/api/chat';
const AI_MODEL         = process.env.testwelcomeModel;
const WEBHOOK_ID       = process.env.webhookId_7;
const WEBHOOK_TOKEN    = process.env.webhookToken_7;

const PENDING_KEY         = 'pending_welcome';
const WELCOME_TIMEOUT_MS  = 5000;
const MAX_GREETING_LENGTH = 1000;

if (!AI_MODEL) {
  logger.warn('WelcomeManager: missing testwelcomeModel in .env – using default fallback greeting');
}
if (!WEBHOOK_ID || !WEBHOOK_TOKEN) {
  logger.warn('WelcomeManager: missing webhookId_7 or webhookToken_7 – welcome via system channel or DM instead');
}

// ─── Helper: send a single welcome ────────────────────────────────────────────
async function sendWelcome(member) {
  // Build AI prompt
  const messagesPayload = [{
    role:    'user',
    content: 'Welcome a new member! Remember to keep your message short but informative and invite them to introduce themselves.'
  }];

  const data = {
    model:   AI_MODEL,
    messages: messagesPayload,
    stream:  false
  };

  let greeting;
  try {
    const resp = await axios.post(
      AI_ENDPOINT,
      data,
      { timeout: WELCOME_TIMEOUT_MS, headers: { 'Content-Type': 'application/json' } }
    );
    const text = resp.data?.message?.content;
    if (typeof text === 'string' && text.length > 0 && text.length <= MAX_GREETING_LENGTH) {
      greeting = text;
    } else {
      throw new Error('Invalid AI greeting');
    }
  } catch (err) {
    logger.error(err, 'AI welcome failed');
    greeting = 'Hey there! Welcome to the server—please introduce yourself.';
  }

  const welcomeText = `Welcome <@${member.id}>! ${greeting}`;

  // Try sending via your configured webhook
  if (WEBHOOK_ID && WEBHOOK_TOKEN) {
    try {
      const webhookClient = new WebhookClient({ id: WEBHOOK_ID, token: WEBHOOK_TOKEN });
      await webhookClient.send({ content: welcomeText });
      logger.info(`Welcomed ${member.id} via webhook`);
      return;
    } catch (err) {
      logger.error(err, `Send welcome via webhook failed for ${member.id}`);
    }
  }

  // Fallback: guild system channel
  const sysChan = member.guild.systemChannel;
  if (sysChan && sysChan.isTextBased()) {
    try {
      await sysChan.send(welcomeText);
      logger.info(`Welcomed ${member.id} in systemChannel`);
      return;
    } catch (err) {
      logger.error(err, `Send welcome in systemChannel failed for ${member.id}`);
    }
  }

  // Last‐ditch fallback: DM
  try {
    await member.send(welcomeText);
    logger.info(`Welcomed ${member.id} via DM`);
  } catch (err) {
    logger.error(err, `DM welcome failed for ${member.id}`);
  }
}

// ─── Queue & process pending welcomes ─────────────────────────────────────────
async function queueWelcome(member) {
  if (member.user.bot) return;
  const payload = JSON.stringify({ memberId: member.id, guildId: member.guild.id });
  await redis.lPush(PENDING_KEY, payload);
}

async function processPendingWelcomes(client) {
  const items = await redis.lRange(PENDING_KEY, 0, -1);
  for (const item of items) {
    let info;
    try {
      info = JSON.parse(item);
    } catch {
      continue;
    }

    const guild = client.guilds.cache.get(info.guildId);
    if (!guild) continue;

    let member;
    try {
      member = await guild.members.fetch(info.memberId);
    } catch {
      continue;
    }

    // only welcome once they've picked a role
    if (member.roles.cache.size <= 1) continue;

    await sendWelcome(member);
    await redis.lRem(PENDING_KEY, 1, item);
  }
}

module.exports = { sendWelcome, queueWelcome, processPendingWelcomes };
