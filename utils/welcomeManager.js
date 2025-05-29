// utils/welcomeManager.js
require('dotenv/config');
const { WebhookClient } = require('discord.js');
const axios            = require('axios');
const logger           = require('./logger');
const redis            = require('../utils/redis');

// ─── Configuration ───────────────────────────────────────────────────────────
const AI_ENDPOINT        = process.env.AI_WELCOME_ENDPOINT || 'http://localhost:11434/api/chat';
const AI_MODEL           = process.env.testwelcomeModel;
const WEBHOOK_ID         = process.env.webhookId_7;
const WEBHOOK_TOKEN      = process.env.webhookToken_7;
// Allow setting a custom timeout via env (ms), default to 1 hour
const WELCOME_TIMEOUT_MS = parseInt(process.env.WELCOME_TIMEOUT_MS, 10) || 3600000;
const MAX_GREETING_LENGTH = 1000;

if (!AI_MODEL) {
  logger.warn('WelcomeManager: missing testwelcomeModel in .env – using default greeting only');
}
if (!WEBHOOK_ID || !WEBHOOK_TOKEN) {
  logger.warn('WelcomeManager: missing webhookId_7 or webhookToken_7 – will fallback to systemChannel/DM');
}

// ─── Helper: send a single welcome ────────────────────────────────────────────
async function sendWelcome(member) {
  // Build AI prompt
  const messagesPayload = [{
    role:    'user',
    content: 'Welcome a new member! Remember to keep your message short but informative and invite them to introduce themselves.'
  }];

  const data = { model: AI_MODEL, messages: messagesPayload, stream: false };
  let greeting = 'Hey there! Welcome to Luck Factory Games! Please introduce yourself and tell us about your favorite games!';

  if (AI_MODEL) {
    try {
      const resp = await axios.post(AI_ENDPOINT, data, {
        timeout: WELCOME_TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json' }
      });
      const text = resp.data?.message?.content;
      if (typeof text === 'string' && text.length > 0 && text.length <= MAX_GREETING_LENGTH) {
        greeting = text;
      } else {
        throw new Error('Invalid AI greeting length');
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        logger.warn(`AI welcome request timed out after ${WELCOME_TIMEOUT_MS}ms, using fallback greeting.`);
      } else {
        logger.error(err, 'AI welcome failed');
      }
    }
  }

  const content = `Welcome <@${member.id}>! ${greeting}`;

  // Send via webhook if configured
  if (WEBHOOK_ID && WEBHOOK_TOKEN) {
    try {
      const webhook = new WebhookClient({ id: WEBHOOK_ID, token: WEBHOOK_TOKEN });
      await webhook.send({ content });
      logger.info(`Welcomed ${member.id} via webhook`);
      return;
    } catch (err) {
      logger.error(err, `Webhook send failed for ${member.id}`);
    }
  }

  // Fallback to system channel
  const sysChan = member.guild.systemChannel;
  if (sysChan && sysChan.isTextBased()) {
    try {
      await sysChan.send(content);
      logger.info(`Welcomed ${member.id} in systemChannel`);
      return;
    } catch (err) {
      logger.error(err, `SystemChannel send failed for ${member.id}`);
    }
  }

  // Final fallback: DM
  try {
    await member.send(content);
    logger.info(`Welcomed ${member.id} via DM`);
  } catch (err) {
    logger.error(err, `DM welcome failed for ${member.id}`);
  }
}

// ─── Queue & process pending welcomes ─────────────────────────────────────────
async function queueWelcome(member) {
  if (member.user.bot) return;
  const payload = JSON.stringify({ memberId: member.id, guildId: member.guild.id });
  await redis.lPush('pending_welcome', payload);
}

async function processPendingWelcomes(client) {
  const items = await redis.lRange('pending_welcome', 0, -1);
  for (const item of items) {
    let info;
    try { info = JSON.parse(item); } catch { continue; }

    const guild = client.guilds.cache.get(info.guildId);
    if (!guild) continue;

    let member;
    try { member = await guild.members.fetch(info.memberId); } catch { continue; }

    if (member.roles.cache.size <= 1) continue;

    await sendWelcome(member);
    await redis.lRem('pending_welcome', 1, item);
  }
}

module.exports = { sendWelcome, queueWelcome, processPendingWelcomes };
