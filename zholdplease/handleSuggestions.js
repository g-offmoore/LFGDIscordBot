const { Interaction } = require('discord.js');
const Suggestion = require ('../models/Suggestions')
const formatResults = require('../utils/formatResults')

/**
 * 
 * @param {Interaction} interaction 
 */

module.exports = async(interaction)=>{
    if (!interaction.isButton() || !interaction.customId) return;

    try {
        const [type, suggestionId, action] = interaction.customId.split('.');

        if (!type || !suggestionId || !action) return;
        if (type !== 'suggestion')return;

        await interaction.derferReply({ephemeral: true});

        const targetSuggestion = await Suggestion.findOne({suggestionId});
        const targetMessage = await interaction.channel.messages.fetch(targetSuggestion.messageId);
        const targetMessageEmbed = targetMessage.embeds[0];

        if (action === 'approve'){
            if (!interaction.memberPermissions.has('Administrator')){
                await interaction.editReply('You do not have permission to approve suggestions.');
                return;
            }
            targetSuggestion.status = 'approved';

            targetMessage.roleSubscriptionData.color = 0x84e660;
            targetMessageEmbed.fields[1].value = '✅ Approved'

            await targetSuggestion.save();

            interaction.editReply('Suggestion approved!');

            targetMessage.edit({
                embeds: [targetMessageEmbed],
                components: [targetMessage.components[0]],
            });
            return;
        }

        if (action === 'rejected'){
            if (!interaction.memberPermissions.has('Administrator')){
                await interaction.editReply('You do not have permission to reject suggestions.');
                return;
            }
            targetSuggestion.status = 'rejected';

            targetMessage.roleSubscriptionData.color = 0xff6161;
            targetMessageEmbed.fields[1].value = '❌ Rejected'

            await targetSuggestion.save();

            interaction.editReply('Suggestion rejected');

            targetMessage.edit({
                embeds: [targetMessageEmbed],
                components: [targetMessage.components[0]],
            });
            return;
        }

        if (action === 'upvote'){
            
            const hasVoted = targetSuggestion.upvotes.includes(interaction.user.id) || targetSuggestion.downvotes.includes(interaction.user.id);

            if(hasVoted){
                await interaction.editReply('You have already cast your vote, while we appeciate your enthusiasm please save it for the next suggestion.');
                return;
            }
            
            targetSuggestion.upvotes.push(interaction.user.id);

            await targetSuggestion.save();

            interaction.editReply('Upvoted suggestion!');

            targetMessageEmbed.fields[2].value = formatResults(
                targetSuggestion.upvotes,
                targetSuggestion.downvotes,
            );

           targetMessage.edit({
            embeds: [targetMessageEmbed],
           });
            
            return;
        }

        if (action === 'downvote'){
            
            const hasVoted = targetSuggestion.upvotes.includes(interaction.user.id) || targetSuggestion.downvotes.includes(interaction.user.id);

            if(hasVoted){
                await interaction.editReply('You have already cast your vote, while we appeciate your enthusiasm please save it for the next suggestion.');
                return;
            }
            
            targetSuggestion.downvotes.push(interaction.user.id);

            await targetSuggestion.save();

            interaction.editReply('Downvoted suggestion!');

            targetMessageEmbed.fields[2].value = formatResults(
                targetSuggestion.upvotes,
                targetSuggestion.downvotes,
            );

           targetMessage.edit({
            embeds: [targetMessageEmbed],
           });
            
            return;
        }
    } catch (error) {
        console.log(`Error in handleSuggestion.js ${error}`);
    }

















};