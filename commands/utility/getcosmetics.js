const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { createCanvas, loadImage } = require('canvas');
const { MongoClient } = require('mongodb');
const fs = require('node:fs');
const wrapText = require('./wraptext');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaks')
    .setDescription('Get leaked items on Fortnite'),

  async execute(interaction) {
    try {
      // Check if the user has premium access
      const hasPremium = await checkPremiumUser(interaction.user.id);

      if (!hasPremium) {
        await interaction.reply('You need premium to run this command!');
        return;
      }

      // Defer the interaction before processing the command
      await interaction.deferReply({ ephemeral: false }); // Set ephemeral to true if you want the reply to be visible only to the user

      const response = await axios.get('https://fortnite-api.com/v2/cosmetics/br/new', {
        headers: {
          Authorization: '18c828e7-5f02-4cb7-b061-d2d921553bdb',
        },
      });

      const items = response.data.data.items;

      // Load all images before entering the loop
      const loadedImages = await Promise.all(items.map(item => loadImage(item.images.icon)));

      // Calculate the required canvas size based on the number of items
      const gridSize = Math.ceil(Math.sqrt(items.length));
      const squareWidth = loadedImages[0].width + 10; // Adjust padding as needed
      const squareHeight = loadedImages[0].height + 60; // Adjust padding as needed
      const canvasWidth = gridSize * squareWidth * 1.1; // Make the whole image 10% bigger
      const canvasHeight = Math.ceil(items.length / gridSize) * squareHeight * 1.1; // Dynamic height based on the number of rows

      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');

      let currentRow = 0;
      let currentCol = 0;

      // Mapping of rarities to colors
      const rarityColors = {
        'Uncommon': '#808080',  // Gray
        'Common': '#00FF00',    // Green
        'Rare': '#0000FF',      // Blue
        'Epic': '#800080',      // Purple
        'Legendary': '#FFD700',  // Goldish Yellow
      };

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const icon = loadedImages[i];

        // Get the rarity color from the mapping
        const rarityColor = rarityColors[item.rarity?.value] || '#FFFFFF'; // Default to white if rarity color is not found

        ctx.fillStyle = rarityColor;
        ctx.fillRect(currentCol * squareWidth * 1.1, currentRow * squareHeight * 1.1, squareWidth * 1.1, squareHeight * 1.1);

        // Draw the icon centered in the square
        ctx.drawImage(icon, currentCol * squareWidth * 1.1 + ((squareWidth - icon.width) / 2), currentRow * squareHeight * 1.1 + 10, icon.width, icon.height);

        // Draw transparent box with text for name and description
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(currentCol * squareWidth * 1.1, currentRow * squareHeight * 1.1 + icon.height + 20, squareWidth * 1.1, 140);

        ctx.fillStyle = '#FFFFFF'; // Text color
        ctx.font = '12px Arial';

        // Calculate available space for the item name
        const maxTextWidth = squareWidth * 1.1 - 10; // Leave 5px padding on each side
        const maxNameHeight = 25; // Adjust as needed

        // Wrap and draw the item name
        const nameLines = wrapText(ctx, item.name, maxTextWidth, maxNameHeight);
        nameLines.forEach((line, index) => {
          ctx.fillText(line, currentCol * squareWidth * 1.1 + 5, currentRow * squareHeight * 1.1 + icon.height + 30 + (index * 12));
        });

        // Calculate available space for the description text
        const maxDescriptionHeight = 90; // Adjust as needed

        // Wrap and draw the description text
        const descriptionLines = wrapText(ctx, item.description, maxTextWidth, maxDescriptionHeight);
        descriptionLines.forEach((line, index) => {
          ctx.fillText(line, currentCol * squareWidth * 1.1 + 5, currentRow * squareHeight * 1.1 + icon.height + 60 + (nameLines.length * 12) + (index * 12));
        });

        // Move to the next column or row in the grid
        currentCol++;
        if (currentCol >= gridSize) {
          currentCol = 0;
          currentRow++;
        }
      }

      // Convert the canvas to a buffer
      const buffer = canvas.toBuffer();

      // Send the image as a reply without follow-up message
      await interaction.editReply({
        content: 'Newest items added to Fortnite API:',
        files: [buffer],
      });
    } catch (error) {
      console.error('Error fetching Fortnite data:', error);
      // Send an error message
      await interaction.editReply('Failed to fetch Fortnite data.');
    }
  },
};

// Function to check if the user has premium access
async function checkPremiumUser(discordId) {
  try {
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    const mongodbPassword = config.mongodbPassword;
    // Connect to MongoDB
    // Replace 'YOUR_MONGODB_URI' with your actual MongoDB URI
    const uri = `mongodb+srv://NexusBot:${mongodbPassword}@nexus.awivttx.mongodb.net/?retryWrites=true&w=majority`;
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();

    // Create or get the collection for premium users
    const premiumCollection = client.db('Nexus').collection('premiumUsers');

    // Check if the user's Discord ID is in the premium collection
    const isPremium = await premiumCollection.findOne({ discordId: discordId });

    // Close the MongoDB connection
    await client.close();

    // Return true if the user is in the premium collection, otherwise false
    return !!isPremium;
  } catch (error) {
    console.error('Error checking premium status:', error);
    // Handle error and return false (assuming an error means not premium)
    return false;
  }
}

