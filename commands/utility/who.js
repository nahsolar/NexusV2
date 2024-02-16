const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MongoClient } = require('mongodb');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('who')
    .setDescription('Who you are logged in as'),

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

      // Retrieve display name from MongoDB
      const userDoc = await collection.findOne({ discord_id: interaction.user.id });
      const displayName = userDoc ? userDoc.display_name : 'Unknown';

      // Close the MongoDB connection
      await client.close();

      // Create an embed with the display name
      const embed = new EmbedBuilder()
        .setColor('#3498db') // Blue color
        .setTitle('User Information')
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields({
            name: 'Logged into', value: `${displayName}`
        });

      // Reply to the user with the embed
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error:', error);

      // Handle errors as needed

      // Send an error reply with an embed
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000') // Red color
        .setTitle('Error')
        .setDescription('An error occurred while getting user information.');

      interaction.reply({ embeds: [errorEmbed] });
    }
  },
};
