require('dotenv').config();
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
const { CommandKit } = require('commandkit');
const startAutoApproveWorker = require('./moderation/autoApproveWorker');

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
	devUserIds:   ['613530842177994772'],
	eventsPath:   path.join(__dirname, 'events'),
	commandsPath: path.join(__dirname, 'commands'),
	bulkRegister: false,
});

client.once('ready', () => {
        startAutoApproveWorker(client);
});

// Mongoose Setup
mongoose.connect(process.env.mongoDB)
	.then(() => {
		console.log('Mongoose connected; logging in Discord client…');
		return client.login(process.env.TOKEN);
	})
	.catch((error) => {
		console.error('Mongoose connection error:', error);
		process.exit(1);
	});

// Backend Server Setup
const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security Middlewares ────────────────────────────────────────────────────
// Remove the X-Powered-By header completely:
app.disable('x-powered-by');
// Use Helmet to set a suite of secure headers (including hiding Powered-By):
app.use(helmet());

// JSON body parsing
app.use(express.json());

// In-memory global events storage
const globalEvents = [];

// POST endpoint to receive events from the bot
app.post('/global-events', (req, res) => {
	try {
		const { content, author, timestamp } = req.body;
		if (!content || !author || !timestamp) {
			return res
				.status(400)
				.json({ error: 'Invalid payload: content, author, and timestamp required.' });
		}

		globalEvents.push({ content, author, timestamp });
		console.log(`Global Event: ${content} by ${author} at ${timestamp}`);
		return res.json({ message: 'Event recorded.' });
	}
	catch (err) {
		console.error('Error handling /global-events POST:', err);
		return res.status(500).json({ error: 'Internal server error.' });
	}
});

// GET endpoint to fetch global events
app.get('/global-events', (req, res) => {
	return res.json(globalEvents);
});

// Start the server
app.listen(PORT, () => {
	console.log(`Global Events server running on http://localhost:${PORT}`);
});
