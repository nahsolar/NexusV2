const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lookup')
    .setDescription('Lookup user information')
    .addStringOption(option =>
      option
        .setName('user')
        .setDescription('Enter the username to lookup')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const username = interaction.options.getString('user');
      const apiUrl = `https://egs.jaren.wtf/api/accounts/displayName/${username}`;
      // Making the GET request
      const response = await axios.get(apiUrl);
      const userData = response.data;

      // Extracting information
      const displayName = userData.displayName;
      const accountStatus = userData.accountStatus;
      // Creating an embed
      const embed = new EmbedBuilder()
        .setTitle('User Information')
        .addFields('Display Name', displayName)
        .addFields('Account Status', accountStatus)
        .setColor('#3498db'); // You can customize the color as needed

      // Sending the embed as a reply
      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error(error);
      // Handle errors, you might want to reply with an error message to the user
      await interaction.reply('An error occurred while fetching user information.');
    }
  }
}
