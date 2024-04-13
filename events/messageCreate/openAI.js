// /* eslint-disable no-inline-comments */
// require('dotenv/config');
// const { WebhookClient } = require('discord.js');
// // const fs = require('fs');
// // const { handleDiscordMessage } = require('../../utils/route.js');
// const logger = require('../../utils/logger.js');
// // const axios = require('axios');
// const mongoClientPromise = require('../../utils/mongodb.js');
// const { exec } = require('child_process');
// const OpenAI = require ('openai');
// const openai = new OpenAI();

// // Function to get conversation history
// async function getConversationHistory(discordThreadId) {
// 	const client = await mongoClientPromise;
// 	const db = client.db('LFGInventory'); // Replace with your actual database name
// 	const collection = db.collection('conversations');

// 	const historyDocument = await collection.findOne({ discordThreadId: discordThreadId });
// 	// Ensure that history is an array
// 	const history = Array.isArray(historyDocument?.history) ? historyDocument.history : [];
// 	return history;
// }

// // Function to save conversation history
// async function saveConversationHistory(discordThreadId, history) {
// 	const client = await mongoClientPromise;
// 	const db = client.db('LFGInventory'); // Replace with your actual database name
// 	const collection = db.collection('conversations');

// 	await collection.updateOne(
// 		{ discordThreadId: discordThreadId },
// 		{ $set: { history: history } },
// 		{ upsert: true },
// 	);
// }

// module.exports = async (message, client) => {
// 	if (message.author.bot || message.content === '') {
// 		return;
// 	}

// 	if (message.channel.id !== process.env.MainChannel && !message.mentions.users.has(client.user.id)) {
// 		return;
// 	}

// 	const discordThreadId = message.channel.id;
// 	const { webhookId, webhookToken, AImodel } = generateWebhookURL(discordThreadId);
// 	const webhookClient = new WebhookClient({ id: webhookId, token: webhookToken });

// 	// eslint-disable-next-line no-shadow
// 	function generateWebhookURL(discordThreadId) {

// 		switch (discordThreadId) {
// 		case process.env.MainChannel:
// 			return {
// 				webhookId: process.env.mainwebhookId,
// 				webhookToken: process.env.mainwebhookToken,
// 				AImodel: process.env.mainpersonality,
// 			};
// 		case process.env.Channel2:
// 			return {
// 				webhookId: process.env.webhookId_2,
// 				webhookToken: process.env.webhookToken_2,
// 				AImodel: process.env.moonstone_orca,
// 			};
// 		case process.env.Channel3:
// 			return {
// 				webhookId: process.env.webhookId_3,
// 				webhookToken: process.env.webhookToken_3,
// 				AImodel: process.env.scruff_model,
// 			};
// 		case process.env.Channel4:
// 			return {
// 				webhookId: process.env.webhookId_4,
// 				webhookToken: process.env.webhookToken_4,
// 				AImodel: process.env.gardenModel,
// 			};
// 		case process.env.Channel5:
// 			return {
// 				webhookId: process.env.webhookId_5,
// 				webhookToken: process.env.webhookToken_5,
// 				AImodel: process.env.forgeModel,
// 			};
// 		}
// 	}

// 	function askQuestion(question) {
// 		return new Promise((resolve, reject) => {
// 			const pythonCommand = `python3 ./utils/langchainPythonRAG.py "${question.replace(/"/g, '\\"')}"`;
// 			exec(pythonCommand, (error, stdout, stderr) => {
// 				if (error) {
// 					console.error(`exec error: ${error}`);
// 					return reject(error);
// 				}
// 				// Log stderr output for information or warnings without rejecting
// 				if (stderr) {
// 					console.log(`Information or warning: ${stderr}`);
// 				}
// 				try {
// 					// Parse the JSON output from the Python script
// 					const results = JSON.parse(stdout);
// 					resolve(results);
// 				}
// 				catch (parseError) {
// 					console.error(`Parsing error: ${parseError}`);
// 					reject(parseError);
// 				}
// 			});
// 		});
// 	}


// 	try {
// 		const question = message.content;
// 		const result = await askQuestion(question);


// 		const history = await getConversationHistory(discordThreadId);
// 		history.push({ role: 'user', content: question });

// 		// console.log('Result in openAI.js:', JSON.stringify(result, null, 2));
// 		// const newMessage = { role: 'user', content: `Use only this information to respond: ${result}. If this information is not sufficient and the question is not about general D&D then you do not know` };


// 		await message.channel.sendTyping();

// 		const messagesForOpenAI = [
// 			{ 'role': 'system', 'content': AImodel },
// 			...history.map(item => ({ role: item.role, content: item.content })),
// 			{ role: 'assistant', content: 'Use this information to answer the adventurures question' + result },
// 			{ 'role': 'user', 'content': question },
// 		];

// 		const completion = await openai.chat.completions.create({
// 			messages: messagesForOpenAI,
// 			model: 'gpt-3.5-turbo-0125',
// 		});


// 		const reply = completion.choices[0].message.content;
// 		// console.log(reply);

// 		if (reply.length > 2000) {
// 			// Split reply into chunks and send each chunk separately
// 			let index = 0;
// 			const maxCharacters = 1995;
// 			while (index < reply.length) {
// 				const chunk = reply.slice(index, Math.min(index + maxCharacters, reply.length));
// 				await webhookClient.send({ content: chunk });
// 				index += maxCharacters;
// 			}
// 		}
// 		else {
// 			// Send reply if within Discord message character limit
// 			await webhookClient.send({ content: reply });
// 		}
// 		// }
// 		history.push({ role: 'assistant', content: reply });
// 		await saveConversationHistory(discordThreadId, history);
// 	}
// 	catch (error) {
// 		logger.error({ err: error }, 'An error occurred');
// 		await webhookClient.send('Bot encountered an issue. Please wait a moment before trying again.');
// 	}
// };