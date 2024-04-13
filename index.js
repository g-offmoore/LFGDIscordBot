require('dotenv').config();
const path = require('node:path');
const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
const { CommandKit } = require('commandkit');


const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

new CommandKit ({
	client,
	// devGuildIds: ['1192837863717474315', '1191000746683015260'],
	devUserIds: ['613530842177994772'],
	eventsPath: path.join(__dirname, 'events'),
	commandsPath: path.join(__dirname, 'commands'),
	// validationsPath: path.join(__dirname, 'validations'),
	// skipBuiltInValidations: true,
	bulkRegister: false,
});

// Mongoose setup
mongoose.connect(process.env.mongoDB).then(() => {
	console.log('Mongoose is chasing Wren around the shop');
	client.login(process.env.TOKEN);
}).catch(error => {
	`Mongoose error: ${error}`;
});

// // Initialize Redis client
// const redis = new Redis({ url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379' });

// redis.on('error', (err) => {
// 	logger.error('Redis connection error:', err);
// });