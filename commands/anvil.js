const { SlashCommandBuilder } = require('discord.js');

const DEFAULT_URL = 'https://www.worldanvil.com/w/lfg---tovaren-arkenhaus';

const articleLinks = {
  charactercreation: 'https://www.worldanvil.com/w/lfg---tovaren-arkenhaus/a/character-creation-article',
  reputation: 'https://www.worldanvil.com/w/lfg---tovaren-arkenhaus/a/reputation-article',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anvil')
    .setDescription('Reference World Anvil articles')
    .addStringOption(option =>
      option
        .setName('article')
        .setDescription('Choose the article to view')
        .addChoices(
          { name: 'Character Creation', value: 'charactercreation' },
          { name: 'Reputation', value: 'reputation' },
        )
    ),
  run: async ({ interaction }) => {
    const key = interaction.options.getString('article');
    const url = key ? articleLinks[key] : DEFAULT_URL;
    if (url) {
      await interaction.reply(url);
    } else {
      await interaction.reply({ content: 'Article not found.', ephemeral: true });
    }
  },
  options: {
    deleted: false,
  },
};

