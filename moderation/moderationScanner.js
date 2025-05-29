const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const yaml = require('js-yaml');
const fs = require('fs');

const MOD_CHANNEL_ID = '1008371145793351740';
const RULE_FILE = './config/scam_rules.yaml'; // ✅ Updated path

let scamRules = [];

try {
  const file = fs.readFileSync(RULE_FILE, 'utf8');
  const parsed = yaml.load(file);
  scamRules = parsed.rules || [];
} catch (e) {
  console.error('Error loading scam rules:', e);
}

module.exports = async function handleMessageModeration(client, message) {
  if (message.author.bot || !message.guild) return;

  const content = message.content.toLowerCase();
  const match = scamRules.find(rule => {
    const regex = new RegExp(rule.pattern, 'i');
    return regex.test(content);
  });

  if (!match) return;

  try {
    const modChannel = await client.channels.fetch(MOD_CHANNEL_ID);
    if (!modChannel) return;

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🚨 Potential Scam Message Detected')
      .addFields(
        { name: 'User', value: `${message.author.tag} (<@${message.author.id}>)`, inline: false },
        { name: 'Reason', value: match.reason, inline: false },
        { name: 'Message', value: message.content.slice(0, 1000), inline: false },
        { name: 'Link', value: `[Jump to message](${message.url})`, inline: false }
      )
      .setFooter({ text: `Rule ID: ${match.id}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`warn_${message.id}`).setLabel('⚠️ Warn').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`delete_${message.id}`).setLabel('❌ Delete').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`ban_${message.id}`).setLabel('🔨 Ban').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`allow_${message.id}`).setLabel('✅ Allow').setStyle(ButtonStyle.Success)
    );

    await modChannel.send({ embeds: [embed], components: [row] });

  } catch (err) {
    console.error('Error sending mod message:', err);
  }
};
