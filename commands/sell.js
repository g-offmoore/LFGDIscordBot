const { SlashCommandBuilder } = require('discord.js');
const items = require('../models/item');
const adventurers = require('../models/adventurers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription('Sell items from your inventory')
        .addStringOption(option => option.setName('item').setDescription('Item name').setRequired(true))
        .addIntegerOption(option => option.setName('quantity').setDescription('Quantity of items to sell').setRequired(true)),

    run: async ({ interaction, client, handler }) => {
        try {
            const { options } = interaction;
            const itemName = options.getString('item');
            const sellQuantity = options.getInteger('quantity');
            const UNAME = interaction.member.user.tag;

			        // Check if the interaction is in the allowed channel
					if (interaction.channelId !== process.env.Channel2 ) {
						await interaction.reply({content: 'This command is only allowed in the Moonstone Menagerie channel.', ephemeral: true });
						return;
					}

            let PCharacter = await adventurers.findOne({ userid: UNAME });

            if (!PCharacter) {
                await interaction.reply('Character not found. Create a character first.');
                return;
            }

            // Find the item in the database
            let soldItem = await items.findOne({ name: itemName });

            if (!soldItem) {
                await interaction.reply('Item not found in the database.');
                return;
            }

            // Check if the player has the item in their inventory
            const inventoryItem = PCharacter.items.find((item) => item.name === itemName);

            if (!inventoryItem || inventoryItem.quantity < sellQuantity) {
                await interaction.reply('You do not have enough of this item to sell.');
                return;
            }

            // Calculate the selling price (half of the original cost rounded up)
            const sellPrice = Math.ceil(soldItem.costGold / 2) * sellQuantity;
            const sellPriceM = Math.ceil(soldItem.costMoonstone / 2) * sellQuantity;

            // Add a sell transaction
            PCharacter.transactions.push({
                type: 'sell',
                item: {
                    name: soldItem.name,
                    costGold: sellPrice,
                    costMoonstone: 0, // Assuming no cost in moonstones for selling
                },
                quantity: sellQuantity,
                timestamp: new Date(),
            });

            // Add gold to the player's balance
            PCharacter.gold += sellPrice;
            PCharacter.moonstones += sellPrice;

            // Update the player's inventory
            const remainingQuantity = inventoryItem.quantity - sellQuantity;
            if (remainingQuantity > 0) {
                // If there are remaining items, update the quantity
                inventoryItem.quantity = remainingQuantity;
            } else {
                // If all items are sold, remove the item from the inventory
                PCharacter.items = PCharacter.items.filter((item) => item.name !== itemName);
            }

            // Save the updated character and item
            await Promise.all([PCharacter.save(), soldItem.save()]);

            await interaction.reply(`You sold ${sellQuantity} ${itemName}(s) for ${sellPrice}🪙 and ${sellPriceM}💎.`);

        } catch (error) {
            console.error(error);
            await interaction.reply('An error occurred while processing the sell command.');
        }
    }
};