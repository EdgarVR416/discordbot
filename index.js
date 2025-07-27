require("dotenv").config();
const { Client, GatewayIntentBits, Collection, Events, ChannelType } = require("discord.js");
const fs = require("fs");
const path = require("path");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
});

// ✅ CONFIG → GANTI ID SESUAI SERVER
const CONFIG = {
  CATEGORY_TICKETS: "1398625965663588453", // Category ID tempat ticket dibuat
  ORDER_LOG_CHANNEL: "1398625452490231898", // Channel ID untuk #order-log
  REVIEWS_CHANNEL: "1398625753138069586", // Channel ID untuk #reviews
  CLOSE_TICKET_ROLES: [
    "1397560398797865043", // role 1
    "1397560406477897830", // role 2
  ],
};

// simpan config ke client biar bisa dipake di command lain
client.CONFIG = CONFIG;

// load commands folder
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
}

// event ketika bot ready
client.once(Events.ClientReady, () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

// handle slash command
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: "❌ There was an error executing this command!", ephemeral: true });
  }
});

// DM feedback listener (user reply rating 1-5)
client.on(Events.MessageCreate, async msg => {
  if (msg.channel.type !== ChannelType.DM) return;
  if (!/^[1-5]/.test(msg.content.trim())) return;

  const rating = msg.content.trim().charAt(0);
  const comment = msg.content.trim().slice(1).trim() || "_No comment_";

  const guild = client.guilds.cache.first(); // ambil guild pertama (atau bisa ID spesifik)
  const reviewsChannel = guild.channels.cache.get(CONFIG.REVIEWS_CHANNEL);
  if (reviewsChannel) {
    await reviewsChannel.send(
      `⭐ **New Review** from **${msg.author.username}**\nRating: **${rating}/5**\nComment: ${comment}`
    );
  }

  await msg.reply("✅ Thank you for your feedback!");
});

// login
client.login(process.env.TOKEN);
