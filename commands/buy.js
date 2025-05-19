const { SlashCommandBuilder } = require('discord.js');
const items = require('../models/item');
const adventurers = require('../models/adventurers');

/**
 *
 * @param{inventory}
 */
module.exports = {
	data: new SlashCommandBuilder()
		.setName('buy')
		.setDescription('Automatically buy items!')
		.addStringOption(option => option.setName('item').setDescription('Item name').setRequired(true).setAutocomplete(true))
		.addIntegerOption(option => option.setName('level').setDescription('Your character tier').setRequired(true).addChoices({ name: 'tier 1', value: 1 },
			{ name: 'Tier 2', value: 2 }))
		.addIntegerOption(option => option.setName('gold').setDescription('Enter your current gold if changed since your last visit'))
		.addIntegerOption(option => option.setName('moonstones').setDescription('Enter your current moonstones if changed since your last visit')),


	run: async ({ interaction }) => {
		try {

			const item = interaction.options.getString('item');
			// console.log(item);
			const moonstones = interaction.options.getInteger('moonstones');
			const gold = interaction.options.getInteger('gold');
			const level = interaction.options.getInteger('level');
			const UNAME = interaction.member.user.tag;

			// Check if the interaction is in the allowed channel
			if (interaction.channelId !== process.env.Channel2) {
				await interaction.reply({ content: 'This command is only allowed in the Moonstone Menagerie channel.', ephemeral: true });
				return;
			}


			const purchase = await items.findOne({ name: item });

			let PCharacter = await adventurers.findOne({ userid: UNAME });


			if (!PCharacter) {
				PCharacter = new adventurers({ userid: UNAME, tier: level });
			}

			if (PCharacter.tier !== level) {
				PCharacter.transactions.push({
					type: 'tier_update',
					newtier: level,
					oldtier: PCharacter.tier,
					timestamp: new Date(),
				});
				PCharacter.tier = level;
			}
			// Check if gold or moonstones options are provided
			if (gold !== null) {
				PCharacter.transactions.push({
					type: 'gold_update',
					amount: gold,
					timestamp: new Date(),
				});

				// Update the player's gold
				PCharacter.gold = gold;
			}

			if (moonstones !== null) {
				PCharacter.transactions.push({
					type: 'moonstones_update',
					amount: moonstones,
					timestamp: new Date(),
				});

				// Update the player's moonstones
				PCharacter.moonstones = moonstones;
			}

			// Save the updated character
			await PCharacter.save();


			if (!purchase) {
				await interaction.reply(
					'I\'m sorry but we dont seem to carry that item, check with the DMs if they can add it!',
				);
				return;
			}

			// deepcode ignore OperatorPrecedence: works fine for this level of check
			if (!purchase.qty > 0) {
				await interaction.reply(
					'Item is out of stock, please check back later!',
				);
				return;
			}

			if (purchase.requiredTier > level) {
				await interaction.reply(
					'This item requires a tier higher than your own. Come back once you have conqured more quests!',
				);
				return;
			}

			if (!(PCharacter.moonstones >= purchase.costMoonstone) || !(PCharacter.gold >= purchase.costGold)) {
				await interaction.reply(
					`I'm sorry but you do not have the required moonstones. Your current balance is ${PCharacter.gold}🪙 and ${PCharacter.moonstones}💎 and the item costs ${purchase.costGold}🪙 and ${purchase.costMoonstone}💎.\n Please return when you have sufficient funds.`,
				);
				return;
			}


			const newTransaction = [
				{ type: 'purchase',
					item: {
						name: purchase.name,
						costGold: purchase.costGold,
						costMoonstone: purchase.costMoonstone,
					},
					quantity: 1,
					timestamp: new Date() },
			];

			PCharacter.transactions.push(newTransaction);


			// Subtract monies
			PCharacter.gold -= purchase.costGold;
			PCharacter.moonstones -= purchase.costMoonstone;
			// PCharacter.items.addToSet(purchase.name);

			// Add an item to the array
			if (purchase.name) {
				PCharacter.items.push({ name: purchase.name, quantity: 1 });
			}
			else {
				console.log('Purchase name is undefined or faulty.');
			}

			// If the item already exists, increment the quantity
			const existingItemIndex = PCharacter.items.findIndex(item => item.name === purchase.name);
			if (existingItemIndex !== -1) {
				PCharacter.items[existingItemIndex].quantity += 1;
			}


			// subtract inventory
			purchase.qty -= 1;

			// save
			await Promise.all([PCharacter.save(), purchase.save()]);

			if (purchase.attunement === 'n') {

				await interaction.reply(
					`Congratulations ${UNAME} you are now the proud owner of ${item}. I have automatically deducted ${purchase.costGold}🪙 and ${purchase.costMoonstone}💎 from your account.\n
					Remember to add this item to your inventory and take your time to attune to it! Please also deduct your Moonstones and Gold from your personal ledger. Be safe adventurer!`);
				return;
			}
			else {
				await interaction.reply(
					`Congratulations ${UNAME} you are now the proud owner of ${item}. I have automatically deducted ${purchase.costGold}🪙 and ${purchase.costMoonstone}💎 from your account.\n
							Remember to add this item to your inventory and deduct your Moonstones and Gold from your personal ledger. Be safe adventurer!`,
				);
			}

		}
		catch (error) {
			console.log(error);
		}
	},
	autocomplete: async ({ interaction }) => {
		const focusedItemOption = interaction.options.getFocused(true);
		const itemsModel = require('../models/item');

		const choices = await itemsModel.find({});

		const formattedChoices = choices.map(choice => ({
			name: choice.name,
			value: choice.name,
			// You can adjust this based on your needs
		}));

		const filtered = formattedChoices.filter((choice) =>
			choice.name && choice.name.toLowerCase().startsWith(focusedItemOption.value.toLowerCase()),
		);
		// console.log(filtered);
		// Respond to the interaction with the formatted choices
		interaction.respond(filtered.slice(0, 25));
	},

	options: {
		deleted: true,
	},
};