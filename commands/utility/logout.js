const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MongoClient } = require('mongodb');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logout')
    .setDescription('Logs out and removes account data from the database'),

  async execute(interaction) {
    try {
      // Read MongoDB password from config.json
      const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
      const mongodbPassword = config.mongodbPassword;

      // Construct the MongoDB URI
      const uri = `mongodb+srv://NexusBot:${mongodbPassword}@nexus.awivttx.mongodb.net/?retryWrites=true&w=majority`;

      // Connect to MongoDB
      const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
      await client.connect();

      // Create or get the collection
      const collection = client.db('NexusBot').collection('deviceAuths');

      // Remove user data from the database
      const result = await collection.deleteOne({ discord_id: interaction.user.id });

      // Close the MongoDB connection
      await client.close();

      // Create an embed for the reply
      const embed = new EmbedBuilder();

      if (result.deletedCount > 0) {
        // Success: User logged out
        embed.setColor('#00FF00') // Green color
          .setTitle('Logout Successful')
          .setDescription('You have been successfully logged out. Your account data has been removed from the database.');
      } else {
        // No account data found
        embed.setColor('#FF0000') // Red color
          .setTitle('Logout Failed')
          .setDescription('You are not logged in. No account data found.');
      }

      // Send the reply as an embed
      interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error:', error);
      // Handle errors as needed

      // Send an error reply as an embed
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000') // Red color
        .setTitle('Error')
        .setDescription('An error occurred while trying to log out.');

      interaction.reply({ embeds: [errorEmbed] });
    }
  },
};
