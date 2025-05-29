// events/guildMemberUpdate/roleAssign.js
const { processPendingWelcomes } = require('../utils/welcomeManager');

module.exports = async (oldMember, newMember, client) => {
	// When a user gains any role besides @everyone
	const oldCount = oldMember.roles.cache.size;
	const newCount = newMember.roles.cache.size;
	if (oldCount <= 1 && newCount > 1) {
		await processPendingWelcomes(client);
	}
};
