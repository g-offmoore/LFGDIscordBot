const { OpenAIEmbeddings } = require("@langchain/openai");
const { MongoDBAtlasVectorSearch } = require("@langchain/community/vectorstores/mongodb_atlas");
const mongoClientPromise = require('../utils/mongodb.js');
const { Client, Collection, Events, GatewayIntentBits, WebhookClient, GuildChannel } = require('discord.js');

async function handleDiscordMessage(question) {
  const client = await mongoClientPromise;
  const dbName = "docs";
  const collectionName = "embeddings";
  const collection = client.db(dbName).collection(collectionName);

  console.log(`functionQuestion: ${question}\nType of question: ${typeof question}`);

  const vectorStore = new MongoDBAtlasVectorSearch(
    new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small',
      stripNewLines: true,
    }), {
    collection,
    indexName: "default",
    textKey: "text", 
    embeddingKey: "embedding",
  });

  const retriever = vectorStore.asRetriever({
    searchType: "mmr",
    searchKwargs: {
      fetchK: 5,
      lambda: 0.1,
    },
  });

  // Returning the Promise directly
  return retriever.getRelevantDocuments(question);
}
module.exports = { handleDiscordMessage };