const { SlashCommandBuilder } = require('discord.js');
const itemSchema = require('../models/item.js');


/**
   *
   * @param {Object} param0
   * @param {ChatInputCommandInteraction} param0.interaction
   */

module.exports = {
	data: new SlashCommandBuilder()
		.setName('additem')
		.setDescription('Use this to add new items!')
		.setDMPermission(true)
		.addStringOption(option => option.setName('item').setDescription('Item name').setRequired(true))
		.addIntegerOption(option => option.setName('moonstone').setDescription('Moonstones required').setRequired(true))
		.addIntegerOption(option => option.setName('gold').setDescription('Cost in gold').setRequired(true))
		.addIntegerOption(option => option.setName('tier').setDescription('Required tier to buy').setRequired(true).addChoices({ name: 'tier 1', value: 1 },
			{ name: 'Tier 2', value: 2 }))
		.addStringOption(option => option.setName('description').setDescription('Item description').setRequired(true))
		.addIntegerOption(option => option.setName('qty').setDescription('Starting quantity').setRequired(true))
		.addStringOption(option => option.setName('attunement').setDescription('Does the item require attunement').setRequired(true).addChoices({ name: 'no', value: 'n' },
			{ name: 'Yes', value: 'y' })),

	run: async ({ interaction }) => {


		const { options, member } = interaction;
		const string = options.getString('item');
		const moonstone = options.getInteger('moonstone');
		const gold = options.getInteger('gold');
		const tier = options.getInteger('tier');
		const description = options.getString('description');
		const qty = options.getInteger('qty');
		const attunement = options.getString('attunement');
		const allowedRoleID = process.env.dmRole;

		if (!member.roles.cache.has(allowedRoleID)) {
			await interaction.reply({ content: 'You do not have the required role to use this command.', ephemeral: true });
			return;
		}

		const newItem = new itemSchema({
			name: string,
			costMoonstone: moonstone,
			costGold: gold,
			requiredTier: tier,
			description: description,
			qty: qty,
			attunement: attunement,
		});

		await newItem.save();

		const targetUserId = interaction.options.getUser('target-user')?.id || interaction.user.id;


		await interaction.reply(`New item ${string} added to store inventory!`);
	},
	options: {
		deleted: true,
	},
};