const handleModerationButtons = require('../../moderation/moderationActions');

module.exports = async (interaction, client) => {
  if (!interaction.isButton()) return;

  await handleModerationButtons(client, interaction);
};
