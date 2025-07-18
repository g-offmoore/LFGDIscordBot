/* eslint-disable no-inline-comments */
require('dotenv/config');
const { WebhookClient } = require('discord.js');
const logger = require('../../utils/logger.js');
const axios = require('axios');
const mongoClientPromise = require('../../utils/mongodb.js');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ─── Helpers ───────────────────────────────────────────────────────────────────
async function getConversationHistory(discordThreadId) {
	const client = await mongoClientPromise;
	const db = client.db('LFGInventory');
	const collection = db.collection('conversations');
	const doc = await collection.findOne({ discordThreadId });
	return Array.isArray(doc?.history) ? doc.history : [];
}

async function saveConversationHistory(discordThreadId, history) {
	const client = await mongoClientPromise;
	const db = client.db('LFGInventory');
	const collection = db.collection('conversations');
	await collection.updateOne(
		{ discordThreadId },
		{ $set: { history } },
		{ upsert: true },
	);
}

function logResponseTime(startTime, endTime) {
	const duration = endTime - startTime;
	const msg = `Request processed in ${duration} ms\n`;
	fs.appendFile('./response_times.log', msg, err => {
		if (err) console.error('Failed to log response time:', err);
	});
}

function generateWebhookURL(discordThreadId) {
	switch (discordThreadId) {
	case process.env.MainChannel:
		return {
			webhookId:    process.env.mainwebhookId,
			webhookToken: process.env.mainwebhookToken,
			AImodel:      process.env.LLAMA_MODEL,
		};
	case process.env.Channel2:
		return {
			webhookId:      process.env.webhookId_2,
			webhookToken:   process.env.webhookToken_2,
			AImodel:        process.env.moonstone_orca,
			isShopChannel:  false,
		};
	case process.env.Channel3:
		return {
			webhookId:    process.env.webhookId_3,
			webhookToken: process.env.webhookToken_3,
			AImodel:      process.env.scruff_model,
		};
	case process.env.Channel4:
		return {
			webhookId:    process.env.webhookId_4,
			webhookToken: process.env.webhookToken_4,
			AImodel:      process.env.gardenModel,
		};
	case process.env.Channel5:
		return {
			webhookId:    process.env.webhookId_5,
			webhookToken: process.env.webhookToken_5,
			AImodel:      process.env.forgeModel,
		};
	case process.env.Channel6:
		return {
			webhookId:    process.env.webhookId_6,
			webhookToken: process.env.webhookToken_6,
			AImodel:      process.env.LLAMA_MODEL,
		};
	case process.env.Channel7:
		return {
			webhookId:    process.env.webhookId_7,
			webhookToken: process.env.webhookToken_7,
			AImodel:      process.env.testwelcomeModel,
			isWelcome:    true,
		};
	default:
		return {};
	}
}

// Resolve the Python script path relative to the repository root
function getPythonScriptPath() {
        return path.join(__dirname, '..', '..', 'utils', 'langchainPythonRAG.py');
}

// askQuestion uses that helper
function askQuestion(question) {
        const pythonScriptPath = getPythonScriptPath();

        return new Promise((resolve, reject) => {
                execFile('python3', [pythonScriptPath, question], (error, stdout, stderr) => {
                        if (error) return reject(error);
                        if (stderr) return reject(new Error(stderr));

			try {
				const results = JSON.parse(stdout);
				if (!Array.isArray(results)) {
					throw new TypeError('Expected an array but got ' + typeof results);
				}
				resolve(results);
			}
			catch (parseError) {
				reject(parseError);
			}
		});
	});
}

// ─── Main Handler ──────────────────────────────────────────────────────────────
module.exports = async (message, client) => {
	const startTime = Date.now();
	let typingInterval; // declare here so we can clear in catch/finally

	try {
		logger.info('message location: ' + message.channel.id);

		if (message.author.bot || message.content === '') return;
		if (
			message.channel.id !== process.env.MainChannel &&
			!message.mentions.users.has(client.user.id)
		) return;

		const discordThreadId = message.channel.id;
		const {
			webhookId,
			webhookToken,
			AImodel,
			isShopChannel,
			isWelcome,
		} = generateWebhookURL(discordThreadId);

		const webhookClient = new WebhookClient({ id: webhookId, token: webhookToken });
		const question = message.content.toLowerCase();
		let newMessage;

		typingInterval = setInterval(
			() => message.channel.sendTyping().catch(console.error),
			5000,
		);

		if (!isWelcome) {
			const result = await askQuestion(question);

			if (result.length === 1 && result[0].text === 'no lore found') {
				newMessage = {
					role:    'assistant',
					content: 'No information found, you must NOT make any up.',
				};
			}
			else {
				const formatted = result.map(r => r.text).join('\n\n---\n\n');
				newMessage = {
					role:    'assistant',
					content: `Here is the information from your tomes:\n\n${formatted}`,
				};
			}
		}
		else {
			newMessage = {
				role:    'assistant',
				content: 'Welcome! Please select a role to get started.',
			};
		}

		const history = await getConversationHistory(discordThreadId);
		const messagesPayload = [newMessage].concat(history.slice(-10));
		history.push({ role: 'user', content: question });
		history.push({ role: 'assistant', content: newMessage.content });

		const data = {
			model:       AImodel,
			messages:    messagesPayload,
			stream:      false,
			temperature: 0,
		};

		const response = await axios.post(
			process.env.AI_ENDPOINT_URL || 'http://localhost:11434/api/chat',
			data,
			{ headers: { 'Content-Type': 'application/json' } },
		);

		clearInterval(typingInterval);

		const reply = response?.data?.message?.content ?? 'Oops! Something went wrong. Please try again later.';
		const finalReply = reply !== 'Oops! Something went wrong. Please try again later.'
			? reply + '`AI Disclaimer: Not representative of LFG`'
			: reply;

		if (finalReply.length > 2000) {
			for (let i = 0; i < finalReply.length; i += 1995) {
				const chunk = finalReply.slice(i, i + 1995);
				await webhookClient.send({ content: chunk });
			}
		}
		else {
			await webhookClient.send({ content: finalReply });
		}

		await saveConversationHistory(discordThreadId, history);
	}
	catch (error) {
		if (typingInterval) clearInterval(typingInterval);
		logger.error({ err: error }, 'An error occurred');
		console.error('Handler exception:', error);

		try {
			await new WebhookClient({
				id:    process.env.mainwebhookId,
				token: process.env.mainwebhookToken,
			})
				.send('Bot encountered an issue. Please wait a moment before trying again.');
		}
		catch { /* swallow */ }
	}
	finally {
		if (typingInterval) clearInterval(typingInterval);
		logResponseTime(startTime, Date.now());
	}
};
