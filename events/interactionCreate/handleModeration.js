// src/events/interactionCreate/handleModeration.js
const handleModerationButtons = require('../../moderation/moderationActions');

module.exports = async (interaction, client) => {
  // only care about button presses
  if (!interaction.isButton()) return;
  await handleModerationButtons(client, interaction);
};
