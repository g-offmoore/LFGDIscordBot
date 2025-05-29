/* eslint-disable no-inline-comments */
require('dotenv/config');
const { WebhookClient } = require('discord.js');
const axios = require('axios');
const logger = require('./logger');
const { redis } = require('../index');

// ─── Configuration ───────────────────────────────────────────────────────────
const AI_ENDPOINT = process.env.AI_WELCOME_ENDPOINT;
const AI_MODEL = process.env.WELCOME_MODEL;
const WEBHOOK_ID = process.env.WELCOME_WEBHOOK_ID;
const WEBHOOK_TOKEN = process.env.WELCOME_WEBHOOK_TOKEN;
const PENDING_KEY = 'pending_welcome';
const WELCOME_TIMEOUT_MS = 5000;
const MAX_GREETING_LENGTH = 1000;

// ─── Helper: Send Welcome ─────────────────────────────────────────────────────
async function sendWelcome(member) {
	const webhookClient = new WebhookClient({ id: WEBHOOK_ID, token: WEBHOOK_TOKEN });
	let greeting;
	try {
		const resp = await axios.post(
			AI_ENDPOINT,
			{ model: AI_MODEL, messages: [{ role: 'user', content: 'Welcome a new member! Keep it short & invite intros.' }], stream: false },
			{ timeout: WELCOME_TIMEOUT_MS, headers: { 'Content-Type': 'application/json' } },
		);
		if (resp.status !== 200) throw new Error(`AI returned ${resp.status}`);
		const text = resp.data?.message?.content;
		if (typeof text === 'string' && text.length > 0 && text.length <= MAX_GREETING_LENGTH) {
			greeting = text;
		}
		else {
			throw new Error('Invalid AI greeting');
		}
	}
	catch (err) {
		logger.error(err, 'AI welcome failed');
		greeting = 'Welcome! Feel free to introduce yourself.';
	}

	const msg = `Welcome <@${member.id}>! ${greeting}`;
	try {
		await webhookClient.send({ content: msg });
		logger.info(`Welcomed ${member.id}`);
	}
	catch (sendErr) {
		logger.error(sendErr, `Send welcome failed for ${member.id}`);
	}
}

// ─── Queue & Process ─────────────────────────────────────────────────────────
/**
 * Add new member to pending list
 */
async function queueWelcome(member) {
	if (member.user.bot) return;
	const payload = JSON.stringify({ memberId: member.id, guildId: member.guild.id });
	await redis.lpush(PENDING_KEY, payload);
}

/**
 * Process pending welcomes when a member gains a role
 */
async function processPendingWelcomes(client) {
	const items = await redis.lrange(PENDING_KEY, 0, -1);
	for (const item of items) {
		let info;
		try {
			info = JSON.parse(item);
		}
		catch { continue; }

		const guild = client.guilds.cache.get(info.guildId);
		if (!guild) continue;

		let member;
		try {
			member = await guild.members.fetch(info.memberId);
		}
		catch { continue; }

		// Only welcome if they've chosen a non-@everyone role
		if (member.roles.cache.size <= 1) continue;

		await sendWelcome(member);
		await redis.lrem(PENDING_KEY, 1, item);
	}
}

module.exports = { sendWelcome, queueWelcome, processPendingWelcomes };
