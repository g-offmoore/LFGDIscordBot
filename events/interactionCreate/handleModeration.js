const handleModerationButtons = require('../../moderation/moderationActions');

module.exports = {
  name: 'interactionCreate',
  run: async (client, interaction) => {
    if (!interaction.isButton()) return;
    await handleModerationButtons(client, interaction);
  }
};