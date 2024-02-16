const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { MongoClient } = require('mongodb');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fetch-rank')
    .setDescription('Gets your current rank.'),

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

      // Retrieve account_id and access_token from MongoDB
      const userDoc = await collection.findOne({ discord_id: interaction.user.id });
      const accountId = userDoc ? userDoc.account_id : null;
      const accessToken = userDoc ? userDoc.access_token : null;
      const refreshToken = userDoc ? userDoc.refresh_token : null;

      if (!accountId || !accessToken) {
        // DeviceAuth not found, send an embed response
        const embed = new EmbedBuilder()
          .setColor('#FF0000') // Red color
          .setTitle('Error')
          .setDescription('You are not logged in. Please log in using the `/login` command.');
        
        return interaction.reply({ embeds: [embed] });
      }

      // Set the headers for the GET request
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `bearer ${accessToken}`,
      };

      // Send the GET request using Axios
      const response = await axios.get(`https://fn-service-habanero-live-public.ogs.live.on.epicgames.com/api/v1/games/fortnite/trackprogress/${accountId}/byTrack/EYpme7`, { headers });

      // Extract rank information from the response
      const currentDivision = response.data.currentDivision;
      const promotionProgress = response.data.promotionProgress;

      // Create an embed based on the currentDivision
      let embed;
      switch (true) {
        case currentDivision <= 2:
          embed = createRankEmbed('Bronze', currentDivision, promotionProgress);
          break;
        case currentDivision <= 5:
          embed = createRankEmbed('Silver', currentDivision - 2, promotionProgress);
          break;
        case currentDivision <= 8:
          embed = createRankEmbed('Gold', currentDivision - 5, promotionProgress);
          break;
        case currentDivision <= 11:
          embed = createRankEmbed('Platinum', currentDivision - 8, promotionProgress);
          break;
        case currentDivision <= 14:
          embed = createRankEmbed('Diamond', currentDivision - 11, promotionProgress);
          break;
        case currentDivision <= 17:
          embed = createRankEmbed('Elite', currentDivision - 14, promotionProgress);
          break;
        case currentDivision <= 16:
          embed = createRankEmbed('Champion', currentDivision - 16, promotionProgress);
          break;
        case currentDivision <= 18:
          embed = createRankEmbed('Unreal', currentDivision - 17, promotionProgress);
          break;
        default:
          embed = createRankEmbed('Unknown', 0, 0);
      }

      // Reply to the user with the embed
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error:', error);

      // Handle specific error status (401)
      if (error.response && error.response.status === 401) {
        const embed = new EmbedBuilder()
          .setColor('#FF0000') // Red color
          .setTitle('Logged out')
          .setDescription('You have been automatically logged out. Sign back in with `/login`.');

        return interaction.reply({ embeds: [embed] });
      } else if (error.response && error.response.status === 400) {
        // Handle other specific error status (400)
        const embed = new EmbedBuilder()
          .setColor('#FF0000') // Red color
          .setTitle('Error')
          .setDescription('The request failed. Please try again.');

        await interaction.reply({ embeds: [embed] });
      } else {
        // Handle general error
        const embed = new EmbedBuilder()
          .setColor('#FF0000') // Red color
          .setTitle('Error')
          .setDescription('An error occurred. Please try again.');

        await interaction.reply({ embeds: [embed] });
      }
    } finally {
      // Close the MongoDB connection
      if (client) {
        await client.close();
      }
    }
  },
};

// Function to create an embed for a specific rank
function createRankEmbed(rank, division, progress) {
  const percentProgress = Math.round(progress * 100);
  const thumbnailUrl = getRankThumbnail(rank);

  if (rank.toLowerCase() === 'unranked' || (division === 0 && progress === 0)) {
    return new EmbedBuilder()
      .setTitle('Unranked')
      .setDescription('You haven\'t played a ranked game yet.')
      .setColor('#036bff')
      .setThumbnail('https://static.wikia.nocookie.net/fortnite/images/0/0d/Unknown_Rank_-_Icon_-_Fortnite.png/revision/latest/scale-to-width-down/250?cb=20230531202915');
  }

  return new EmbedBuilder()
    .setTitle(`${rank} ${division}`)
    .setDescription(`Your progress: ${percentProgress}%`)
    .setColor(getRankColor(rank))
    .setThumbnail(thumbnailUrl);
}

// Function to get color based on rank
function getRankColor(rank) {
  switch (rank.toLowerCase()) {
    case 'bronze':
      return '#c8a508'; // Bronze color
    case 'silver':
      return '#abdde1'; // Silver color
    case 'gold':
      return '#f5ea03'; // Gold color
    case 'platinum':
      return '#05a56f'; // Platinum color
    case 'diamond':
      return '#08b9cf'; // Diamond color
    case 'elite':
      return '#062428'; // Elite color
    case 'champion':
      return '#e9af1b'; // Champion color
    case 'unreal':
      return '#8f41f2'; // Unreal color
    default:
      return '#000000'; // Default color (black)
  }
}

// Function to get thumbnail image based on rank
function getRankThumbnail(rank) {
  switch (rank.toLowerCase()) {
    case 'bronze':
      return 'https://static.wikia.nocookie.net/fortnite/images/7/74/Bronze_III_-_Icon_-_Fortnite.png/revision/latest/scale-to-width-down/250?cb=20230531201222'; // Replace with the URL for the Bronze rank image
    case 'silver':
      return 'https://static.wikia.nocookie.net/fortnite/images/0/0a/Silver_III_-_Icon_-_Fortnite.png/revision/latest/scale-to-width-down/250?cb=20230531201237'; // Replace with the URL for the Silver rank image
    case 'gold':
      return 'https://static.wikia.nocookie.net/fortnite/images/c/cf/Gold_III_-_Icon_-_Fortnite.png/revision/latest/scale-to-width-down/250?cb=20230531201231'; // Replace with the URL for the Gold rank image
    case 'platinum':
      return 'https://static.wikia.nocookie.net/fortnite/images/3/30/Platinum_III_-_Icon_-_Fortnite.png/revision/latest/scale-to-width-down/250?cb=20230531201234'; // Replace with the URL for the Platinum rank image
    case 'diamond':
      return 'https://static.wikia.nocookie.net/fortnite/images/e/e1/Diamond_III_-_Icon_-_Fortnite.png/revision/latest/scale-to-width-down/250?cb=20230531201227'; // Replace with the URL for the Diamond rank image
    case 'elite':
      return 'https://static.wikia.nocookie.net/fortnite/images/2/2e/Elite_-_Icon_-_Fortnite.png/revision/latest/scale-to-width-down/250?cb=20230531201228'; // Replace with the URL for the Elite rank image
    case 'champion':
      return 'https://static.wikia.nocookie.net/fortnite/images/2/2a/Champion_-_Icon_-_Fortnite.png/revision/latest/scale-to-width-down/250?cb=20230531201223'; // Replace with the URL for the Champion rank image
    case 'unreal':
      return 'https://static.wikia.nocookie.net/fortnite/images/6/6c/Unreal_-_Icon_-_Fortnite.png/revision/latest/scale-to-width-down/250?cb=20230531201239'; // Replace with the URL for the Unreal rank image
    default:
      return 'URL_TO_DEFAULT_IMAGE'; // Replace with the URL for a default image
  }
}
