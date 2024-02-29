require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { MongoClient } = require('mongodb');
const { Client, Collection, Events, GatewayIntentBits, WebhookClient } = require('discord.js');
const mongoose = require('mongoose');
const { OpenAI } = require('openai');
const { TIMEOUT } = require('node:dns');
const {CommandKit}= require('commandkit');

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
    //devGuildIds: ['1192837863717474315', '1191000746683015260'],
    devUserIds: ['613530842177994772'],
    eventsPath: path.join(__dirname,'events'),
    commandsPath: path.join(__dirname,'commands'),
    // validationsPath: path.join(__dirname, 'validations'),
    // skipBuiltInValidations: true,
    bulkRegister: false,
});

//Mongoose setup
mongoose.connect(process.env.mongoDB).then(()=>{
    console.log('Mongoose is chasing Wren around the shop');
    client.login(process.env.TOKEN);
  }).catch(error => {
    `Mongoose error: ${error}`
  });
  
