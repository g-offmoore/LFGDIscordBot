const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('sell')
		.setDescription('this will be used to sell items'),
	async execute(interaction) {
		await interaction.reply(`Thank you for testing this command! Eventually, this will allow our friendly shopkeep Wren to automatically buy back magic items from players. This will automatically be set at half the items original cost and will add 1 count of the item to the shop inventory.`);
	},
};

/*async function sellItem(message, args) {
	const user_id = message.author.id;
	const item_name = args[0].toLowerCase();
	const quantity = parseInt(args[1]) || 1;
	
	// MongoDB connection
	await dbclient.connect();
	const db = dbclient.db(dbName);
	const inventoryCollection = db.collection(collectionName);
	
	// Check if the item exists in the inventory
	const item = await inventoryCollection.findOne({ name: item_name });
	if (item) {
		// Extract information from the found item
			const mooonstoneCost = itemToUpdate.items.costMoonstone;
			const costGold = itemToUpdate.items.costGold;
			const halfMoonstoneCost = Math.ceil(moonstoneCost / 2);
			const halfCostGold = Math.ceil(costGold / 2);
			// Update user's inventory
			await inventoryCollection.updateOne(
				{ user_id: user_id, 'items.name': item_name },
				{ $inc: { 'items.$.quantity': quantity } }
			);
			// Log the transaction
			console.log(`${message.author.tag} sold ${quantity} ${item_name}`);
			message.channel.send(`Successfully sold ${quantity} ${item_name} for ${halfMoonstoneCost} and ${halfCostGold} \n *Wren slides the coin and Moonstones accross the counter* \n\n***please add this amount to your LFG and D&D character sheets***`);
	} else {
		message.channel.send('Item not found in inventory.');
	};
	
	await dbclient.close();
	}*/