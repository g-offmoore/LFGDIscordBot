// src/events/guildMemberAdd/newMember.js
const { queueWelcome } = require('../../utils/welcomeManager');

module.exports = {
  name: 'guildMemberAdd',
  run: async (client, member) => {
    try {
      await queueWelcome(member);
    } catch (err) {
      console.error('Failed to queue welcome for', member.id, err);
    }
  }
};
