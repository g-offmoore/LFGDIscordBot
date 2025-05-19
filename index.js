require('dotenv').config();
const path = require('node:path');
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
const { CommandKit } = require('commandkit');

// Discord Client Setup
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

new CommandKit({
	client,
	devUserIds: ['613530842177994772'],
	eventsPath: path.join(__dirname, 'events'),
	commandsPath: path.join(__dirname, 'commands'),
	bulkRegister: false,
});

// Mongoose Setup
mongoose.connect(process.env.mongoDB).then(() => {
	console.log('Mongoose is chasing Wren around the shop');
	client.login(process.env.TOKEN);
}).catch(error => {
	console.error(`Mongoose error: ${error}`);
});

// Backend Server Setup
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory global events storage
const globalEvents = [];

// POST endpoint to receive events from the bot
app.post('/global-events', (req, res) => {
	try {
		const { content, author, timestamp } = req.body;

		if (!content || !author || !timestamp) {
			return res.status(400).json({ error: 'Invalid payload. Expected content, author, and timestamp.' });
		}

		// Add the event to the global events array
		globalEvents.push({ content, author, timestamp });

		console.log(`Global Event Received: ${content} from ${author} at ${timestamp}`);
		res.status(200).json({ message: 'Global event received successfully.' });
	} catch (error) {
		console.error('Error handling global event:', error);
		res.status(500).json({ error: 'Failed to process global event.' });
	}
});

// GET endpoint to fetch global events for the webpage
app.get('/global-events', (req, res) => {
	res.status(200).json(globalEvents);
});

// Start the server
app.listen(PORT, () => {
	console.log(`Global Events server running on http://localhost:${PORT}`);
});
