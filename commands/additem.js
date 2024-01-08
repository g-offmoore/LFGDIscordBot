const { SlashCommandBuilder } = require('discord.js');
const itemSchema = require('../models/item.js');
const adventurerSchema = require('../models/adventurer.js')


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
        .addStringOption(option=> option.setName('item').setDescription('Item name').setRequired(true))
        .addIntegerOption(option=> option.setName('moonstone').setDescription('Moonstones required').setRequired(true))
        .addIntegerOption(option=> option.setName('gold').setDescription('Cost in gold').setRequired(true))
        .addIntegerOption(option=> option.setName('tier').setDescription('Required tier to buy').setRequired(true).addChoices({ name: 'tier 1', value: 1 },
        { name: 'Tier 2', value: 2 },))
        .addStringOption(option=> option.setName('description').setDescription('Item description').setRequired(true))
        .addIntegerOption(option=> option.setName('qty').setDescription('Starting quantity').setRequired(true))
        .addStringOption(option=> option.setName('attunement').setDescription('Does the item require attunement').setRequired(true).addChoices({ name: 'no', value: 'n' },
        { name: 'Yes', value: 'y' },)),
    
    run: async({interaction,client, handler}) => {
      
                
          const {options} = interaction;
          const string = options.getString('item');
          const moonstone = options.getInteger('moonstone');
          const gold = options.getInteger('gold');
          const tier = options.getInteger('tier');
          const description = options.getString('description');
          const qty = options.getInteger('qty');
          const attunement = options.getString('attunement');
  
                    
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
};
//     } catch(error){console.error('Error creating item:', error.message);
//     interaction.followUp(`**cough** There were some issues while trying to store ${string}. Give me a minute to straighten up the shop and we will try again!.`);
// }
 /*   },
    options: {
        deleted: false,
    },
    };

    module.exports = {
        run: async ({ interaction }) => {
          if (!interaction.inGuild()) {
            interaction.reply({
              content: 'This command can only be executed inside a server.',
              ephemeral: true,
            });
            return;
          }
      
          const targetUserId = interaction.options.getUser('target-user')?.id || interaction.user.id;
      
          await interaction.deferReply();
      
          try {
            let userProfile = await UserProfile.findOne({ userId: targetUserId });
      
            if (!userProfile) {
              userProfile = new UserProfile({ userId: targetUserId });
            }
      
            interaction.editReply(
              targetUserId === interaction.user.id ? `Your balance is ${userProfile.balance}` : `<@${targetUserId}>'s balance is ${userProfile.balance}`
            );
          } catch (error) {
            console.log(`Error handling /balance: ${error}`);
          }
        },
      
        data: {
          name: 'balance',
          description: 'Check your balance.',
          options: [
            {
              name: 'target-user',
              description: 'The user whose balance you want to see.',
              type: ApplicationCommandOptionType.User,
            },
          ],
        },
      };
      */