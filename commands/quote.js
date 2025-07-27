const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("quote")
    .setDescription("Get an estimated price & time for a service")
    .addStringOption(option =>
      option
        .setName("service")
        .setDescription("Choose the service")
        .setRequired(true)
        .addChoices(
          { name: "WinForms", value: "WinForms" },
          { name: "WPF", value: "WPF" },
          { name: "Website UI", value: "Website" },
          { name: "Tauri", value: "Tauri" },
          { name: "Electron", value: "Electron" }
        )
    ),

  async execute(interaction) {
    const service = interaction.options.getString("service");

    const pricing = {
      WinForms: { price: "$10 / 200 Robux", time: "2-3 days" },
      WPF: { price: "$15 / 300 Robux", time: "3-4 days" },
      Website: { price: "$20 / 400 Robux", time: "3-5 days" },
      Tauri: { price: "$25 / 500 Robux", time: "4-6 days" },
      Electron: { price: "$30 / 600 Robux", time: "5-7 days" },
    };

    const selected = pricing[service];
    const embed = new EmbedBuilder()
      .setTitle(`💡 Quote for ${service}`)
      .setDescription(`💰 **Estimated Price:** ${selected.price}\n⏳ **Estimated Time:** ${selected.time}`)
      .setColor("Blue");

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
