// src/events/guildMemberUpdate/roleAssign.js
const { processPendingWelcomes } = require('../../utils/welcomeManager');

module.exports = async (oldMember, newMember, client) => {
  const oldCount = oldMember.roles.cache.size;
  const newCount = newMember.roles.cache.size;
  if (oldCount <= 1 && newCount > 1) {
    try {
      await processPendingWelcomes(client);
    } catch (err) {
      console.error('Error processing pending welcomes', err);
    }
  }
};
