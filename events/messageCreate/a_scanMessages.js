const handleMessageModeration = require('../../moderation/moderationScanner');

module.exports = async (client, message) => {
  await handleMessageModeration(client, message);
};
