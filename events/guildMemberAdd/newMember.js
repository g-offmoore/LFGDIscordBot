// events/guildMemberAdd/newMember.js
const { queueWelcome } = require('../../utils/welcomeManager');

module.exports = (member) => {
	// Enqueue the welcome; errors are logged but do not crash
	queueWelcome(member)
		.catch(err => {
			console.error('Failed to queue welcome for', member.id, err);
		});
};
