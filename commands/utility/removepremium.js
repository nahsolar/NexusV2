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
    .setName('remove-premium')
    .setDescription('Remove premium from a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Select the user to remove premium')
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

      // Check if the user is a premium user
      const existingUser = await premiumUsersCollection.findOne({ discordId: targetUser.id });
      if (!existingUser) {
        await interaction.reply(`User ${userMention(targetUser.id)} is not a premium user.`);
        return;
      }

      // Remove premium from the selected user
      await premiumUsersCollection.deleteOne({ discordId: targetUser.id });

      // Send a success message
      const embed = new EmbedBuilder()
        .setColor('#FF0000') // Red color
        .setTitle('Premium Removed')
        .setDescription(`Premium has been removed from ${userMention(targetUser.id)}.`)
        .setThumbnail(targetUser.avatarURL());

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error removing premium:', error);
      await interaction.reply('An error occurred while removing premium.');
    } finally {
      await client.close();
    }
  },
};
