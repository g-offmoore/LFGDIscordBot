// ... (your existing code)

const messageQueue = new Map(); // Map to store message queues for each thread

const startNewRun = async (threadId, assistantId, personality, message) => {
  const thread = await openai.beta.threads.create();
  const openAiThreadId = thread.id;
  addThreadToMap(threadId, openAiThreadId);
  
  const run = await openai.beta.threads.runs.create({
    thread_id: openAiThreadId,
    assistant_id: assistantId,
    instructions: personality,
  });

  const status = await statusCheckLoop(openAiThreadId, run.id);
  const messages = await openai.beta.threads.messages.list(openAiThreadId);
  const responseMessage = messages.data[0].content[0].text.value;

  const chunkSizeLimit = 2000;

  for (let i = 0; i < responseMessage.length; i += chunkSizeLimit) {
    const chunk = responseMessage.substring(i, i + chunkSizeLimit);
    await webhookClient.send({ content: chunk });
  }

  const nextMessage = messageQueue.get(threadId)?.shift();
  if (nextMessage) {
    await startNewRun(threadId, assistantId, personality, nextMessage);
  }
};

client.on('messageCreate', async message => {
  // ... (your existing code)

  const discordThreadId = message.channel.id;
  const { assistantname, personality } = getBotConnections(discordThreadId);
  const webhookClient = new WebhookClient({ id: webhookId, token: webhookToken });

  console.log(`channel ${discordThreadId}`);

  let openAiThreadId = getOpenAiThreadId(discordThreadId);

  if (!openAiThreadId) {
    const messagesLoaded = false;

    if (message.channel.isThread()) {
      const starterMsg = await message.channel.fetchStarterMessage();
      const otherMessagesRaw = await message.channel.messages.fetch();

      const otherMessages = Array.from(otherMessagesRaw.values())
        .map(msg => msg.content)
        .reverse(); // oldest first

      const messages = [starterMsg.content, ...otherMessages]
        .filter(msg => !!msg && msg !== '');

      await Promise.all(messages.map(msg => addMessage(openAiThreadId, msg)));
      messageQueue.set(discordThreadId, []);
      messagesLoaded = true;
    }

    if (!messagesLoaded) {
      await addMessage(openAiThreadId, message.content);
    }

    await startNewRun(discordThreadId, assistantname, personality, message.content);
  } else {
    const queue = messageQueue.get(discordThreadId) || [];
    queue.push(message.content);
    messageQueue.set(discordThreadId, queue);
  }
  // ... (your existing code)
});
