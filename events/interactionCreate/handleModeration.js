// src/events/interactionCreate/handleModeration.js
const handleModerationInteractions = require('../../moderation/moderationActions');

module.exports = async (interaction, client) => {
  if (!interaction.isButton() && !interaction.isModalSubmit()) return;
  await handleModerationInteractions(client, interaction);
};
