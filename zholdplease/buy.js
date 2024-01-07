const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('buy')
		.setDescription('automatically buy items!'),
	async execute(interaction) {
		await interaction.reply(`Thank you for testing this command! Eventually, this will allow our friendly shopkeep Wren to automatically sell items to adventurers. This will automatically tell the adventurer the full cost of the item and will subtract 1 count of the item to the shop inventory.`);
	},
};

/*async function buyItem(message, args) {
	const user_id = message.author.id;
	console.log(args);
	const item_name = args[0].toLowerCase();
	const quantity = parseInt(args[1]) || 1;
  
	// MongoDB connection
	await dbclient.connect();
	const db = dbclient.db(dbName);
	const inventoryCollection = db.collection(collectionName);
  
	// Check if the item exists in the inventory
	const item = await inventoryCollection.findOne({ name: item_name });
	if (item) {
	  const mooonstoneCost = itemToUpdate.items.costMoonstone;
	  const costGold = itemToUpdate.items.costGold;
		// Check if there are enough items in the inventory
		if (item.quantity >= quantity) {
			// Update user's inventory
			await inventoryCollection.updateOne(
				{ user_id: user_id, 'items.name': item_name },
				{ $inc: { 'items.$.quantity': quantity } }
			);
			// Log the transaction
			console.log(`${message.author.tag} bought ${quantity} ${item_name}`);
			message.channel.send(`Successfully bought ${quantity} ${item_name} for ${moonstoneCost} and ${costGold}\n *Wren takes the offered payment safely tucking it away before procuring ${item_name}and handing it over*\n\n***Please subtract the requisite amount of Moonstones and Gold from your LFG and D&D character sheets***`);
		} else {
			message.channel.send('Not enough quantity available.');
		}
	} else {
		message.channel.send('Item not found in inventory.');
	}
  
	await dbclient.close();
  }*/