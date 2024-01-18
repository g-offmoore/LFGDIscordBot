const {
    ChatInputCommandInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessagePayload,
  } = require('discord.js');
  const recap = require('../models/recap');
  const formatResults = require('../utils/formatResults');
  const fs = require('fs');
  
  module.exports = {
    data: {
      name: 'recap',
      description: 'Create a recap.',
      dm_permission: false,
    },
  
    /**
     *
     * @param {Object} param0
     * @param {ChatInputCommandInteraction} param0.interaction
     */
    run: async ({ interaction }) => {
      try {

        if (interaction.channelId !== process.env.recapChannel) {
            await interaction.reply({content: `This command is only allowed in the ${process.env.recaplink} channel.`, ephemeral: true });
            return;
        }
  
        const modal = new ModalBuilder()
          .setTitle('Create a recap')
          .setCustomId(`recap-${interaction.user.id}`);
  
        const textInput = new TextInputBuilder()
          .setCustomId('recap-input')
          .setLabel('What would you like to recap?')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(4000);
  
        const actionRow = new ActionRowBuilder().addComponents(textInput);
  
        modal.addComponents(actionRow);
  
        await interaction.showModal(modal);
  
        const filter = (i) => i.customId === `recap-${interaction.user.id}`;
  
        const modalInteraction = await interaction
          .awaitModalSubmit({
            filter,
            time: 1000 * 60 * 5,
          })
          .catch((error) => console.log(error));
  
        await modalInteraction.deferReply({ ephemeral: true });
  
        let recapMessage;
  
        try {
          recapMessage = await interaction.channel.send('Creating recap, please wait...');
        } catch (error) {
          modalInteraction.editReply(
            'Failed to create recap message in this channel. I may not have enough permissions.'
          );
          return;
        }
  
        const recapText = modalInteraction.fields.getTextInputValue('recap-input');
        const fileName = `recap_${interaction.user.id}.txt`;
        fs.writeFileSync(fileName, recapText);

        const newrecap = new recap({
          authorId: interaction.user.id,
          guildId: interaction.guildId,
          messageId: recapMessage.id,
          content: recapText,
        });
  
        await newrecap.save();
  
        modalInteraction.editReply('recap created!');
  
        // recap embed
        const recapEmbed = new EmbedBuilder()
          .setAuthor({
            name: interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ size: 256 }),
          })
          .addFields([
            { name: 'recap', value: 'See attached file' },
            { name: 'Status', value: '⏳ Pending' },
            { name: 'Votes', value: formatResults() },
          ])
          .setColor('Yellow');

          // interaction.user.send({
          //   content: `Here is your recap:`,
          //   embeds: [recapEmbed],
          //   files: [fileName],
          // });
          await interaction.followUp({  
          Embeds: ([recapEmbed]),
          files: [fileName],
      });


  
        // Buttons
        const upvoteButton = new ButtonBuilder()
          .setEmoji('👍')
          .setLabel('Upvote')
          .setStyle(ButtonStyle.Primary)
          .setCustomId(`recap.${newrecap.recapId}.upvote`);
  
        const downvoteButton = new ButtonBuilder()
          .setEmoji('👎')
          .setLabel('Downvote')
          .setStyle(ButtonStyle.Primary)
          .setCustomId(`recap.${newrecap.recapId}.downvote`);
  
        const approveButton = new ButtonBuilder()
          .setEmoji('✅')
          .setLabel('Approve')
          .setStyle(ButtonStyle.Success)
          .setCustomId(`recap.${newrecap.recapId}.approve`);
  
        const rejectButton = new ButtonBuilder()
          .setEmoji('🗑️')
          .setLabel('Reject')
          .setStyle(ButtonStyle.Danger)
          .setCustomId(`recap.${newrecap.recapId}.reject`);
        
  
        // Rows
        const firstRow = new ActionRowBuilder().addComponents(upvoteButton, downvoteButton);
        const secondRow = new ActionRowBuilder().addComponents(approveButton, rejectButton);
       
  
        recapMessage.edit({
          content: `${interaction.user} Recap submitted! Your DMs thank you and will review shortly`,
          embeds: [recapEmbed],
          components: [firstRow, secondRow],
        });

                  // Cleanup: Remove the temporary file after sending
                  // fs.unlinkSync(fileName);
        
      } catch (error) {
        console.error(error);
        console.log(`Error in /recap: ${error}`);
      }
    },
    options: {
        deleted: false,
    },
  };