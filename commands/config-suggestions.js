const { SlashCommandBuilder, ChannelType } = require('discord.js');
const GuildConfiguration = require('../models/GuildConfiguration');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('config-suggestions')
		.setDescription('Configure suggestion channels.')
		.setDMPermission(false)
		.addSubcommand((sub) =>
			sub
				.setName('add')
				.setDescription('Add a suggestions channel.')
				.addChannelOption((opt) =>
					opt
						.setName('channel')
						.setDescription('The channel to add.')
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(true),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('remove')
				.setDescription('Remove a suggestions channel.')
				.addChannelOption((opt) =>
					opt
						.setName('channel')
						.setDescription('The channel to remove.')
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(true),
				),
		),

	run: async ({ interaction }) => {
		// must be in a guild
		if (!interaction.guildId) {
			return interaction.reply({
				content:  'This command can only be used in a server.',
				ephemeral: true,
			});
		}

		const subcommand = interaction.options.getSubcommand();
		const channel = interaction.options.getChannel('channel');

		try {
			let cfg = await GuildConfiguration.findOne({ guildId: interaction.guildId });

			if (!cfg) {
				cfg = new GuildConfiguration({
					guildId:               interaction.guildId,
					suggestionChannelIds: [],
				});
			}

			if (subcommand === 'add') {
				if (cfg.suggestionChannelIds.includes(channel.id)) {
					return interaction.reply({
						content:  `${channel} is already registered.`,
						ephemeral: true,
					});
				}

				cfg.suggestionChannelIds.push(channel.id);
				await cfg.save();

				return interaction.reply(`✅ Added ${channel} to suggestion channels.`);
			}

			if (subcommand === 'remove') {
				if (!cfg.suggestionChannelIds.includes(channel.id)) {
					return interaction.reply({
						content:  `${channel} was not registered.`,
						ephemeral: true,
					});
				}

				cfg.suggestionChannelIds = cfg.suggestionChannelIds.filter(
					(id) => id !== channel.id,
				);
				await cfg.save();

				return interaction.reply(`🗑️ Removed ${channel} from suggestion channels.`);
			}
		}
		catch (err) {
			console.error('Error in /config-suggestions:', err);

			return interaction.reply({
				content:  '❌ Something went wrong while updating the configuration.',
				ephemeral: true,
			});
		}
	},

	options: {
		userPermissions: ['Administrator'],
		deleted:         false,
	},
};
