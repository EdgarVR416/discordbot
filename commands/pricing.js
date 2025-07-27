const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("pricing").setDescription("Show full pricing list"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("💰 UI Commission Pricing")
      .setDescription(
        `📌 **WinForms** → start from $10 / 200 Robux\n` +
        `📌 **WPF** → start from $15 / 300 Robux\n` +
        `📌 **Website UI** → start from $20 / 400 Robux\n` +
        `📌 **Tauri** → start from $25 / 500 Robux\n` +
        `📌 **Electron** → start from $30 / 600 Robux\n\n` +
        `⏳ *Estimated time: 2–7 days depending on complexity.*`
      )
      .setColor("Green")
      .setFooter({ text: "Need a custom quote? Use /quote" });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
