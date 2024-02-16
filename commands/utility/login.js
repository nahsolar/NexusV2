const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { MongoClient } = require('mongodb');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('login')
    .setDescription('Logins into your epic games account!')
    .addStringOption(option =>
      option
        .setName('authcode')
        .setDescription('Enter your authorization code here!')
        .setRequired(true)),

  async execute(interaction) {
    let client; // Declare the client variable here

    try {
      // Read MongoDB password from config.json
      const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
      const mongodbPassword = config.mongodbPassword;

      // Construct the MongoDB URI
      const uri = `mongodb+srv://NexusBot:${mongodbPassword}@nexus.awivttx.mongodb.net/?retryWrites=true&w=majority`;

      // Connect to MongoDB
      client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
      await client.connect();

      // Create or get the collection
      const collection = client.db('NexusBot').collection('deviceAuths');

      // Check if the user already has an account
      const existingAccount = await collection.findOne({ discord_id: interaction.user.id });

      if (existingAccount) {
        await interaction.reply("You can only have 1 account on Nexus! Get premium to login to more at <#1190132743082868757>!");
        return;
      }

      const authcode = interaction.options.getString('authcode');
      const discordUserId = interaction.user.id;

      // Save display name, Discord ID, and other information to MongoDB
      const response = await axios.post(
        'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token',
        {
          token_type: 'eg1',
          grant_type: 'authorization_code',
          code: authcode,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic MzQ0NmNkNzI2OTRjNGE0NDg1ZDgxYjc3YWRiYjIxNDE6OTIwOWQ0YTVlMjVhNDU3ZmI5YjA3NDg5ZDMxM2I0MWE=',
          },
        }
      );

      const dataToWrite = {
        access_token: response.data.access_token,
        account_id: response.data.account_id,
        display_name: response.data.displayName,
        discord_id: discordUserId,
        refresh_token: response.data.refresh_token,
      };

      // Update the existing document or insert a new one
      await collection.updateOne(
        { discord_id: discordUserId },
        { $set: { ...dataToWrite, deviceAuth: null } }, // Nullify deviceAuth initially
        { upsert: true }
      );

      const postData1 = {
        token_type: 'eg1',
        grant_type: 'authorization_code',
        code: authcode,
      };

      const secondResponse = await axios.post(
        `https://account-public-service-prod.ol.epicgames.com/account/api/public/account/${dataToWrite.account_id}/deviceAuth`,
        postData1,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dataToWrite.access_token}`,
          },
        }
      );

      // Update the MongoDB document with the second response data
      await collection.updateOne(
        { discord_id: discordUserId },
        { $set: { deviceAuth: secondResponse.data } }
      );

      // Close the MongoDB connection
      await client.close();

      // Create an embedded message with thumbnail
      const embed = new EmbedBuilder()
        .setTitle('Successful Login!')
        .setDescription(`Logged into ${dataToWrite.display_name}!`)
        .setColor('#00FF00') // Green color
        .setThumbnail('https://static.wikia.nocookie.net/fortnite/images/c/c7/Kuno_%28Blizzard_Buster%29_-_Outfit_-_Fortnite.png/revision/latest?cb=20230607221250'); // Replace with your image URL

      // Send the embedded message and delete the loading message
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error:', error);

      // Handle specific error status (400)
      if (error.response && error.response.status === 400) {
        await interaction.reply("The code you have given is either invalid or expired.");
      } else {
        await interaction.reply('An error occurred. Please try again.');
      }
    } finally {
      // Close the MongoDB connection
      if (client) {
        await client.close();
      }
    }
  },
};
