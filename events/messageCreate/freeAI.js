/* eslint-disable no-inline-comments */
require('dotenv/config');
const { WebhookClient } = require('discord.js');
// const fs = require('fs');
// const { handleDiscordMessage } = require('../../utils/route.js');
const logger = require('../../utils/logger.js');
const axios = require('axios');
const mongoClientPromise = require('../../utils/mongodb.js');
const { exec } = require('child_process');
const fs = require('fs');

// Function to get conversation history
async function getConversationHistory(discordThreadId) {
	const client = await mongoClientPromise;
	const db = client.db('LFGInventory'); // Replace with your actual database name
	const collection = db.collection('conversations');

	const historyDocument = await collection.findOne({ discordThreadId: discordThreadId });
	// Ensure that history is an array
	const history = Array.isArray(historyDocument?.history) ? historyDocument.history : [];
	return history;
}

// Function to save conversation history
async function saveConversationHistory(discordThreadId, history) {
	const client = await mongoClientPromise;
	const db = client.db('LFGInventory'); // Replace with your actual database name
	const collection = db.collection('conversations');

	await collection.updateOne(
		{ discordThreadId: discordThreadId },
		{ $set: { history: history } },
		{ upsert: true },
	);
}

function logResponseTime(startTime, endTime) {
	const duration = endTime - startTime;
	const logMessage = `Request processed in ${duration} ms\n`;
	fs.appendFile('./response_times.log', logMessage, err => {
		if (err) {
			console.error('Failed to log response time:', err);
		}
	});
}

async function findItems(query) {
	const client = await mongoClientPromise;
	const db = client.db('LFGInventory');
	const itemsCollection = db.collection('items');

	// Example query adjustment based on user's message
	const searchQuery = {};
	if (query.gold) {
		searchQuery.price = { $lte: query.gold };
	}
	else if (query.moonstones) {
		searchQuery.priceMoonstones = { $lte: query.moonstones };
	}
	else if (query.description) {
		searchQuery.description = { $regex: query.description, $options: 'i' };
	}

	return itemsCollection.find(searchQuery).toArray();
}

function parseQuery(message) {
	const result = {};
	const lowerMessage = message.toLowerCase();
	let match;

	if (match = lowerMessage.match(/(\d+)\s+(gold|moonstones)/)) {
		result[match[2]] = parseInt(match[1]);
	}
	else if (match = lowerMessage.match(/what .*? can i buy with (\d+) (gold|moonstones)/)) {
		result[match[2]] = parseInt(match[1]);
	}
	else if (match = lowerMessage.match(/produce|effect|have|result/)) {
		result.description = lowerMessage.split('that ')[1];
	}
	console.log(result);
	return result;
}
module.exports = async (message, client) => {
	const startTime = Date.now();
	if (message.author.bot || message.content === '') {
		return;
	}

	if (message.channel.id !== process.env.MainChannel && !message.mentions.users.has(client.user.id)) {
		return;
	}

	const discordThreadId = message.channel.id;
	const { webhookId, webhookToken, AImodel, isShopChannel } = generateWebhookURL(discordThreadId);
	const webhookClient = new WebhookClient({ id: webhookId, token: webhookToken });

	// eslint-disable-next-line no-shadow
	function generateWebhookURL(discordThreadId) {

		switch (discordThreadId) {
		case process.env.MainChannel:
			return {
				webhookId: process.env.mainwebhookId,
				webhookToken: process.env.mainwebhookToken,
				AImodel: process.env.LLAMA_MODEL,
			};
		case process.env.Channel2:
			return {
				webhookId: process.env.webhookId_2,
				webhookToken: process.env.webhookToken_2,
				AImodel: process.env.moonstone_orca,
				isShopChannel: false,
			};
		case process.env.Channel3:
			return {
				webhookId: process.env.webhookId_3,
				webhookToken: process.env.webhookToken_3,
				AImodel: process.env.scruff_model,
			};
		case process.env.Channel4:
			return {
				webhookId: process.env.webhookId_4,
				webhookToken: process.env.webhookToken_4,
				AImodel: process.env.gardenModel,
			};
		case process.env.Channel5:
			return {
				webhookId: process.env.webhookId_5,
				webhookToken: process.env.webhookToken_5,
				AImodel: process.env.forgeModel,
			};
		}

	}

	function askQuestion(question) {
		return new Promise((resolve, reject) => {
			const pythonCommand = `python3 ./utils/langchainPythonRAG.py "${question.replace(/"/g, '\\"')}"`;
			exec(pythonCommand, (error, stdout, stderr) => {
				if (error) {
					console.error(`exec error: ${error}`);
					return reject(error);
				}
				if (stderr) {
					console.error(`stderr: ${stderr}`);
					return reject(stderr);
				}
				try {
					// Parse the JSON output from the Python script
					const results = JSON.parse(stdout);
					resolve(results);
				}
				catch (parseError) {
					console.error(`Parsing error: ${parseError}`);
					reject(parseError);
				}
			});
		});
	}


	// const modelsToTest = ['oracle:latest', 'oracle-llama2:latest', 'oracle-mixtral:latest', 'oracle-mixtral-orca:latest', 'oracle-neural-chat:latest', 'oracle-noushermes2:latest' ];

	try {
		const question = message.content.toLowerCase();
		if (isShopChannel) {
			const query = parseQuery(question);
			const items = await findItems(query);
			console.log(items);
			let responseText = items.map(item => `${item.name}: ${item.price || item.priceMoonstones} (${item.price ? 'gold' : 'moonstones'}) - ${item.description}`).join('\n');
			if (responseText === '') responseText = 'No items found matching your criteria.';
			await webhookClient.send({ content: responseText });
			return;
		}
		const result = await askQuestion(question);

		// }


		const history = await getConversationHistory(discordThreadId);
		history.push({ role: 'user', content: question });

		console.log('Result in openAI.js:', JSON.stringify(result, null, 2));
		const newMessage = { role: 'user', content: `You found this information in your tomes: ${result}.` };
		await message.channel.sendTyping();

		const messagesPayload = [newMessage].concat(history.slice(-10));
		// console.log('Payload message:', messagesPayload);

		// for (const AImodel of modelsToTest) {
		// Construct the payload
		const data = {
			model: AImodel,
			messages:messagesPayload,
			'stream': false,
			temperature: 0,
		};

		// Make the POST request
		const response = await axios.post('http://localhost:11434/api/chat', data, {
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const reply = response?.data?.message?.content ?? 'Oops! Something went wrong. Please try again later.';

		console.log(`Response from ${AImodel}: ${reply}\n\n`);


		if (reply.length > 2000) {
			// Split reply into chunks and send each chunk separately
			let index = 0;
			const maxCharacters = 1995;
			while (index < reply.length) {
				const chunk = reply.slice(index, Math.min(index + maxCharacters, reply.length));
				await webhookClient.send({ content: chunk });
				index += maxCharacters;
			}
		}
		else {
			// Send reply if within Discord message character limit
			await webhookClient.send({ content: reply });
		}
		// }
		history.push({ role: 'assistant', content: reply });
		await saveConversationHistory(discordThreadId, history);
	}
	catch (error) {
		logger.error({ err: error }, 'An error occurred');
		await webhookClient.send('Bot encountered an issue. Please wait a moment before trying again.');
	}
	finally {
		const endTime = Date.now();
		logResponseTime(startTime, endTime);
	}
};