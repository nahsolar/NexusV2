const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Client } = require('fnbr');
const { MongoClient } = require('mongodb');
const axios = require('axios');
const fs = require('node:fs');

const getCosmeticPath = (path) => path
  .replace(/^FortniteGame\/Content/, '/Game')
  .replace(/FortniteGame\/Plugins\/GameFeatures\/BRCosmetics\/Content/, '/BRCosmetics')
  .split('/')
  .slice(0, -1)
  .join('/');

const fetchCosmetic = async (name) => {
  try {
    const { data } = await axios(`https://fortnite-api.com/v2/cosmetics/br/search?name=${encodeURI(name)}`);
    return data.data;
  } catch (err) {
    if (!(err instanceof Error) || err.status !== 404) {
      throw err;
    }

    return undefined;
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('equip')
    .setDescription('Equips any cosmetic')
    .addStringOption(option =>
      option
        .setName('outfit')
        .setDescription('Choose an outfit to equip')
        .setRequired(false))
    .addStringOption(option =>
      option
        .setName('emote')
        .setDescription('Choose an emote to equip')
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply(); // Defer the reply

      const config = JSON.parse(await fs.readFile('./config.json', 'utf8'));
      const uri = `mongodb+srv://NexusBot:${config.mongodbPassword}@nexus.awivttx.mongodb.net/?retryWrites=true&w=majority`;

      const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
      await client.connect();

      const collection = client.db('NexusBot').collection('deviceAuths');
      const deviceAuth = await collection.findOne({ discord_id: interaction.user.id });

      if (!deviceAuth) {
        const errorEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('Error')
          .setDescription('You are not logged in. Please log in using the `/login` command.');

        return interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
      }

      const outfit = interaction.options.getString('outfit');
      const emote = interaction.options.getString('emote');

      const outfitsCollection = client.db('NexusBot').collection('outfits');

      if (outfit) {
        const response = await axios.get(`https://fortnite-api.com/v2/cosmetics/br/search?name=${encodeURI(outfit)}`);
        const cosmetic = response.data.data;

        if (!cosmetic) {
          const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('Error')
            .setDescription(`Outfit "${outfit}" not found.`);

          return interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        }

        const outfitData = { [outfit]: { id: cosmetic.id, name: cosmetic.name } };
        await outfitsCollection.updateOne({ user_id: interaction.user.id }, { $set: { equipped_outfit: outfitData } }, { upsert: true });

        const fnbrClient = new Client({
          auth: {
            killOtherTokens: false,
            deviceAuth: {
              deviceId: deviceAuth.deviceAuth.deviceId,
              accountId: deviceAuth.deviceAuth.accountId,
              secret: deviceAuth.deviceAuth.secret
            }
          },
          connectToXMPP: false,
          forceNewParty: false
        });

        await fnbrClient.login();

        await fnbrClient.party.me.setOutfit(cosmetic.id);

        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('Outfit Equipped!')
          .setDescription(`Successfully equipped ${cosmetic.name}.`)
          .setThumbnail(cosmetic.images.smallIcon)
          .addFields(
            { name: '(Outfit will not show up for you!)', value: `It'll still show up for other party members!` },
          );

        interaction.editReply({ embeds: [embed], ephemeral: true });
      } else if (emote) {
        const cosmetic = await fetchCosmetic(emote);

        if (!cosmetic) {
          const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('Error')
            .setDescription(`Emote "${emote}" not found.`);

          return interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        }

        await fnbrClient.party.me.setEmote(cosmetic.id, getCosmeticPath(cosmetic.path));

        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('Emote Equipped!')
          .setDescription(`Successfully equipped ${cosmetic.name}.`)
          .setThumbnail(cosmetic.images.smallIcon)
          .addFields(
            { name: '(Emote will not show up for you!)', value: `It'll still show up for other party members!` },
          );

        interaction.editReply({ embeds: [embed], ephemeral: true });
      } else {
        const errorEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('Error')
          .setDescription('Invalid cosmetic type.');

        interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
      }
    } catch (error) {
      console.error(error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('Error')
        .setDescription('An error occurred while trying to equip the cosmetic (Error Code: 1000).');

      interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
    } finally {
      await client.close();
    }
  },
};
