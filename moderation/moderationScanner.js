const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const path = require('node:path');
const fs = require('fs');
const yaml = require('js-yaml');

const MOD_CHANNEL_ID = '1008371145793351740';
// Use absolute path based on this file's directory
const RULE_FILE = path.join(__dirname, '../config/mod_rules.yaml');

// Load and compile once at module import time
let compiledRules = [];
try {
  const raw = fs.readFileSync(RULE_FILE, 'utf8');
  const parsed = yaml.load(raw);
  const scamRules = parsed.rules || [];
  compiledRules = scamRules.map(rule => ({
    id:     rule.id,
    action: rule.action,
    reason: rule.reason,
    regex:  new RegExp(rule.pattern, 'i')
  }));
  console.log(`Loaded ${compiledRules.length} scam rules.`);
} catch (err) {
  console.error('❌ Error loading scam rules:', err);
  process.exit(1);
}

module.exports = async function handleMessageModeration(client, message) {
  // Ignore bots and DMs
  if (message.author.bot || !message.guild) return;

  const content = message.content;
  const match = compiledRules.find(r => r.regex.test(content));
  if (!match) return;

  try {
    const modChannel = await client.channels.fetch(MOD_CHANNEL_ID);
    if (!modChannel) return;

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🚨 Potential Scam Message Detected')
      .addFields(
        { name: 'User',    value: `${message.author.tag} (<@${message.author.id}>)`, inline: false },
        { name: 'Reason',  value: match.reason,                                     inline: false },
        { name: 'Message', value: message.content.slice(0, 1000),                    inline: false },
        { name: 'Link',    value: `[Jump to message](${message.url})`,                inline: false }
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
