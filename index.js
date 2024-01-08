require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { MongoClient } = require('mongodb');
const { Client, Collection, Events, GatewayIntentBits, WebhookClient } = require('discord.js');
const mongoose = require('mongoose');
//const eventHandler = require('./transfer folder/handlers/dead handler');
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
    devGuildIds: ['1192837863717474315'],
    devUserIds: ['613530842177994772'],
    eventsPath: path.join(__dirname,'events'),
    commandsPath: path.join(__dirname,'commands'),
    validationsPath: path.join(__dirname, 'validations'),
    skipBuiltInValidations: true,
    bulkRegister: false,
});

/*
const prefix = '!';
const openai = new OpenAI({
    apiKey: process.env.openAPI_KEY,
});
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Probably bad form but global or re-used const variables bundled above for personal
sanity*/

//Mongoose setup
mongoose.connect(process.env.mongoDB).then(()=>{
    console.log('Mongoose is chasing Wren around the shop');
    client.login(process.env.TOKEN);
  });
  

/*
//Slash Command build-listener
client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}
/*
//Discord Bot login check
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});


//Client initialize
client.on('ready', () => {
  console.log('oracle is watching');
});

const threadMap = {};

const getOpenAiThreadId = (discordThreadId) => {
    // Replace this in-memory implementation with a database (e.g. DynamoDB, Firestore, Redis)
    return threadMap[discordThreadId];
}

const addThreadToMap = (discordThreadId, openAiThreadId) => {
    threadMap[discordThreadId] = openAiThreadId;
}

const terminalStates = ["cancelled", "failed", "completed", "expired", "active"];
const statusCheckLoop = async (openAiThreadId, runId) => {
    const run = await openai.beta.threads.runs.retrieve(
        openAiThreadId,
        runId
    );

    if(terminalStates.indexOf(run.status) < 0){
        await sleep(10);
        return statusCheckLoop(openAiThreadId, runId);
    }
    // console.log(run);

    return run.status;
}

const addMessage = (threadId, content) => {
    // console.log(content);
    return openai.beta.threads.messages.create(
        threadId,
        { role: "user", content }
    )
}

//Slash command listener
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
    console.error('Error executing command:', error.message);
    
    if (interaction && interaction.isCommand()) {
      await interaction.reply('There was an error while executing this command!');
    }
  }	
});
client.login(process.env.TOKEN);*/

// OpenAI assistant listener
/*client.on('messageCreate', async message => {
  if (message.author.bot || message.content === '') return; //Ignore bot messages
  if (message.channel.id !== process.env.MainChannel && !message.mentions.users.has(client.user.id))return;
   //Channel and message filters. Allows open response in main channel and @ or ! commands in others

  const discordThreadId = message.channel.id;
  const {webhookId, webhookToken} = generateWebhookURL(discordThreadId);
  const {assistantname, personality} = getBotConnections(discordThreadId);
  const webhookClient = new WebhookClient({ id: webhookId, token: webhookToken });
  
  console.log(`channel ${discordThreadId}`)

  function getBotConnections(discordThreadId) {
 
    switch (discordThreadId) {
      case process.env.MainChannel:
        return {
          assistantname: process.env.ASSISTANT_ID_MAIN, 
          personality: null
        };
      case process.env.Channel2:
        return {
          assistantname: process.env.ASSISTANT_ID_2
        };
        case process.env.Channel3:
          return {
            assistantname: process.env.ASSISTANT_ID_MAIN,
            personality: process.env.personality3
          };
       };
    };
  
    function generateWebhookURL(discordThreadId) {
 
      switch (discordThreadId) {
        case process.env.MainChannel:
          return {
            webhookId: process.env.mainwebhookId,
            webhookToken: process.env.mainwebhookToken
          };
        case process.env.Channel2:
          return {
            webhookId: process.env.webhookId_2,
            webhookToken: process.env.webhookToken_2
          };
          case process.env.Channel3:
          return {
            webhookId: process.env.webhookId_3,
            webhookToken: process.env.webhookToken_3
          };
        }
    };

  let openAiThreadId = getOpenAiThreadId(discordThreadId);
  let messagesLoaded = false;
  
   if(!openAiThreadId){
    
        const thread = await openai.beta.threads.create();
        openAiThreadId = thread.id;
        addThreadToMap(discordThreadId, openAiThreadId);
        try{
          const activeRun = await statusCheckLoop(openAiThreadId, run.id);
          if (activeRun.data.status === 'active') {
              webhookClient.send("Just a moment please");
              await openai.beta.threads.runs.complete(openAiThreadId, run.id);
           }}catch(error){
                  if (error instanceof ReferenceError) {
          console.error("nothing running, moving on");
                  } else {
                  throw error;
                   }
        if(message.channel.isThread()){
            //Gather all thread messages to fill out the OpenAI thread since we haven't seen this one yet
            const starterMsg = await message.channel.fetchStarterMessage();
            const otherMessagesRaw = await message.channel.messages.fetch();

            const otherMessages = Array.from(otherMessagesRaw.values())
                .map(msg => msg.content)
                .reverse(); //oldest first

            const messages = [starterMsg.content, ...otherMessages]
                .filter(msg => !!msg && msg !== '')

            // console.log(messages);
            await Promise.all(messages.map(msg => addMessage(openAiThreadId, msg)));
            messagesLoaded = true;
        }
    }

    // console.log(openAiThreadId);
    if(!messagesLoaded){ //If this is for a thread, assume msg was loaded via .fetch() earlier
      
        await addMessage(openAiThreadId, message.content);
    }
   
    try{
    
      await message.channel.sendTyping();
      await sleep(3000); 
    const run = await openai.beta.threads.runs.create(      
        thread_id=openAiThreadId,
       {assistant_id: assistantname,instructions: personality,}
       )    
    const status = await statusCheckLoop(openAiThreadId, run.id);
    const messages = await openai.beta.threads.messages.list(openAiThreadId);
    let responseMessage = messages.data[0].content[0].text.value;

    
  const chunkSizeLimit = 2000;

  for (let i = 0; i < responseMessage.length; i += chunkSizeLimit){
    const chunk = responseMessage.substring(i,i+chunkSizeLimit);

    await webhookClient.send({content: chunk});
  }}catch (error) {

    webhookClient.send("*SNORES LOUDLY* **they seem to be sleeping best to try again later**");
    if (error instanceof OpenAI.APIError) {
      console.error(error.status);  // e.g. 401
      console.error(error.message); // e.g. The authentication token you passed was invalid...
      console.error(error.code);  // e.g. 'invalid_api_key'
      console.error(error.type);  // e.g. 'invalid_request_error'
      console.error(error.param);
      console.error(error.name);
      console.error(error.headers);
      console.error(error.stack);

    } else {
      // Non-API error
      console.log(`non api error ${error}`);
    }  
  };
};*/

//OLD CODE DONT OPEN below

//client.login(process.env.TOKEN);

/*client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.CHANNEL_ID && !message.mentions.users.has(client.user.id) ) return;
  if (message.content.startsWith('!')) return;

  let conversationLog = [
    { role: 'system', content: 'You are an NPC named "Oracle" you run a shop called the Lore Keep. You must always act in a professional and helpful manner. Your initial responses should be brief summaries before confirming this is what the adventurer wants to know, you may then give them a more complete answer' },
  ];

  try {
    await message.channel.sendTyping();
    let prevMessages = await message.channel.messages.fetch({ limit: 15 });
    prevMessages.reverse();
    
    prevMessages.forEach((msg) => {
      if (msg.content.startsWith('!')) return;
      if (msg.author.id !== client.user.id && message.author.bot) return;
      if (msg.author.id === client.user.id) {
        conversationLog.push({
          role: 'assistant',
          content: msg.content,
          name: msg.author.username
            .replace(/\s+/g, '_')
            .replace(/[^\w\s]/gi, ''),
        });
      }

      if (msg.author.id == message.author.id) {
        conversationLog.push({
          role: 'user',
          content: msg.content,
          name: message.author.username
            .replace(/\s+/g, '_')
            .replace(/[^\w\s]/gi, ''),
        });
      }
    });

    const chatCompletion = await openai.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages: conversationLog,
        //max_tokens: 256, // limit token usage
      })
      
      .catch((error) => {
        console.log(`OPENAI ERR: ${error}`);
      });
      
    message.reply(chatCompletion.choices[0].message);
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error(error.status);  // e.g. 401
      console.error(error.message); // e.g. The authentication token you passed was invalid...
      console.error(error.code);  // e.g. 'invalid_api_key'
      console.error(error.type);  // e.g. 'invalid_request_error'
    } else {
      // Non-API error
      console.log(error);
    }
  }

  

  /*const responseMessage = result.data.choices[0].message.content;
  const chunkSizeLimit = 2000;

  for (let i = 0; i < responseMessage.length; i += chunkSizeLimit){
    const chunk = responseMessage.substring(i,i+chunkSizeLimit);

    await message.reply(chunk);
  }
});
mongodb+srv://airmangmoore:<password>@lfginventory.um6wprj.mongodb.net/




// Discord bot setup
//const bot = new Discord.Client();
//const prefix = '!';

bot.on('ready', () => {
    console.log(`Logged in as ${bot.user.tag}!`);
});

bot.on('message', async (message) => {
    if (message.content.startsWith(prefix)){ 

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'buy') {
        buyItem(message, args);
    } else if (command === 'sell') {
        sellItem(message, args);
    } else if (command === 'trade') {
        tradeItem(message, args);
    }
    }  
});

});*/