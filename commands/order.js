const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("order")
    .setDescription("Request a commission"),

  async execute(interaction) {
    let chosenService = null;
    let chosenPayment = null;

    // === STEP 1: Dropdown pilihan ===
    const serviceMenu = new StringSelectMenuBuilder()
      .setCustomId("service_select")
      .setPlaceholder("Select a service...")
      .addOptions(
        { label: "WinForms", value: "WinForms" },
        { label: "WPF", value: "WPF" },
        { label: "Website UI", value: "Website" },
        { label: "Tauri", value: "Tauri" },
        { label: "Electron", value: "Electron" }
      );

    const paymentMenu = new StringSelectMenuBuilder()
      .setCustomId("payment_select")
      .setPlaceholder("Select payment method...")
      .addOptions(
        { label: "Robux", value: "Robux" },
        { label: "PayPal", value: "PayPal" },
        { label: "Crypto", value: "Crypto" },
      );

    const confirmButton = new ButtonBuilder()
      .setCustomId("confirm_order")
      .setLabel("✅ Confirm Order")
      .setStyle(ButtonStyle.Success)
      .setDisabled(true);

    const row1 = new ActionRowBuilder().addComponents(serviceMenu);
    const row2 = new ActionRowBuilder().addComponents(paymentMenu);
    const row3 = new ActionRowBuilder().addComponents(confirmButton);

    await interaction.reply({
      content: "📋 **Choose your service & payment, then confirm your order**",
      components: [row1, row2, row3],
      flags: 64,
    });

    // === STEP 2: Collect dropdown pilihan ===
    const filter = (i) => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "service_select") {
        chosenService = i.values[0];
        await i.deferUpdate();
      }
      if (i.customId === "payment_select") {
        chosenPayment = i.values[0];
        await i.deferUpdate();
      }

      // ✅ kalau udah pilih keduanya → enable tombol confirm
      if (chosenService && chosenPayment) {
        const updatedConfirm = ButtonBuilder.from(confirmButton).setDisabled(false);
        const updatedRow3 = new ActionRowBuilder().addComponents(updatedConfirm);

        await interaction.editReply({
          content: `✅ **Selected:** ${chosenService} | ${chosenPayment}\nClick **Confirm Order** to continue.`,
          components: [row1, row2, updatedRow3],
        });
      }
    });

    // === STEP 3: HANDLE TOMBOL CONFIRM ORDER ===
    interaction.client.on("interactionCreate", async (btnInteraction) => {
      if (!btnInteraction.isButton()) return;
      if (btnInteraction.customId !== "confirm_order") return;

      // pastikan tombolnya cuma buat user yg bikin order
      if (btnInteraction.user.id !== interaction.user.id) {
        return btnInteraction.reply({
          content: "❌ This button is not for you!",
          flags: 64,
        });
      }

      // kalau belum pilih lengkap
      if (!chosenService || !chosenPayment) {
        return btnInteraction.reply({
          content: "❌ Please select service & payment first!",
          flags: 64,
        });
      }

      const guild = btnInteraction.guild;
      const categoryID = interaction.client.CONFIG.CATEGORY_TICKETS;

      // === BUAT CHANNEL TICKET ===
      const ticketChannel = await guild.channels.create({
        name: `order-${btnInteraction.user.username}`,
        type: ChannelType.GuildText,
        parent: categoryID || null,
        permissionOverwrites: [
          {
            id: guild.roles.everyone,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: btnInteraction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
            ],
          },
          ...interaction.client.CONFIG.CLOSE_TICKET_ROLES.map((roleID) => ({
            id: roleID,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
            ],
          })),
        ],
      });

      // === KIRIM EMBED DETAIL ORDER TANPA INVOICE ===
      const orderEmbed = new EmbedBuilder()
        .setTitle("📝 New Order Created!")
        .setDescription(
          `**Service:** ${chosenService}\n**Payment:** ${chosenPayment}\n\nPlease provide any additional details about your request here.`
        )
        .setColor("Green");

      await ticketChannel.send(`🎉 **New Order from <@${btnInteraction.user.id}>**`);
      await ticketChannel.send({ embeds: [orderEmbed] });

      // === LOG ORDER KE CHANNEL ADMIN ===
      const logChannel = guild.channels.cache.get(
        interaction.client.CONFIG.ORDER_LOG_CHANNEL
      );
      if (logChannel) {
        await logChannel.send(
          `📩 **New Order** from <@${btnInteraction.user.id}>\nService: **${chosenService}** | Payment: **${chosenPayment}**`
        );
      }

      // === TOMBOL CLOSE ===
      const closeButton = new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("✅ Close Ticket")
        .setStyle(ButtonStyle.Danger);

      const closeRow = new ActionRowBuilder().addComponents(closeButton);
      await ticketChannel.send({
        content:
          "When finished, an authorized role can click below to close this ticket.",
        components: [closeRow],
      });

      // === BALAS KE USER ===
      await btnInteraction.reply({
        content: `✅ Ticket created! Check ${ticketChannel}`,
        flags: 64,
      });
    });

    // === STEP 4: HANDLE CLOSE TICKET ===
    const client = interaction.client;
    client.on("interactionCreate", async (btnInteraction) => {
      if (!btnInteraction.isButton()) return;
      if (btnInteraction.customId !== "close_ticket") return;

      const memberRoles = btnInteraction.member.roles.cache.map((r) => r.id);
      const allowedRoles = client.CONFIG.CLOSE_TICKET_ROLES;
      const hasPermission = allowedRoles.some((role) =>
        memberRoles.includes(role)
      );
      if (!hasPermission) {
        return btnInteraction.reply({
          content: "❌ You are not authorized to close this ticket!",
          flags: 64,
        });
      }

      await btnInteraction.reply({
        content: "✅ Closing this ticket in 5 seconds...",
      });

      const customerUsername = btnInteraction.channel.name.replace("order-", "");
      const member = btnInteraction.guild.members.cache.find(
        (m) => m.user.username === customerUsername
      );

      if (member) {
        try {
          await member.send(
            `✅ **Your order ticket has been closed!**\n\nWe'd love your feedback ⭐\nReply with rating **1-5** + comment.\nExample: \`5 Amazing work!\``
          );
        } catch (err) {
          console.log("DM failed (maybe user disabled DM)");
        }
      }

      const logChannel = btnInteraction.guild.channels.cache.get(
        client.CONFIG.ORDER_LOG_CHANNEL
      );
      if (logChannel) {
        await logChannel.send(
          `📪 Ticket **${btnInteraction.channel.name}** closed by <@${btnInteraction.user.id}>`
        );
      }

      setTimeout(async () => {
        await btnInteraction.channel.delete();
      }, 5000);
    });
  },
};
