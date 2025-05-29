const recap = require('../../models/recap');
const formatResults = require('../../utils/formatResults');
const adventurers = require('../../models/adventurers');


/**
 *
 * @param {Interaction} interaction
 * @param {import('discord.js').Client} client
 */
module.exports = async (interaction, client) => {
	if (!interaction.isButton() || !interaction.customId) return false;

	const guild = interaction.guild;;
	const member = interaction.guild.members.cache.get(interaction.user.id);
	//   console.log(`Roles for ${interaction.user.tag}:`);
	// member.roles.cache.forEach(role => {
	//     console.log(role.name);
	// });

	try {
		const [type, recapId, action] = interaction.customId.split('.');

		if (!type || !recapId || !action) return false;
		if (type !== 'recap') return false;

		await interaction.deferReply({ ephemeral: true });

		const targetrecap = await recap.findOne({ recapId });
		const targetMessage = await interaction.channel.messages.fetch(targetrecap.messageId);
		const targetMessageEmbed = targetMessage.embeds[0];


		// Handle approve
		if (action === 'approve') {
			if (!member.roles.cache.some(role => role.name === process.env.dmRole)) {
				await interaction.editReply('Only DM\'s can approve or reject recaps.');
				return;
			}


			targetrecap.status = 'approved';

			targetMessageEmbed.data.color = 0x84e660;
			targetMessageEmbed.fields[1].value = '✅ Approved';

			await targetrecap.save();

			interaction.editReply('recap approved! Poster has been awarded 1 moonstone');

			targetMessage.edit({
				embeds: [targetMessageEmbed],
				components: [targetMessage.components[0]],
			});


			const targetMember = await guild.members.fetch(targetrecap.authorId);
			const player = interaction.guild.members.cache.get(targetrecap.authorId);


			// console.log(`Author from database ${targetrecap.authorId} discord ID ${targetMember.user.tag}`);
			let PCharacter = await adventurers.findOne({ userid: targetMember.user.tag });

			// console.log(`Adventurer: ${PCharacter}`);
			if (!PCharacter) {
				PCharacter = new adventurers({ userid: targetMember.user.tag, tier: 1 });
			}

			// Add reward transaction data
			PCharacter.transactions.push({
				type: 'recap reward',
				item: '1 moonstone',
				timestamp: new Date(),
			});

			// add member to lorekeep
			const roleToAdd = process.env.lorekeepRole;

			//         console.log(`Role to add: ${roleToAdd} Roles for ${targetMember.user.tag}:`);
			// player.roles.cache.forEach(role => {
			//     console.log(role.name);
			// });

			if (!player.roles.cache.some(role => role.name === process.env.lorekeeprolename)) {
				player.roles.add(roleToAdd)
					.then(() => {
						console.log(`Role added successfully to ${interaction.user.tag}`);
					})
					.catch(error => {
						console.error(`Error adding role to ${interaction.user.tag}:`, error);
					});
			}


			// Add moonstone
			PCharacter.moonstones += 1;

			await PCharacter.save();

			return;
		}

		// Handle reject
		if (action === 'reject') {
			if (!member.roles.cache.some(role => role.name === process.env.dmRole)) {
				await interaction.editReply('Only DM\'s can approve or reject recaps.');
				return;
			}

			targetrecap.status = 'rejected';

			targetMessageEmbed.data.color = 0xff6161;
			targetMessageEmbed.fields[1].value = '❌ Rejected';

			await targetrecap.save();

			interaction.editReply('recap rejected!');

			targetMessage.edit({
				embeds: [targetMessageEmbed],
				components: [targetMessage.components[0]],
			});

			return;
		}
		// handle vote
		const hasUpvoted = targetrecap.upvotes.includes(interaction.user.id);
		const hasDownvoted = targetrecap.downvotes.includes(interaction.user.id);

		if (action === 'upvote' && !hasUpvoted) {
			// If the user has downvoted before, remove their downvote
			if (hasDownvoted) {
				targetrecap.downvotes = targetrecap.downvotes.filter((id) => id !== interaction.user.id);
			}

			targetrecap.upvotes.push(interaction.user.id);
			await targetrecap.save();

			interaction.editReply('Upvoted recap!');
		}
		else if (action === 'downvote' && !hasDownvoted) {
			// If the user has upvoted before, remove their upvote
			if (hasUpvoted) {
				targetrecap.upvotes = targetrecap.upvotes.filter((id) => id !== interaction.user.id);
			}

			targetrecap.downvotes.push(interaction.user.id);
			await targetrecap.save();

			interaction.editReply('Downvoted recap!');
		}
		else {
			// If the user has already voted (either upvoted or downvoted), remove their vote
			if (hasUpvoted) {
				targetrecap.upvotes = targetrecap.upvotes.filter((id) => id !== interaction.user.id);
			}
			else if (hasDownvoted) {
				targetrecap.downvotes = targetrecap.downvotes.filter((id) => id !== interaction.user.id);
			}

			await targetrecap.save();

			interaction.editReply('Vote removed!');
		}

		targetMessageEmbed.fields[2].value = formatResults(
			targetrecap.upvotes,
			targetrecap.downvotes,
		);

		targetMessage.edit({
			embeds: [targetMessageEmbed],
		});
		return;

	}
	catch (error) {
		console.log(error);
	}
};