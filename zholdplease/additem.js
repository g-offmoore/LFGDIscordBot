const { SlashCommandBuilder } = require('discord.js');
const itemSchema = require('../item.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('additem')
        .setDescription('Use this to add new items!')
        .setDMPermission(true)
        .addStringOption(option=> option.setName('item').setDescription('Item name').setRequired(true))
        .addIntegerOption(option=> option.setName('moonstone').setDescription('Moonstones required').setRequired(true))
        .addIntegerOption(option=> option.setName('gold').setDescription('Cost in gold').setRequired(true))
        .addIntegerOption(option=> option.setName('tier').setDescription('Required tier to buy').setRequired(true).addChoices({ name: 'tier 1', value: 1 },
        { name: 'Tier 2', value: 2 },))
        .addStringOption(option=> option.setName('description').setDescription('Item description').setRequired(true))
        .addIntegerOption(option=> option.setName('qty').setDescription('Starting quantity').setRequired(true))
        .addStringOption(option=> option.setName('attunement').setDescription('Does the item require attunement').setRequired(true).addChoices({ name: 'no', value: 'n' },
        { name: 'Yes', value: 'y' },)),
    run: ({interaction,client, handler}) => {
        
        const {options} = interaction;
        const string = options.getString('item');
        const moonstone = options.getInteger('moonstone');
        const gold = options.getInteger('gold');
        const tier = options.getInteger('tier');
        const description = options.getString('description');
        const qty = options.getInteger('qty');
        const attunement = options.getString('attunement');

        interaction.reply('Processing your request. It may take a moment to find somewhere safe to store it. We dont want another incident......');

        try {
            Promise.race([
                itemSchema.create({
                    name: string,
                    costMoonstone: moonstone,
                    costGold: gold,
                    requiredTier: tier,
                    description: description,
                    qty: qty,
                    attunement: attunement,
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout during item creation')), 30000))        
            ]);


        interaction.followUp(`New item ${string} added to store inventory!`);
    } catch(error){console.error('Error creating item:', error.message);
    interaction.followUp(`**cough** There were some issues while trying to store ${string}. Give me a minute to straighten up the shop and we will try again!.`);
}
    },
    options: {

    },
};