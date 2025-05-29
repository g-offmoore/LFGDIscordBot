// src/events/guildMemberUpdate/roleAssign.js
const { processPendingWelcomes } = require('../../utils/welcomeManager');

module.exports = {
  name: 'guildMemberUpdate',
  run: async (client, oldMember, newMember) => {
    const oldCount = oldMember.roles.cache.size;
    const newCount = newMember.roles.cache.size;
    // only fire when they go from no extra roles → at least one
    if (oldCount <= 1 && newCount > 1) {
      await processPendingWelcomes(client);
    }
  }
};
