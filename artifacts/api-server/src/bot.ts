import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  StringSelectMenuInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  ChannelType,
  ButtonInteraction,
  ComponentType,
} from "discord.js";
import { logger } from "./lib/logger";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
});

// ──────────────────────────────────────────────────
// بيانات الطوارئ
// ──────────────────────────────────────────────────
const backupLinks = new Map<string, string>();

// ──────────────────────────────────────────────────
// نظام السرقة والشنطة
// ──────────────────────────────────────────────────
interface InventoryData {
  hasCooler: boolean;
  coolerEmpty?: boolean;
  hasNuke: boolean;
}
const usersInventory = new Map<string, InventoryData>();

// ──────────────────────────────────────────────────
// نظام GTA الاقتصادي
// ──────────────────────────────────────────────────
interface UserStation {
  owned: boolean;
  gas: number;
  oil: number;
  fuelStock: number;
  maxStorage: number;
  truckLevel: number;
  marketingBonus: number;
  level: number;
}
interface UserGrocery {
  owned: boolean;
  stock: number;
  revenue: number;
}
interface UserHotel {
  owned: boolean;
  rooms: number;
  rentPrice: number;
}
interface UserData {
  money: number;
  station: UserStation;
  grocery: UserGrocery;
  hotel: UserHotel;
}

const gtaDb = new Map<string, UserData>();

function getUserData(userId: string): UserData {
  if (!gtaDb.has(userId)) {
    gtaDb.set(userId, {
      money: 5000,
      station: { owned: false, gas: 0, oil: 0, fuelStock: 0, maxStorage: 100, truckLevel: 1, marketingBonus: 0, level: 1 },
      grocery: { owned: false, stock: 0, revenue: 20 },
      hotel: { owned: false, rooms: 5, rentPrice: 1000 },
    });
  }
  return gtaDb.get(userId)!;
}

// أرباح المحطة كل 3 دقائق
setInterval(() => {
  gtaDb.forEach((user) => {
    if (user.station.owned && user.station.fuelStock >= 5) {
      user.station.fuelStock -= 5;
      const base = 50 * user.station.level;
      const bonus = base * (user.station.marketingBonus / 100);
      user.money += Math.floor(base + bonus);
    }
    if (user.grocery.owned) user.money += user.grocery.revenue;
    if (user.hotel.owned) user.money += Math.floor(user.hotel.rentPrice * user.hotel.rooms / 24);
  });
}, 180_000);

// ──────────────────────────────────────────────────
// الأمر الوحيد
// ──────────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder().setName("sb").setDescription("🎛️ قائمة البوت"),
  new SlashCommandBuilder().setName("system").setDescription("⚙️ Open the central roleplay system (Identity, Phone, Inventory, Bank, Weapon Crafting)"),
  new SlashCommandBuilder().setName("nexus").setDescription("⚡ Launches the central Nexus system dashboard"),
].map((c) => c.toJSON());

// ──────────────────────────────────────────────────
// Central System (/system) — Identity, Phone, Inventory, Bank, Weapon Crafting
// ──────────────────────────────────────────────────
function buildSystemMenu(disabled = false) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("main_system_menu")
    .setPlaceholder(disabled ? "Session expired ❌" : "Select a system to view... 🛡️")
    .setDisabled(disabled)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("ID Card & Identity")
        .setDescription("View your personal info and licenses")
        .setValue("identity_sys")
        .setEmoji("🪪"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Mobile Phone")
        .setDescription("Phone apps and messages")
        .setValue("phone_sys")
        .setEmoji("📱"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Inventory & Storage")
        .setDescription("View your items and resources")
        .setValue("inventory_sys")
        .setEmoji("🎒"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Banking System")
        .setDescription("Current balance, loans, and transfers")
        .setValue("bank_sys")
        .setEmoji("🏦"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Weapon Crafting Workshop")
        .setDescription("Craft and upgrade weapons and ammo")
        .setValue("weapon_craft")
        .setEmoji("🛠️"),
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

function buildSystemPanel(section: string, user: { id: string; username: string; displayAvatarURL: () => string }) {
  const embed = new EmbedBuilder().setTimestamp();

  switch (section) {
    case "identity_sys":
      embed
        .setColor(0x00aaff)
        .setTitle("🪪 Digital ID Card")
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "👤 Full Name", value: `\`${user.username}\``, inline: true },
          { name: "🆔 National ID", value: `\`#${user.id.slice(0, 6)}\``, inline: true },
          { name: "🎂 Age", value: "`24 years`", inline: true },
          { name: "🚗 Driver's License", value: "`Valid ✅`", inline: true },
          { name: "💼 Occupation", value: "`Software Engineer 🛠️`", inline: true },
        );
      break;

    case "phone_sys":
      embed
        .setColor(0x2ecc71)
        .setTitle("📱 Smartphone — iFruit")
        .setDescription("Status: **Connected 📡**\nBattery: **88% 🔋**")
        .addFields(
          { name: "💬 Messages", value: "`No new messages`" },
          { name: "📸 Gallery", value: "`Your storage has 12 locked photos`" },
          { name: "🚕 Ride App", value: "`[ Request a taxi now ]`" },
        );
      break;

    case "inventory_sys":
      embed
        .setColor(0xe67e22)
        .setTitle("🎒 Backpack & Belongings")
        .setDescription("Carry capacity: `45kg / 100kg` 📦")
        .addFields(
          { name: "🍏 Food & Drinks", value: "`3x` Apple | `5x` Water Bottle" },
          { name: "🔑 Tools & Keys", value: "`1x` Apartment Key #4 | `1x` Lockpick" },
          { name: "🩹 First Aid", value: "`2x` Bandage | `1x` Painkiller" },
        );
      break;

    case "bank_sys":
      embed
        .setColor(0xf1c40f)
        .setTitle("🏦 Central Bank & Financial Services")
        .addFields(
          { name: "💳 Checking Account", value: "`$154,230`", inline: true },
          { name: "💰 Cash on Hand", value: "`$4,500`", inline: true },
          { name: "📉 Outstanding Loans", value: "`$0` (No debt)", inline: true },
        );
      break;

    case "weapon_craft":
      embed
        .setColor(0x95a5a6)
        .setTitle("🛠️ Weapon Crafting & Upgrade Bench")
        .setDescription("Select a weapon to craft (make sure you have enough materials):")
        .addFields(
          { name: "🔫 9mm Pistol", value: "Requires: `10x Iron Scraps` | `2x Spring` ⚙️\n**Status:** Ready to craft" },
          { name: "⚔️ Machete", value: "Requires: `4x Iron Scraps` | `1x Wooden Handle` 🪵\n**Status:** Ready to craft" },
          { name: "🧨 Pistol Ammo (x30)", value: "Requires: `5x Gunpowder` | `3x Copper` 🪙\n**Status:** Insufficient materials ❌" },
        );
      break;
  }

  return embed;
}

async function handleSystemCommand(interaction: ChatInputCommandInteraction) {
  const row = buildSystemMenu();

  const welcomeEmbed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle("⚙️ Central System")
    .setDescription("Welcome to your control panel. Please choose a system from the dropdown menu below to get started.")
    .setTimestamp()
    .setFooter({ text: "Advanced Roleplay System", iconURL: interaction.user.displayAvatarURL() });

  await interaction.reply({ embeds: [welcomeEmbed], components: [row] });

  const filter = (i: { customId: string; user: { id: string } }) =>
    i.customId === "main_system_menu" && i.user.id === interaction.user.id;

  const collector = interaction.channel?.createMessageComponentCollector({
    filter,
    componentType: ComponentType.StringSelect,
    time: 300_000,
  });

  collector?.on("collect", async (i) => {
    const responseEmbed = buildSystemPanel(i.values[0]!, i.user);
    await i.update({ embeds: [responseEmbed], components: [row] }).catch(() => {});
  });

  collector?.on("end", async () => {
    await interaction.editReply({ components: [buildSystemMenu(true)] }).catch(() => {});
  });
}

// ──────────────────────────────────────────────────
// القائمة الرئيسية
// ──────────────────────────────────────────────────
function buildMainMenu(guildId: string) {
  const saved = backupLinks.get(guildId);
  const menu = new StringSelectMenuBuilder()
    .setCustomId("sb_menu")
    .setPlaceholder("اختر ما تبي...")
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel("رابطك يا قحبه 🔗").setDescription(saved ? `المحفوظ: ${saved.slice(0, 40)}` : "ما حفظت رابط").setValue("setbackup"),
      new StringSelectMenuOptionBuilder().setLabel("تمحن للقحيب 📨").setDescription("ترسل DM بأي رسالة تكتبها لكل الأعضاء").setValue("dm"),
      new StringSelectMenuOptionBuilder().setLabel("السيرفر المخنوث 🚨").setDescription("ترسل embed لكل الرومات").setValue("alert"),
      new StringSelectMenuOptionBuilder().setLabel("رسالة جماعية 📢").setDescription("رسالتك + @everyone في كل الرومات").setValue("broadcast"),
      new StringSelectMenuOptionBuilder().setLabel("غيّر أسامي الرومات ✏️").setDescription("يغير اسم كل الرومات لاسم تحدده").setValue("rename_channels"),
      new StringSelectMenuOptionBuilder().setLabel("صكّ رومات جديدة 💥").setDescription("تحدد الاسم والعدد وتصكّها (الحد 50)").setValue("create_channels"),
      new StringSelectMenuOptionBuilder().setLabel("🎮 عالم GTA — التجارة").setDescription("محطات وقود، بقالات، فنادق — رصيدك وأعمالك").setValue("gta_panel"),
      new StringSelectMenuOptionBuilder().setLabel("شروحات قحبتي 📋").setDescription("يوضح ما يفعله كل خيار").setValue("help"),
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

// ──────────────────────────────────────────────────
// GTA — لوحة التجارة
// ──────────────────────────────────────────────────
function buildGtaPanel(user: UserData, userId: string) {
  const embed = new EmbedBuilder()
    .setColor(0x1e88e5)
    .setTitle("💼 لوحة التحكم — عالم GTA")
    .setDescription("مرحباً بك في عالم المال والأعمال! أدر عقاراتك وطوّر محطاتك.")
    .addFields(
      { name: "💰 رصيدك", value: `\`${user.money.toLocaleString()} $\``, inline: false },
      { name: "⛽ المحطة", value: user.station.owned ? `لفل ${user.station.level} | ${user.station.fuelStock}/${user.station.maxStorage} لتر` : "❌ لا تملكها", inline: true },
      { name: "🛒 البقالة", value: user.grocery.owned ? "✅ نشطة" : "❌ لا تملكها", inline: true },
      { name: "🏨 الفندق", value: user.hotel.owned ? `✅ ${user.hotel.rooms} غرف` : "❌ لا تملكه", inline: true },
    )
    .setFooter({ text: `ID: ${userId}` })
    .setTimestamp();

  const menu = new StringSelectMenuBuilder()
    .setCustomId("gta_menu")
    .setPlaceholder("اختر القسم...")
    .addOptions(
      { label: "⛽ إدارة محطة الوقود", description: "تعبئة، نقل، وتطوير المحطة", value: "manage_station" },
      { label: "🛒 إدارة البقالة", description: "شراء وتطوير البقالة", value: "manage_grocery" },
      { label: "🏨 إدارة الفندق", description: "تأجير الغرف وجمع الأرباح", value: "manage_hotel" },
      { label: "🏢 سوق العقارات", description: "شراء المحطات والبقالات والفنادق", value: "estate_market" },
    );

  return { embed, row: new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu) };
}

function buildStationEmbed(user: UserData) {
  return new EmbedBuilder()
    .setColor(0x4caf50)
    .setTitle("⛽ لوحة تحكم محطة الوقود")
    .setDescription("> 💡 خلّط النفط والغاز لتنتج بنزين وتبدأ تكسب فلوس تلقائياً!")
    .addFields(
      { name: "📦 مخزون البنزين", value: `\`${user.station.fuelStock} / ${user.station.maxStorage} لتر\``, inline: true },
      { name: "💧 الغاز", value: `\`${user.station.gas} لتر\``, inline: true },
      { name: "🛢️ النفط الخام", value: `\`${user.station.oil} لتر\``, inline: true },
      { name: "🚚 لفل الشاحنة", value: `\`لفل ${user.station.truckLevel}\``, inline: true },
      { name: "📈 لفل المحطة", value: `\`لفل ${user.station.level}\``, inline: true },
      { name: "📢 التسويق", value: `\`+${user.station.marketingBonus}%\``, inline: true },
    );
}

function buildStationButtons() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("gta_drive_truck").setLabel("🚚 إرسال شاحنة تجميع").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("gta_refuel").setLabel("🧪 تكرير وتعبئة البنزين").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("gta_upgrade_station").setLabel("⬆️ تطوير المخزن (1000$)").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("gta_advertise").setLabel("📢 حملة إعلانية (500$)").setStyle(ButtonStyle.Danger),
  );
}

function buildMarketButtons(user: UserData) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("gta_buy_station").setLabel("⛽ محطة (2500$)").setStyle(ButtonStyle.Primary).setDisabled(user.station.owned),
    new ButtonBuilder().setCustomId("gta_buy_grocery").setLabel("🛒 بقالة (1500$)").setStyle(ButtonStyle.Success).setDisabled(user.grocery.owned),
    new ButtonBuilder().setCustomId("gta_buy_hotel").setLabel("🏨 فندق (5000$)").setStyle(ButtonStyle.Danger).setDisabled(user.hotel.owned),
  );
}

// ──────────────────────────────────────────────────
// مساعدات الطوارئ
// ──────────────────────────────────────────────────
function getGuild(interaction: ModalSubmitInteraction | StringSelectMenuInteraction | ButtonInteraction) {
  return interaction.guild ?? client.guilds.cache.get(interaction.guildId ?? "") ?? null;
}

async function sendAlertEmbed(guild: NonNullable<ReturnType<typeof getGuild>>, msg: string) {
  const embed = new EmbedBuilder().setTitle("🚨 تنبيه عاجل").setDescription(msg).setColor(0xff0000).setTimestamp();
  let sent = 0;
  for (const [, ch] of guild.channels.cache) {
    if (ch instanceof TextChannel) {
      try { await ch.send({ embeds: [embed] }); sent++; } catch { /* لا صلاحية */ }
    }
  }
  return sent;
}

async function sendDmAll(guild: NonNullable<ReturnType<typeof getGuild>>, msg: string) {
  const members = await guild.members.fetch();
  let sent = 0, failed = 0;
  for (const [, member] of members) {
    if (member.user.bot) continue;
    try { await member.send(msg); sent++; await new Promise((r) => setTimeout(r, 500)); } catch { failed++; }
  }
  return { sent, failed };
}

async function broadcastMsg(guild: NonNullable<ReturnType<typeof getGuild>>, msg: string) {
  let sent = 0;
  for (const [, ch] of guild.channels.cache) {
    if (ch instanceof TextChannel) {
      try { await ch.send(`@everyone ${msg}`); sent++; } catch { /* لا صلاحية */ }
    }
  }
  return sent;
}

async function renameAll(guild: NonNullable<ReturnType<typeof getGuild>>, name: string) {
  let done = 0, failed = 0;
  for (const [, ch] of guild.channels.cache) {
    try { await ch.setName(name); done++; await new Promise((r) => setTimeout(r, 300)); } catch { failed++; }
  }
  return { done, failed };
}

async function createChannels(guild: NonNullable<ReturnType<typeof getGuild>>, name: string, count: number) {
  let done = 0;
  for (let i = 1; i <= count; i++) {
    try { await guild.channels.create({ name: `${name}-${i}`, type: ChannelType.GuildText }); done++; await new Promise((r) => setTimeout(r, 300)); } catch { /* لا صلاحية */ }
  }
  return done;
}

// ──────────────────────────────────────────────────
// معالجة /sb
// ──────────────────────────────────────────────────
async function handleSbCommand(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId ?? "";
  const saved = backupLinks.get(guildId);
  await interaction.reply({
    content: saved ? `**🎛️ قائمة البوت**\n🔗 الرابط: ${saved}` : "**🎛️ قائمة البوت**",
    components: [buildMainMenu(guildId)],
    ephemeral: true,
  });
}

// ──────────────────────────────────────────────────
// معالجة القائمة الرئيسية
// ──────────────────────────────────────────────────
async function handleMainMenu(interaction: StringSelectMenuInteraction) {
  const guildId = interaction.guildId ?? "";
  const value = interaction.values[0];

  if (value === "setbackup") {
    const modal = new ModalBuilder().setCustomId("modal_setbackup").setTitle("رابطك يا قحبه 🔗");
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("backup_link_input").setLabel("رابط السيرفر الاحتياطي").setStyle(TextInputStyle.Short).setPlaceholder("https://discord.gg/رابطك").setRequired(true),
    ));
    await interaction.showModal(modal);
    return;
  }

  if (value === "dm") {
    const saved = backupLinks.get(guildId) ?? "";
    const modal = new ModalBuilder().setCustomId("modal_dm").setTitle("تمحن للقحيب 📨");
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("dm_msg_input").setLabel("اكتب رسالتك — تنرسل DM لكل الأعضاء").setStyle(TextInputStyle.Paragraph).setPlaceholder("مثال: اه تعالو سيرفري").setValue(saved ? `انضم:\n${saved}` : "").setRequired(true),
    ));
    await interaction.showModal(modal);
    return;
  }

  if (value === "alert") {
    const saved = backupLinks.get(guildId) ?? "";
    const modal = new ModalBuilder().setCustomId("modal_alert").setTitle("السيرفر المخنوث 🚨");
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("alert_msg_input").setLabel("اكتب رسالتك — تنرسل لكل الرومات").setStyle(TextInputStyle.Paragraph).setPlaceholder("مثال: اه تعالو سيرفري").setValue(saved ? `انضموا:\n${saved}` : "").setRequired(true),
    ));
    await interaction.showModal(modal);
    return;
  }

  if (value === "broadcast") {
    const modal = new ModalBuilder().setCustomId("modal_broadcast").setTitle("رسالة جماعية 📢");
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("broadcast_msg_input").setLabel("رسالتك + @everyone في كل الرومات").setStyle(TextInputStyle.Paragraph).setPlaceholder("مثال: ياقحبه انضموا للاحتياطي").setRequired(true),
    ));
    await interaction.showModal(modal);
    return;
  }

  if (value === "rename_channels") {
    const modal = new ModalBuilder().setCustomId("modal_rename").setTitle("غيّر أسامي الرومات ✏️");
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder().setCustomId("rename_input").setLabel("الاسم الجديد لكل الرومات").setStyle(TextInputStyle.Short).setPlaceholder("مثال: جحفلة-511").setRequired(true),
    ));
    await interaction.showModal(modal);
    return;
  }

  if (value === "create_channels") {
    const modal = new ModalBuilder().setCustomId("modal_create").setTitle("صكّ رومات جديدة 💥");
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("create_name_input").setLabel("اسم الروم").setStyle(TextInputStyle.Short).setPlaceholder("مثال: جحفلة").setRequired(true)),
      new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("create_count_input").setLabel("عدد الرومات (الحد 50)").setStyle(TextInputStyle.Short).setPlaceholder("مثال: 20").setRequired(true)),
    );
    await interaction.showModal(modal);
    return;
  }

  if (value === "gta_panel") {
    const user = getUserData(interaction.user.id);
    const { embed, row } = buildGtaPanel(user, interaction.user.id);
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    return;
  }

  if (value === "help") {
    await interaction.reply({
      content: [
        "**📋 شروحات قحبتي:**",
        "",
        "🔗 **رابطك يا قحبه** — تحفظ رابط سيرفرك الاحتياطي",
        "📨 **تمحن للقحيب** — تكتب رسالة وتنرسل DM لكل الأعضاء",
        "🚨 **السيرفر المخنوث** — embed طوارئ في كل الرومات",
        "📢 **رسالة جماعية** — @everyone + رسالتك في كل الرومات",
        "✏️ **غيّر أسامي الرومات** — يغير اسم كل الرومات",
        "💥 **صكّ رومات جديدة** — تصنع رومات بالعدد والاسم اللي تبيه",
        "🎮 **عالم GTA** — نظام تجارة كامل (محطات، بقالات، فنادق)",
        "",
        "_الأمر الوحيد هو `/sb`_",
      ].join("\n"),
      ephemeral: true,
    });
    return;
  }
}

// ──────────────────────────────────────────────────
// معالجة قائمة GTA
// ──────────────────────────────────────────────────
async function handleGtaMenu(interaction: StringSelectMenuInteraction) {
  const user = getUserData(interaction.user.id);
  const selection = interaction.values[0];

  if (selection === "estate_market") {
    const embed = new EmbedBuilder()
      .setColor(0xff9800)
      .setTitle("🏢 سوق العقارات")
      .setDescription("اختر المنشأة اللي تبي تستثمر فيها:")
      .addFields({ name: "💰 رصيدك", value: `\`${user.money.toLocaleString()} $\`` });
    await interaction.reply({ embeds: [embed], components: [buildMarketButtons(user)], ephemeral: true });
    return;
  }

  if (selection === "manage_station") {
    if (!user.station.owned) {
      await interaction.reply({ content: "❌ ما تملك محطة! روح لسوق العقارات.", ephemeral: true });
      return;
    }
    await interaction.reply({ embeds: [buildStationEmbed(user)], components: [buildStationButtons()], ephemeral: true });
    return;
  }

  if (selection === "manage_grocery") {
    if (!user.grocery.owned) {
      await interaction.reply({ content: "❌ ما تملك بقالة! روح لسوق العقارات.", ephemeral: true });
      return;
    }
    const embed = new EmbedBuilder()
      .setColor(0x4caf50)
      .setTitle("🛒 إدارة البقالة")
      .setDescription("بقالتك شغّالة وتجيب أرباح كل 3 دقائق تلقائياً.")
      .addFields(
        { name: "💰 رصيدك", value: `\`${user.money.toLocaleString()} $\``, inline: true },
        { name: "📈 دخل كل 3 دقائق", value: `\`${user.grocery.revenue} $\``, inline: true },
      );
    const upgradeBtn = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("gta_upgrade_grocery").setLabel("⬆️ تطوير البقالة (800$)").setStyle(ButtonStyle.Success),
    );
    await interaction.reply({ embeds: [embed], components: [upgradeBtn], ephemeral: true });
    return;
  }

  if (selection === "manage_hotel") {
    if (!user.hotel.owned) {
      await interaction.reply({ content: "❌ ما تملك فندق! روح لسوق العقارات.", ephemeral: true });
      return;
    }
    const embed = new EmbedBuilder()
      .setColor(0x9c27b0)
      .setTitle("🏨 إدارة الفندق")
      .setDescription("فندقك يجيب أرباح من الإيجار كل 3 دقائق تلقائياً.")
      .addFields(
        { name: "💰 رصيدك", value: `\`${user.money.toLocaleString()} $\``, inline: true },
        { name: "🛏️ الغرف", value: `\`${user.hotel.rooms}\``, inline: true },
        { name: "💵 إيجار الغرفة", value: `\`${user.hotel.rentPrice} $\``, inline: true },
      );
    const upgradeBtn = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("gta_upgrade_hotel").setLabel("⬆️ إضافة غرف (2000$)").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("gta_raise_rent").setLabel("💵 رفع الإيجار (1000$)").setStyle(ButtonStyle.Secondary),
    );
    await interaction.reply({ embeds: [embed], components: [upgradeBtn], ephemeral: true });
    return;
  }
}

// ──────────────────────────────────────────────────
// معالجة أزرار GTA
// ──────────────────────────────────────────────────
async function handleGtaButton(interaction: ButtonInteraction) {
  const user = getUserData(interaction.user.id);
  const id = interaction.customId;

  // ── شراء ──
  if (id === "gta_buy_station") {
    if (user.money < 2500) { await interaction.reply({ content: "❌ ما عندك فلوس! تحتاج 2500$.", ephemeral: true }); return; }
    user.money -= 2500; user.station.owned = true;
    await interaction.reply({ content: "🎉 مبروك! أصبحت صاحب محطة وقود. ابدأ بتعبئتها!", ephemeral: true });
    return;
  }
  if (id === "gta_buy_grocery") {
    if (user.money < 1500) { await interaction.reply({ content: "❌ ما عندك فلوس! تحتاج 1500$.", ephemeral: true }); return; }
    user.money -= 1500; user.grocery.owned = true;
    await interaction.reply({ content: "🎉 مبروك! أصبحت صاحب بقالة. تجيب أرباح تلقائياً.", ephemeral: true });
    return;
  }
  if (id === "gta_buy_hotel") {
    if (user.money < 5000) { await interaction.reply({ content: "❌ ما عندك فلوس! تحتاج 5000$.", ephemeral: true }); return; }
    user.money -= 5000; user.hotel.owned = true;
    await interaction.reply({ content: "🎉 مبروك! أصبحت صاحب فندق فخم.", ephemeral: true });
    return;
  }

  // ── المحطة ──
  if (id === "gta_drive_truck") {
    const cap = user.station.truckLevel === 3 ? 100 : user.station.truckLevel === 2 ? 50 : 25;
    user.station.gas += cap; user.station.oil += cap;
    await interaction.reply({ content: `🚚 الشاحنة رجعت بحمولة كاملة!\n➕ **${cap} لتر غاز** + **${cap} لتر نفط**`, ephemeral: true });
    return;
  }
  if (id === "gta_refuel") {
    if (user.station.gas <= 0 || user.station.oil <= 0) {
      await interaction.reply({ content: "❌ ما عندك مواد خام! أرسل الشاحنة أولاً.", ephemeral: true }); return;
    }
    let mix = Math.min(user.station.gas, user.station.oil);
    const space = user.station.maxStorage - user.station.fuelStock;
    if (space <= 0) { await interaction.reply({ content: "❌ المخزن ممتلئ! انتظر بيع الوقود.", ephemeral: true }); return; }
    mix = Math.min(mix, space);
    user.station.gas -= mix; user.station.oil -= mix; user.station.fuelStock += mix;
    if (user.station.fuelStock >= 500 && user.station.truckLevel < 3) user.station.truckLevel = 3;
    else if (user.station.fuelStock >= 200 && user.station.truckLevel < 2) user.station.truckLevel = 2;
    await interaction.reply({ content: `🧪 تم تكرير **${mix} لتر بنزين** وضخّه للخزان!`, ephemeral: true });
    return;
  }
  if (id === "gta_upgrade_station") {
    if (user.money < 1000) { await interaction.reply({ content: "❌ تحتاج 1000$ لتطوير المحطة.", ephemeral: true }); return; }
    if (user.station.maxStorage >= 1000) { await interaction.reply({ content: "🌟 وصلت للحد الأقصى (1000 لتر)!", ephemeral: true }); return; }
    user.money -= 1000; user.station.maxStorage += 300; user.station.level++;
    await interaction.reply({ content: `⬆️ تم التطوير! السعة الجديدة: **${user.station.maxStorage} لتر** | لفل ${user.station.level}`, ephemeral: true });
    return;
  }
  if (id === "gta_advertise") {
    if (user.money < 500) { await interaction.reply({ content: "❌ تحتاج 500$ للإعلان.", ephemeral: true }); return; }
    if (user.station.marketingBonus > 0) { await interaction.reply({ content: "📢 الإعلان شغال أصلاً!", ephemeral: true }); return; }
    user.money -= 500; user.station.marketingBonus = 25;
    setTimeout(() => { user.station.marketingBonus = 0; }, 3_600_000);
    await interaction.reply({ content: "📢 تم نشر الإعلان! الأرباح زادت **25%** لمدة ساعة.", ephemeral: true });
    return;
  }

  // ── البقالة ──
  if (id === "gta_upgrade_grocery") {
    if (user.money < 800) { await interaction.reply({ content: "❌ تحتاج 800$ لتطوير البقالة.", ephemeral: true }); return; }
    user.money -= 800; user.grocery.revenue += 10;
    await interaction.reply({ content: `⬆️ تم التطوير! الدخل الجديد كل 3 دقائق: **${user.grocery.revenue} $**`, ephemeral: true });
    return;
  }

  // ── الفندق ──
  if (id === "gta_upgrade_hotel") {
    if (user.money < 2000) { await interaction.reply({ content: "❌ تحتاج 2000$ لإضافة غرف.", ephemeral: true }); return; }
    user.money -= 2000; user.hotel.rooms += 5;
    await interaction.reply({ content: `⬆️ تمت إضافة 5 غرف! إجمالي الغرف الآن: **${user.hotel.rooms}**`, ephemeral: true });
    return;
  }
  if (id === "gta_raise_rent") {
    if (user.money < 1000) { await interaction.reply({ content: "❌ تحتاج 1000$ لرفع الإيجار.", ephemeral: true }); return; }
    user.money -= 1000; user.hotel.rentPrice += 500;
    await interaction.reply({ content: `💵 تم رفع إيجار الغرفة إلى **${user.hotel.rentPrice} $**!`, ephemeral: true });
    return;
  }
}

// ──────────────────────────────────────────────────
// معالجة الـ modals
// ──────────────────────────────────────────────────
async function handleModalSubmit(interaction: ModalSubmitInteraction) {
  const guildId = interaction.guildId ?? "";
  const guild = getGuild(interaction);

  if (interaction.customId === "modal_setbackup") {
    const link = interaction.fields.getTextInputValue("backup_link_input").trim();
    backupLinks.set(guildId, link);
    await interaction.reply({ content: `✅ تم حفظ الرابط:\n${link}`, ephemeral: true });
    return;
  }

  if (interaction.customId === "modal_alert") {
    const msg = interaction.fields.getTextInputValue("alert_msg_input").trim();
    await interaction.deferReply({ ephemeral: true });
    if (!guild) { await interaction.editReply("❌ ما قدرت أجيب السيرفر."); return; }
    const sent = await sendAlertEmbed(guild, msg);
    await interaction.editReply(`✅ تم الإرسال في ${sent} روم.`);
    return;
  }

  if (interaction.customId === "modal_dm") {
    const msg = interaction.fields.getTextInputValue("dm_msg_input").trim();
    await interaction.deferReply({ ephemeral: true });
    if (!guild) { await interaction.editReply("❌ ما قدرت أجيب السيرفر."); return; }
    const { sent, failed } = await sendDmAll(guild, msg);
    await interaction.editReply(`✅ تم إرسال DM لـ ${sent} عضو.\n⚠️ فشل: ${failed}.`);
    return;
  }

  if (interaction.customId === "modal_broadcast") {
    const msg = interaction.fields.getTextInputValue("broadcast_msg_input").trim();
    await interaction.deferReply({ ephemeral: true });
    if (!guild) { await interaction.editReply("❌ ما قدرت أجيب السيرفر."); return; }
    const sent = await broadcastMsg(guild, msg);
    await interaction.editReply(`✅ تم الإرسال في ${sent} روم مع @everyone.`);
    return;
  }

  if (interaction.customId === "modal_rename") {
    const name = interaction.fields.getTextInputValue("rename_input").trim();
    await interaction.deferReply({ ephemeral: true });
    if (!guild) { await interaction.editReply("❌ ما قدرت أجيب السيرفر."); return; }
    const { done, failed } = await renameAll(guild, name);
    await interaction.editReply(`✅ تم تغيير اسم ${done} روم.\n⚠️ فشل: ${failed}.`);
    return;
  }

  if (interaction.customId === "modal_create") {
    const name = interaction.fields.getTextInputValue("create_name_input").trim();
    const count = Math.min(50, Math.max(1, parseInt(interaction.fields.getTextInputValue("create_count_input")) || 1));
    await interaction.deferReply({ ephemeral: true });
    if (!guild) { await interaction.editReply("❌ ما قدرت أجيب السيرفر."); return; }
    const done = await createChannels(guild, name, count);
    await interaction.editReply(`✅ تم صكّ ${done} روم باسم "${name}".`);
    return;
  }
}

// ──────────────────────────────────────────────────
// أوامر الشات (prefix)
// ──────────────────────────────────────────────────
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const content = message.content.trim();

  // ── سرقة الخزنة ──
  if (content === "-سرقه-خزنه") {
    const hackRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("hack_blue1").setLabel("🔵").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("hack_green1").setLabel("🟢").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("hack_blue2").setLabel("🔵").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("hack_green2").setLabel("🟢").setStyle(ButtonStyle.Success),
    );
    const hackEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🔒 نظام تهكير الخزنة")
      .setDescription("قم بفك التشفير: اضغط على الأزرار المتطابقة (الأزرق مع الأزرق، والأخضر مع الأخضر) لبدء الاختراق!");

    let hackMsg: Awaited<ReturnType<typeof message.reply>>;
    try { hackMsg = await message.reply({ embeds: [hackEmbed], components: [hackRow] }); }
    catch { return; }

    const filter = (i: { user: { id: string } }) => i.user.id === message.author.id;
    const collector = hackMsg.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60_000 });

    let blueClicked = false, greenClicked = false;
    collector.on("collect", async (i) => {
      await i.deferUpdate();
      if (i.customId.startsWith("hack_blue")) blueClicked = true;
      if (i.customId.startsWith("hack_green")) greenClicked = true;
      if (blueClicked && greenClicked) collector.stop("success");
    });

    collector.on("end", async (_, reason) => {
      if (reason !== "success") {
        await hackMsg.edit({ content: "❌ انتهى الوقت أو فشل الاختراق.", embeds: [], components: [] }).catch(() => {});
        return;
      }
      const codeEmbed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("🔓 تم اختراق النظام الإلكتروني!")
        .setDescription("يرجى إدخال كود الخزنة الآن للفتح...\n\n*الكود: **1720***");
      await hackMsg.edit({ embeds: [codeEmbed], components: [] }).catch(() => {});

      const msgCollector = message.channel.createMessageCollector({
        filter: (m) => m.author.id === message.author.id && m.content === "1720",
        max: 1, time: 30_000,
      });

      msgCollector.on("collect", async (m) => {
        const lootRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId("steal_yes").setLabel("سرقة").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId("steal_no").setLabel("لا").setStyle(ButtonStyle.Secondary),
        );
        const lootEmbed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("📦 الخزنة مفتوحة!")
          .setDescription("هنالك **صندوق مبرد** بالداخل. هل تريد سرقته؟");

        let lootMsg: Awaited<ReturnType<typeof m.reply>>;
        try { lootMsg = await m.reply({ embeds: [lootEmbed], components: [lootRow] }); }
        catch { return; }

        const lootCollector = lootMsg.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 30_000 });
        lootCollector.on("collect", async (li) => {
          await li.deferUpdate();
          if (li.customId === "steal_yes") {
            usersInventory.set(message.author.id, { hasCooler: true, hasNuke: false });
            await lootMsg.edit({ content: "# 🎒\nتمت السرقة بنجاح ووضع الصندوق المبرد في حقيبتك!", embeds: [], components: [] }).catch(() => {});
          } else {
            await lootMsg.edit({ content: "تراجعت عن السرقة.", embeds: [], components: [] }).catch(() => {});
          }
          lootCollector.stop();
        });
      });

      msgCollector.on("end", (collected) => {
        if (collected.size === 0)
          hackMsg.edit({ content: "⏰ انتهى الوقت، لم تدخل الكود.", embeds: [], components: [] }).catch(() => {});
      });
    });
    return;
  }

  // ── الشنطة ──
  if (content === "-شنطه") {
    const userData = usersInventory.get(message.author.id);
    if (!userData || (!userData.hasCooler && !userData.hasNuke)) {
      try { await message.reply("حقيبتك فارغة تماماً حالياً."); } catch { /* ignore */ }
      return;
    }

    const filter = (i: { user: { id: string } }) => i.user.id === message.author.id;

    // الحالة 1: صندوق مبرد غير مفتوح
    if (userData.hasCooler && !userData.hasNuke) {
      const bagRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("open_cooler_yes").setLabel("نعم").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("open_cooler_no").setLabel("لا").setStyle(ButtonStyle.Secondary),
      );
      let bagMsg: Awaited<ReturnType<typeof message.reply>>;
      try { bagMsg = await message.reply({ content: "لديك **صندوق مبرد**، هل تريد الفتح؟", components: [bagRow] }); }
      catch { return; }

      const bagCollector = bagMsg.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 30_000 });
      bagCollector.on("collect", async (i) => {
        await i.deferUpdate();
        if (i.customId === "open_cooler_yes") {
          const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("confirm_yes").setLabel("نعم، متأكد").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("confirm_no").setLabel("إلغاء").setStyle(ButtonStyle.Secondary),
          );
          await bagMsg.edit({ content: "هل أنت متأكد؟", components: [confirmRow] }).catch(() => {});

          const confirmCollector = bagMsg.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 30_000 });
          confirmCollector.on("collect", async (i2) => {
            await i2.deferUpdate();
            if (i2.customId === "confirm_yes") {
              usersInventory.set(message.author.id, { hasCooler: true, coolerEmpty: true, hasNuke: true });
              await bagMsg.edit({ content: "لقد حصلت على **نواة صاروخ**!\n# ☢️", components: [] }).catch(() => {});
            } else {
              await bagMsg.edit({ content: "تم إلغاء الفتح.", components: [] }).catch(() => {});
            }
            confirmCollector.stop();
          });
        } else {
          await bagMsg.edit({ content: "لم تفتح الصندوق.", components: [] }).catch(() => {});
        }
        bagCollector.stop();
      });
      return;
    }

    // الحالة 2: عنده صاروخ
    if (userData.hasNuke) {
      const nukeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("click_nuke").setLabel("🚀 صاروخ").setStyle(ButtonStyle.Danger),
      );
      let statusMsg: Awaited<ReturnType<typeof message.reply>>;
      try { statusMsg = await message.reply({ content: "🎒 **محتويات الحقيبة:**\n- صندوق مبرد فارغ\n- صاروخ 🚀", components: [nukeRow] }); }
      catch { return; }

      const nukeCollector = statusMsg.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 30_000 });
      nukeCollector.on("collect", async (i) => {
        await i.deferUpdate();
        if (i.customId === "click_nuke") {
          const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("nuke_launch").setLabel("💥 تفجير").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("nuke_cancel").setLabel("إلغاء التفجير").setStyle(ButtonStyle.Secondary),
          );
          await statusMsg.edit({ content: "⚠️ **تحذير أمني:** اختر الإجراء القادم بحذر!", components: [actionRow] }).catch(() => {});

          const actionCollector = statusMsg.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 30_000 });
          actionCollector.on("collect", async (i2) => {
            await i2.deferUpdate();
            if (i2.customId === "nuke_launch") {
              await statusMsg.edit({ content: "🚀 جاري إطلاق الصاروخ وإرسال التهديد...", components: [] }).catch(() => {});
              if (message.guild) {
                const members = await message.guild.members.fetch();
                for (const [, member] of members) {
                  if (member.user.bot) continue;
                  member.send(`🚨 **تم تفجير المدينة** بواسطة ${message.author}!`).catch(() => {});
                }
              }
              usersInventory.delete(message.author.id);
            } else {
              await statusMsg.edit({ content: "❌ تم إلغاء عملية التفجير.", components: [] }).catch(() => {});
            }
            actionCollector.stop();
          });
        }
        nukeCollector.stop();
      });
      return;
    }
  }

  // ── تجارة GTA ──
  if (content === "!تجارة" || content === "!panel") {
    const user = getUserData(message.author.id);
    const { embed, row } = buildGtaPanel(user, message.author.id);
    try {
      // جرّب الرد في الشات
      await message.reply({ embeds: [embed], components: [row] });
    } catch {
      try {
        // لو ما يقدر يرد، يرسل DM للشخص
        await message.author.send({
          content: "⚠️ البوت ما عنده صلاحية الرد في هذا الروم، وصّلتلك لوحة التجارة هنا:",
          embeds: [embed],
          components: [row],
        });
      } catch {
        logger.warn({ userId: message.author.id }, "Cannot reply or DM user for trade panel");
      }
    }
  }
});

// ──────────────────────────────────────────────────
// Nexus Integrated Roleplay System (/nexus)
// ──────────────────────────────────────────────────
interface NexusProfile {
  name: string;
  age: number;
  nationality: string;
  job: string;
  passportId: string;
}
interface NexusInventory {
  iron: number;
  copper: number;
  wood: number;
  gunpowder: number;
  rawGoods: number;
  rubber: number;
  pistol: number;
}
interface NexusWallet {
  cash: number;
  bank: number;
}

const nexusProfiles = new Map<string, NexusProfile>();
const nexusInventories = new Map<string, NexusInventory>();
const nexusWallets = new Map<string, NexusWallet>();

function ensureNexusUser(userId: string) {
  if (!nexusInventories.has(userId)) {
    nexusInventories.set(userId, { iron: 15, copper: 10, wood: 8, gunpowder: 5, rawGoods: 6, rubber: 0, pistol: 0 });
  }
  if (!nexusWallets.has(userId)) {
    nexusWallets.set(userId, { cash: 1000, bank: 5000 });
  }
}

function buildNexusMenu() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("nexus_select_menu")
    .setPlaceholder("⚡ Select system interface...")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Passport Control")
        .setDescription("View or register your official citizen identity card")
        .setValue("sys_passport")
        .setEmoji("🪪"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Harvester Node")
        .setDescription("Gather raw materials and unmanufactured goods")
        .setValue("sys_gather")
        .setEmoji("⛏️"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Thermal Deconstructor v2.4")
        .setDescription("Convert unmanufactured assets into chemical resources")
        .setValue("sys_deconstructor")
        .setEmoji("🔥"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Weapon Fabrication Bench")
        .setDescription("Assemble tactical arms utilizing raw components")
        .setValue("sys_weapon_forge")
        .setEmoji("🛠️"),
      new StringSelectMenuOptionBuilder()
        .setLabel("iFruit Smart Link")
        .setDescription("Access mobile applications, banking, and bank transfers")
        .setValue("sys_phone")
        .setEmoji("📱"),
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

async function handleNexusCommand(interaction: ChatInputCommandInteraction) {
  ensureNexusUser(interaction.user.id);
  const selectRow = buildNexusMenu();

  const welcomeEmbed = new EmbedBuilder()
    .setColor(0x0f172a)
    .setTitle("⚙️ NEXUS INTEGRATED OPERATING SYSTEM")
    .setDescription(
      "Welcome to your central command nexus. Use the drop-down matrix below to navigate through security systems, material conversion engines, and personal applications.\n\n🔒 **Secure connection established.** Select a system to deploy.",
    )
    .setTimestamp()
    .setFooter({ text: "Nexus OS v4.2 • Client Access Authorized", iconURL: interaction.user.displayAvatarURL() });

  await interaction.reply({ embeds: [welcomeEmbed], components: [selectRow] });
}

async function handleNexusSelect(interaction: StringSelectMenuInteraction) {
  const userId = interaction.user.id;
  ensureNexusUser(userId);
  const selectRow = buildNexusMenu();
  const choice = interaction.values[0];
  const profile = nexusProfiles.get(userId);
  const inv = nexusInventories.get(userId)!;
  const wallet = nexusWallets.get(userId)!;

  if (!profile && choice !== "sys_passport") {
    const lockEmbed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle("⚠️ SYSTEM ACCESS DENIED")
      .setDescription(
        "No active Citizen Record was detected under this identity. You must register your ID Card in **Passport Control** first before using the Nexus System.",
      );
    await interaction.reply({ embeds: [lockEmbed], ephemeral: true });
    return;
  }

  if (choice === "sys_passport") {
    if (!profile) {
      const noPassportEmbed = new EmbedBuilder()
        .setColor(0xe11d48)
        .setTitle("🪪 CITIZEN IDENTITY RECORD: MISSING")
        .setDescription(
          "No local identity passport exists in our centralized mainframe registry.\n\nPlease initialize your citizen record card to gain state privileges.",
        )
        .setThumbnail("https://i.imgur.com/M6X8g8B.png");
      const registerBtn = new ButtonBuilder()
        .setCustomId("btn_open_register_modal")
        .setLabel("Register New Identity")
        .setEmoji("📝")
        .setStyle(ButtonStyle.Primary);
      const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(registerBtn);
      await interaction.update({ embeds: [noPassportEmbed], components: [selectRow, btnRow] });
    } else {
      const passportEmbed = new EmbedBuilder()
        .setColor(0x3b82f6)
        .setTitle("🪪 CITIZEN PASSPORT CARD")
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          { name: "👤 Full Name", value: `\`${profile.name}\``, inline: true },
          { name: "🎂 Age", value: `\`${profile.age} Years Old\``, inline: true },
          { name: "🌍 Nationality", value: `\`${profile.nationality}\``, inline: true },
          { name: "💼 Profession", value: `\`${profile.job}\``, inline: true },
          { name: "🆔 Passport Serial", value: `\`#${profile.passportId}\``, inline: true },
          { name: "🛡️ Record Security", value: "`AUTHORIZED LICENSE ✅`", inline: true },
        )
        .setImage("https://i.imgur.com/M6X8g8B.png")
        .setFooter({ text: "Verified by State Mainframe Database" });
      await interaction.update({ embeds: [passportEmbed], components: [selectRow] });
    }
  } else if (choice === "sys_gather") {
    const gatherEmbed = new EmbedBuilder()
      .setColor(0xd97706)
      .setTitle("⛏️ RAW MATERIAL HARVESTER NODE")
      .setDescription(
        "Activate drone extractors to harvest raw resources. These materials are essential for weapon forging and thermal recycling.",
      )
      .addFields(
        { name: "🪨 Iron Ore", value: `\`${inv.iron} units\``, inline: true },
        { name: "⚡ Copper Ore", value: `\`${inv.copper} units\``, inline: true },
        { name: "🪵 Raw Wood", value: `\`${inv.wood} units\``, inline: true },
        { name: "📦 Unmanufactured Goods", value: `\`${inv.rawGoods} units\``, inline: true },
      )
      .setImage("https://i.imgur.com/8Qp2F6K.png");
    const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("btn_gather_iron").setLabel("Mine Iron").setStyle(ButtonStyle.Secondary).setEmoji("🪨"),
      new ButtonBuilder().setCustomId("btn_gather_copper").setLabel("Mine Copper").setStyle(ButtonStyle.Secondary).setEmoji("⚡"),
      new ButtonBuilder().setCustomId("btn_gather_wood").setLabel("Chop Wood").setStyle(ButtonStyle.Secondary).setEmoji("🪵"),
      new ButtonBuilder().setCustomId("btn_gather_goods").setLabel("Scavenge Cargo").setStyle(ButtonStyle.Secondary).setEmoji("📦"),
    );
    await interaction.update({ embeds: [gatherEmbed], components: [selectRow, btnRow] });
  } else if (choice === "sys_deconstructor") {
    const deconstructEmbed = new EmbedBuilder()
      .setColor(0x06b6d4)
      .setTitle("🔥 Thermal Deconstructor")
      .setDescription("**Thermal Deconstructor v2.4**\nDeconstructs unmanufactured trade goods into highly purified raw rubber units.")
      .addFields(
        {
          name: "📊 Machine Settings & Status",
          value: "```\n⚙️ Engine Motor Status  : READY\n🔥 Active Chamber Temp   : 420 °C\n⚡ Energy Usage Rate     : 65 kW/h\n🧬 Compound Core Purity  : 99.8%\n```",
        },
        {
          name: "📋 Process Summary",
          value: `🔴 **INPUT:** \`x1 Unmanufactured Goods\` (Available: ${inv.rawGoods})\n🟢 **EXPECTED OUTPUT:** \`+1 Raw Rubber\``,
        },
        {
          name: "⚠️ Security Confirmation",
          value: "Click the verification button below to spin up the magnetic core and execute item decomposition.",
        },
      )
      .setImage("https://i.imgur.com/8Qp2F6K.png");
    const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("btn_exec_deconstruction").setLabel("Execute Deconstruction").setStyle(ButtonStyle.Danger).setEmoji("🔥"),
    );
    await interaction.update({ embeds: [deconstructEmbed], components: [selectRow, btnRow] });
  } else if (choice === "sys_weapon_forge") {
    const forgeEmbed = new EmbedBuilder()
      .setColor(0x6b7280)
      .setTitle("🛠️ Tactical Weapon Fabricator")
      .setDescription("**Metal Fusion Forge v4.2**\nSynthesizes components and alloys into heavy tactical firearm units.")
      .addFields(
        {
          name: "📊 Assembly Forge Settings & Status",
          value: "```\n⚙️ Forge Mechanical Piston : OPTIMIZED\n🔥 Plasma Melting Core Temp  : 1,450 °C\n⚡ Induction Energy Flow     : 120 kW/h\n🧬 Structured Alloy Integrity: 99.5%\n```",
        },
        {
          name: "📋 Synthesis Blueprint Summary",
          value: `🔴 **INPUTS:**\n- \`x10 Iron Ore\` (Available: ${inv.iron})\n- \`x5 Copper Ore\` (Available: ${inv.copper})\n- \`x3 Gunpowder\` (Available: ${inv.gunpowder})\n\n🟢 **EXPECTED PRODUCT:**\n- \`+1 Tactical 9mm Handgun\` (Total Crafted: ${inv.pistol})`,
        },
        {
          name: "⚠️ Assembly Safety Protocol",
          value: "High magnetic resonance will generate strong heat fields. Verify all components are locked and press the forge button.",
        },
      )
      .setImage("https://i.imgur.com/G566Z9u.png");
    const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("btn_exec_weapon_forge").setLabel("Forge Tactical Pistol").setStyle(ButtonStyle.Success).setEmoji("🔫"),
    );
    await interaction.update({ embeds: [forgeEmbed], components: [selectRow, btnRow] });
  } else if (choice === "sys_phone") {
    const phoneEmbed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle("📱 iFruit Mobile Link - Maze Bank Client")
      .setDescription(
        "📶 **Signal:** Secure 5G Network\n🔋 **Power:** 97% Connected\n\nAccess Maze Bank transfers, deposit local cash safely, or transfer capital electronically to another citizen.",
      )
      .addFields(
        { name: "💵 Physical Wallet Cash", value: `\`$${wallet.cash}\``, inline: true },
        { name: "🏦 Bank Account Balance", value: `\`$${wallet.bank}\``, inline: true },
      )
      .setThumbnail("https://i.imgur.com/YwN9f1Z.png")
      .setImage("https://i.imgur.com/wVjJb9p.png");
    const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("btn_phone_deposit").setLabel("Deposit $250").setStyle(ButtonStyle.Primary).setEmoji("📥"),
      new ButtonBuilder().setCustomId("btn_phone_withdraw").setLabel("Withdraw $250").setStyle(ButtonStyle.Primary).setEmoji("📤"),
      new ButtonBuilder().setCustomId("btn_phone_transfer").setLabel("Wire Transfer Capital").setStyle(ButtonStyle.Secondary).setEmoji("💸"),
    );
    await interaction.update({ embeds: [phoneEmbed], components: [selectRow, btnRow] });
  }
}

async function handleNexusButton(interaction: ButtonInteraction) {
  const userId = interaction.user.id;
  ensureNexusUser(userId);
  const inv = nexusInventories.get(userId)!;
  const wallet = nexusWallets.get(userId)!;
  const id = interaction.customId;

  if (id === "btn_open_register_modal") {
    const modal = new ModalBuilder().setCustomId("passport_registration_modal").setTitle("Mainframe Passport System");
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("input_passport_name")
          .setLabel("What is your full character name?")
          .setPlaceholder("Enter name (e.g. Marcus Miller)")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(50)
          .setRequired(true),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("input_passport_age")
          .setLabel("Enter age:")
          .setPlaceholder("Must be a number (e.g. 24)")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(3)
          .setRequired(true),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("input_passport_nationality")
          .setLabel("Where is your home country?")
          .setPlaceholder("e.g. Los Santos, Liberty City")
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("input_passport_job")
          .setLabel("Enter active profession:")
          .setPlaceholder("e.g. Weapon Manufacturer, Miner, Banker")
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
    );
    await interaction.showModal(modal);
    return;
  }

  if (id.startsWith("btn_gather_")) {
    let resultMessage = "";
    const gain = Math.floor(Math.random() * 4) + 3;
    if (id === "btn_gather_iron") {
      inv.iron += gain;
      resultMessage = `⛏️ Successfully extracted \`+${gain} Iron Ore\`!`;
    } else if (id === "btn_gather_copper") {
      inv.copper += gain;
      resultMessage = `⚡ Successfully extracted \`+${gain} Copper Ore\`!`;
    } else if (id === "btn_gather_wood") {
      inv.wood += gain;
      resultMessage = `🪵 Successfully chopped down \`+${gain} Wood\` logs!`;
    } else if (id === "btn_gather_goods") {
      const cargoGain = Math.floor(Math.random() * 2) + 1;
      inv.rawGoods += cargoGain;
      resultMessage = `📦 Salvaged \`+${cargoGain} Unmanufactured Cargo Goods\`!`;
    }
    const refreshed = EmbedBuilder.from(interaction.message.embeds[0]!)
      .setDescription(`${resultMessage}\n\nActivate extraction systems again to harvest more components.`)
      .setFields(
        { name: "🪨 Iron Ore", value: `\`${inv.iron} units\``, inline: true },
        { name: "⚡ Copper Ore", value: `\`${inv.copper} units\``, inline: true },
        { name: "🪵 Raw Wood", value: `\`${inv.wood} units\``, inline: true },
        { name: "📦 Unmanufactured Goods", value: `\`${inv.rawGoods} units\``, inline: true },
      );
    await interaction.update({ embeds: [refreshed] });
    return;
  }

  if (id === "btn_exec_deconstruction") {
    if (inv.rawGoods < 1) {
      await interaction.reply({
        content: "❌ **Processing Error:** Insufficient cargo goods! Harvest or purchase more `Unmanufactured Goods` to deconstruct.",
        ephemeral: true,
      });
      return;
    }
    inv.rawGoods -= 1;
    inv.rubber += 1;
    const updated = EmbedBuilder.from(interaction.message.embeds[0]!).setFields(
      {
        name: "📊 Machine Settings & Status",
        value: "```\n⚙️ Engine Motor Status  : CYCLING COMPLETE\n🔥 Active Chamber Temp   : 420 °C (Steady)\n⚡ Energy Usage Rate     : 65 kW/h\n🧬 Compound Core Purity  : 99.8%\n```",
      },
      {
        name: "📋 Process Summary",
        value: `🟢 **DECONSTRUCTION CONVERTED!**\nConsumed \`1x Unmanufactured Goods\` -> Created \`+1 Raw Rubber\`.\n\n🎒 **Storage:** Rubber: \`${inv.rubber}\` | Unmanufactured Cargo: \`${inv.rawGoods}\``,
      },
      { name: "⚠️ Security Confirmation", value: "Core cycle complete. Machine returning to safe idling mode." },
    );
    await interaction.update({ embeds: [updated] });
    return;
  }

  if (id === "btn_exec_weapon_forge") {
    if (inv.iron < 10 || inv.copper < 5 || inv.gunpowder < 3) {
      await interaction.reply({
        content: "❌ **Assembly Failed:** Insufficient resources!\nMake sure you possess at least `10 Iron`, `5 Copper`, and `3 Gunpowder`.",
        ephemeral: true,
      });
      return;
    }
    inv.iron -= 10;
    inv.copper -= 5;
    inv.gunpowder -= 3;
    inv.pistol += 1;
    const updated = EmbedBuilder.from(interaction.message.embeds[0]!).setFields(
      {
        name: "📊 Assembly Forge Settings & Status",
        value: "```\n⚙️ Forge Mechanical Piston : INERT\n🔥 Plasma Melting Core Temp  : 200 °C (Cooling Down)\n⚡ Induction Energy Flow     : 0 kW/h\n🧬 Structured Alloy Integrity: 99.5%\n```",
      },
      {
        name: "📋 Synthesis Blueprint Summary",
        value: `🟢 **FABRICATION COMPLETED SUCCESSFULLY!**\nAssembled: \`1x Tactical 9mm Handgun\` 🔫\n\n🎒 **Storage:**\n- 🔫 Tactical Handguns: \`${inv.pistol}\`\n- 🪨 Iron: \`${inv.iron}\` | ⚡ Copper: \`${inv.copper}\` | 🧨 Gunpowder: \`${inv.gunpowder}\``,
      },
      { name: "⚠️ Assembly Safety Protocol", value: "Weapons locker safely locked. Ready for next project schematic." },
    );
    await interaction.update({ embeds: [updated] });
    return;
  }

  if (id === "btn_phone_deposit") {
    if (wallet.cash < 250) {
      await interaction.reply({ content: "❌ You do not have $250 cash in your wallet!", ephemeral: true });
      return;
    }
    wallet.cash -= 250;
    wallet.bank += 250;
    const updated = EmbedBuilder.from(interaction.message.embeds[0]!)
      .setDescription("✅ Successfully deposited `$250` into Maze Bank Account!")
      .setFields(
        { name: "💵 Physical Wallet Cash", value: `\`$${wallet.cash}\``, inline: true },
        { name: "🏦 Bank Account Balance", value: `\`$${wallet.bank}\``, inline: true },
      );
    await interaction.update({ embeds: [updated] });
    return;
  }

  if (id === "btn_phone_withdraw") {
    if (wallet.bank < 250) {
      await interaction.reply({ content: "❌ Insufficient bank funds to withdraw $250!", ephemeral: true });
      return;
    }
    wallet.bank -= 250;
    wallet.cash += 250;
    const updated = EmbedBuilder.from(interaction.message.embeds[0]!)
      .setDescription("✅ Successfully withdrew `$250` into your physical wallet!")
      .setFields(
        { name: "💵 Physical Wallet Cash", value: `\`$${wallet.cash}\``, inline: true },
        { name: "🏦 Bank Account Balance", value: `\`$${wallet.bank}\``, inline: true },
      );
    await interaction.update({ embeds: [updated] });
    return;
  }

  if (id === "btn_phone_transfer") {
    const modal = new ModalBuilder().setCustomId("phone_transfer_bank_modal").setTitle("Secure Wire Bank Transfer");
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("input_target_id")
          .setLabel("Receiver's User Discord ID")
          .setPlaceholder("e.g. 488349202391029310")
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("input_transfer_amount")
          .setLabel("Transfer Capital Amount ($)")
          .setPlaceholder("Enter transfer amount (e.g. 500)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
    );
    await interaction.showModal(modal);
    return;
  }
}

async function handleNexusModal(interaction: ModalSubmitInteraction): Promise<boolean> {
  const userId = interaction.user.id;
  const selectRow = buildNexusMenu();

  if (interaction.customId === "passport_registration_modal") {
    const name = interaction.fields.getTextInputValue("input_passport_name");
    const age = parseInt(interaction.fields.getTextInputValue("input_passport_age"), 10);
    const nationality = interaction.fields.getTextInputValue("input_passport_nationality");
    const job = interaction.fields.getTextInputValue("input_passport_job");

    if (isNaN(age) || age <= 0) {
      await interaction.reply({ content: "❌ **Registration Failure:** Age input must be a valid positive integer value.", ephemeral: true });
      return true;
    }

    const passportId = `NX-${Math.floor(Math.random() * 900000 + 100000)}`;
    nexusProfiles.set(userId, { name, age, nationality, job, passportId });

    const successEmbed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle("🎉 REGISTERED SUCCESSFULLY")
      .setDescription(`**Passport Issued:** Identity created for **${name}**.\nYour account has been validated and system locks are now open!`);
    await interaction.reply({ embeds: [successEmbed], ephemeral: true });

    const refreshedPassportEmbed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle("🪪 CITIZEN PASSPORT CARD")
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: "👤 Full Name", value: `\`${name}\``, inline: true },
        { name: "🎂 Age", value: `\`${age} Years Old\``, inline: true },
        { name: "🌍 Nationality", value: `\`${nationality}\``, inline: true },
        { name: "💼 Profession", value: `\`${job}\``, inline: true },
        { name: "🆔 Passport Serial", value: `\`#${passportId}\``, inline: true },
        { name: "🛡️ Record Security", value: "`AUTHORIZED LICENSE ✅`", inline: true },
      )
      .setImage("https://i.imgur.com/M6X8g8B.png");

    try {
      await interaction.message?.edit({ embeds: [refreshedPassportEmbed], components: [selectRow] });
    } catch { /* original message may be gone */ }
    return true;
  }

  if (interaction.customId === "phone_transfer_bank_modal") {
    const targetId = interaction.fields.getTextInputValue("input_target_id").trim();
    const amount = parseInt(interaction.fields.getTextInputValue("input_transfer_amount"), 10);

    if (isNaN(amount) || amount <= 0) {
      await interaction.reply({ content: "❌ **Transfer Error:** Invalid transfer amount input.", ephemeral: true });
      return true;
    }

    ensureNexusUser(userId);
    const senderWallet = nexusWallets.get(userId)!;
    if (senderWallet.bank < amount) {
      await interaction.reply({ content: "❌ **Insufficient Funds:** Transfer amount is higher than bank savings.", ephemeral: true });
      return true;
    }

    ensureNexusUser(targetId);
    const receiverWallet = nexusWallets.get(targetId)!;
    senderWallet.bank -= amount;
    receiverWallet.bank += amount;

    const successEmbed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle("💸 Secure Maze Bank Wire Transfer Complete")
      .setDescription(
        `🏦 Successfully transferred \`$${amount}\` to target user ID \`${targetId}\`!\n\n💵 Remaining Wallet Cash: \`$${senderWallet.cash}\`\n🏦 Remaining Bank Savings: \`$${senderWallet.bank}\``,
      );
    await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    return true;
  }

  return false;
}

// ──────────────────────────────────────────────────
// الأحداث
// ──────────────────────────────────────────────────
client.once("clientReady", async (rc) => {
  logger.info({ tag: rc.user.tag }, "Discord bot ready");
  const rest = new REST().setToken(process.env["DISCORD_BOT_TOKEN"]!);
  try {
    await rest.put(Routes.applicationCommands(rc.user.id), { body: commands });
    logger.info("Slash commands registered globally");
  } catch (err) {
    logger.error({ err }, "Failed to register slash commands");
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === "sb") {
      await handleSbCommand(interaction);
    } else if (interaction.isChatInputCommand() && interaction.commandName === "system") {
      await handleSystemCommand(interaction);
    } else if (interaction.isChatInputCommand() && interaction.commandName === "nexus") {
      await handleNexusCommand(interaction);
    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "sb_menu") await handleMainMenu(interaction);
      else if (interaction.customId === "gta_menu") await handleGtaMenu(interaction);
      else if (interaction.customId === "nexus_select_menu") await handleNexusSelect(interaction);
    } else if (interaction.isButton() && interaction.customId.startsWith("gta_")) {
      await handleGtaButton(interaction);
    } else if (
      interaction.isButton() &&
      (interaction.customId.startsWith("btn_gather_") ||
        interaction.customId === "btn_open_register_modal" ||
        interaction.customId === "btn_exec_deconstruction" ||
        interaction.customId === "btn_exec_weapon_forge" ||
        interaction.customId === "btn_phone_deposit" ||
        interaction.customId === "btn_phone_withdraw" ||
        interaction.customId === "btn_phone_transfer")
    ) {
      await handleNexusButton(interaction);
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId === "passport_registration_modal" || interaction.customId === "phone_transfer_bank_modal") {
        await handleNexusModal(interaction);
      } else {
        await handleModalSubmit(interaction);
      }
    }
  } catch (err) {
    logger.error({ err }, "Error handling interaction");
    try {
      if (interaction.isRepliable()) {
        const r = interaction as ChatInputCommandInteraction;
        const msg = { content: "❌ حدث خطأ، حاول مرة ثانية.", ephemeral: true };
        if (r.replied || r.deferred) await r.followUp(msg);
        else await r.reply(msg);
      }
    } catch { /* ignore */ }
  }
});

client.on("error", (err) => logger.error({ err }, "Discord client error"));

// ──────────────────────────────────────────────────
// تشغيل
// ──────────────────────────────────────────────────
export function startBot() {
  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) { logger.warn("DISCORD_BOT_TOKEN not set"); return; }
  client.login(token).catch((err) => logger.error({ err }, "Failed to login Discord bot"));
}
