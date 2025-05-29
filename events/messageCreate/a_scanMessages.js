// src/events/messageCreate/a_scanMessages.js
const handleMessageModeration = require('../../moderation/moderationScanner');

module.exports = async (message, client) => {
  // ignore bots and DMs
  if (message.author.bot || !message.guild) return;
  await handleMessageModeration(client, message);
};
