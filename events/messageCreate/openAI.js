require('dotenv/config');
const fs = require('node:fs');
const path = require('node:path');
const { MongoClient } = require('mongodb');
const { Client, Collection, Events, GatewayIntentBits, WebhookClient, GuildChannel } = require('discord.js');
// const { token } = require('./config.json');
const { OpenAI } = require('openai');
const { TIMEOUT } = require('node:dns');
const prefix = '!';
const openai = new OpenAI({
    apiKey: process.env.openAPI_KEY,
});
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))}

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

// This event will run every time a message is received
module.exports = async (message, client)=>{
  if (message.author.bot || message.content === '') return; //Ignore bot messages
  if (message.content.includes['Wren','wren', 'scruff', 'Scruff', 'Oracle', 'oracle']){console.log("I heard that!")};
  if (message.channel.id !== process.env.MainChannel && !message.mentions.users.has(client.user.id))return;
   //Channel and message filters. Allows open response in main channel and @ or ! commands in others

  console.log(message.member.user.tag);
  const discordThreadId = message.channel.id;
  const {webhookId, webhookToken} = generateWebhookURL(discordThreadId);
  const {assistantname, personality} = getBotConnections(discordThreadId);
  const webhookClient = new WebhookClient({ id: webhookId, token: webhookToken });
  
  console.log(`channel ${discordThreadId}`);
  console.log(message.channel.name);

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
          case process.env.Channel4:
            return {
              assistantname: process.env.ASSISTANT_ID_MAIN,
              personality: process.env.personality4
            };
            case process.env.Channel5:
              return {
                assistantname: process.env.ASSISTANT_ID_MAIN,
                personality: process.env.personality5
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
          case process.env.Channel4:
            return {
              webhookId: process.env.webhookId_4,
              webhookToken: process.env.webhookToken_4
            };
            case process.env.Channel5:
              return {
                webhookId: process.env.webhookId_5,
                webhookToken: process.env.webhookToken_5
              };
        }
    };

  let openAiThreadId = getOpenAiThreadId(discordThreadId);
  let messagesLoaded = false;
  
   if(!openAiThreadId){
    
        const thread = await openai.beta.threads.create();
        openAiThreadId = thread.id;
        addThreadToMap(discordThreadId, openAiThreadId);

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

    if(!messagesLoaded){ //If this is for a thread, assume msg was loaded via .fetch() earlier
      
        await addMessage(openAiThreadId, message.content);
    }
   
    try{
    
      await message.channel.sendTyping();
    

    const run = await openai.beta.threads.runs.create(      
        thread_id=openAiThreadId,
       {assistant_id: assistantname,instructions: personality,}
       )    
    const status = await statusCheckLoop(openAiThreadId, run.id);
   /* messageQueue.push(message);

    if (messageQueue.length === 1){
      processQueue();
    }

    async function processQueue(){
      while (messageQueue.length > 0) {
        const message = messageQueue[0];

        const status = await statusCheckLoop(openAiThreadId, run.id);

        messageQueue.shift();
      }
    }*/
    const messages = await openai.beta.threads.messages.list(openAiThreadId);
    let responseMessage = messages.data[0].content[0].text.value;

    
  const chunkSizeLimit = 2000;

  for (let i = 0; i < responseMessage.length; i += chunkSizeLimit){
    const chunk = responseMessage.substring(i,i+chunkSizeLimit);

    await webhookClient.send({content: chunk});
  }}catch (error) {

    webhookClient.send("bot hung, let it finish its current reply and try again. working a solution for multithreading to avoid this");
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
};

/*
}


module.exports = async (message,client,handler) =>{
    const threadMap = {};
    if (message.content === 'hey'){
      console.log('map');
  }
    const getOpenAiThreadId = (discordThreadId) => {
        // Replace this in-memory implementation with a database (e.g. DynamoDB, Firestore, Redis)
        return threadMap[discordThreadId];
    }
    if (message.content === 'hey'){
      console.log('threadID');
  }
    const addThreadToMap = (discordThreadId, openAiThreadId) => {
        threadMap[discordThreadId] = openAiThreadId;
    }
    
    if (message.content === 'hey'){
      console.log('thread to map');
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
    
    if (message.content === 'hey'){
      console.log('run stats');
  }
    const addMessage = (threadId, content) => {
        // console.log(content);
        return openai.beta.threads.messages.create(
            threadId,
            { role: "user", content }
        )
    }
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
        case process.env.Channel4:
          return {
            assistantname: process.env.ASSISTANT_ID_MAIN,
            personality: process.env.personality4
        };
        case process.env.Channel5:
          return {
            assistantname: process.env.ASSISTANT_ID_MAIN,
            personality: process.env.personality5
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
          case process.env.Channel4:
          return {
            webhookId: process.env.webhookId_4,
            webhookToken: process.env.webhookToken_4
          };
          case process.env.Channel5:
          return {
            webhookId: process.env.webhookId_5,
            webhookToken: process.env.webhookToken_5
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
          console.error("nothing running, moving on 1");
                  } else {
                  throw error;
                   }
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
}
};*/