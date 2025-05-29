const handleMessageModeration = require('../../moderation/moderationScanner');

module.exports = async (message, client) => {
  await handleMessageModeration(client, message);
};
