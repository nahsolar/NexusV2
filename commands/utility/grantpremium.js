const { SlashCommandBuilder, userMention } = require('discord.js');
const { MongoClient } = require('mongodb');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');

// Create a global client variable
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const mongodbPassword = config.mongodbPassword;
const uri = `mongodb+srv://NexusBot:${mongodbPassword}@nexus.awivttx.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('grant-premium')
    .setDescription('Grant premium to a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Select the user to grant premium')
        .setRequired(true)),

  async execute(interaction) {
    try {
    // Check if the command is invoked by the authorized user
    if (interaction.user.id !== '1167562687337746492') {
    await interaction.reply('You are not authorized to use this command.');
    return;
    }
      await client.connect();

      const premiumUsersCollection = client.db('Nexus').collection('premiumUsers');

      const targetUser = interaction.options.getUser('user');

      // Check if the user is already a premium user
      const existingUser = await premiumUsersCollection.findOne({ discordId: targetUser.id });
      if (existingUser) {
        await interaction.reply(`User ${userMention(targetUser.id)} is already a premium user.`);
        return; 
      }

      // Grant premium to the selected user
      await premiumUsersCollection.insertOne({ discordId: targetUser.id });

      // Send a success message
      const embed = new EmbedBuilder()
        .setColor('#00FF00') // Green color
        .setTitle('Premium Granted')
        .setDescription(`Premium has been granted to ${userMention(targetUser.id)}.`)
        .setThumbnail(targetUser.avatarURL());

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error granting premium:', error);
      await interaction.reply('An error occurred while granting premium.');
    } finally {
      await client.close();
    }
  },
};
