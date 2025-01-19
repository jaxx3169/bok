const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');  // Gerekli import
const fs = require('fs');
const path = require('path');
const { token, guildId, channelIds, adminId } = require('./config.json');

// Botu başlatıyoruz
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

// Bot hazır olduğunda çalışacak kod
client.once('ready', async () => {
  console.log(`${client.user.tag} is now running!`);

  // Slash komutları kaydet
  const commands = [
    new SlashCommandBuilder()
      .setName('gen')
      .setDescription('Hesap Genere Et')
      .addStringOption(option =>
        option.setName('type')
          .setDescription('Gen türünü seç')
          .setRequired(true)
          .addChoices(
            { name: 'free', value: 'free' },
            { name: 'vip', value: 'vip' },
            { name: 'boost', value: 'boost' },
            { name: 'ultravip', value: 'ultravip' }
          )),
  ];

  try {
    await client.application.commands.set(commands, guildId); // Komutları yalnızca belirli bir sunucuda kaydediyoruz
    console.log('Komutlar başarıyla kaydedildi!');
  } catch (error) {
    console.error('Komutları kaydederken bir hata oluştu:', error);
  }
});

// Komut işleyicisi
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'gen') {
    const type = interaction.options.getString('type'); // Parametreyi al

    let fileName = '';
    let isVip = false, isBoost = false, isUltravip = false;

    if (type === 'free') {
      fileName = 'free.txt';
    } else if (type === 'vip') {
      fileName = 'vip.txt';
      isVip = true;
    } else if (type === 'boost') {
      fileName = 'boost.txt';
      isBoost = true;
    } else if (type === 'ultravip') {
      fileName = 'ultravip.txt';
      isUltravip = true;
    } else {
      return interaction.reply({ content: 'Geçersiz seçenek. Lütfen `free`, `vip`, `boost`, veya `ultravip` seçeneğini girin!', ephemeral: true });
    }

    // Kanal ve rol kontrolü
    if (!checkChannelAndRole(interaction, isVip, isBoost, isUltravip)) {
      return;
    }

    // Hesapları gönderme işlemi
    await sendAccount(interaction, fileName, isVip, isBoost, isUltravip);
  }
});

// Hesap gönderme işlemi
async function sendAccount(interaction, fileName, isVip = false, isBoost = false, isUltravip = false) {
  const userId = interaction.user.id;

  try {
    const filePath = path.join(__dirname, fileName);
    const accounts = fs.readFileSync(filePath, 'utf-8').split('\n').filter(account => account.trim());

    if (accounts.length === 0) {
      return interaction.reply({ content: 'Stokta hesap kalmadı!', ephemeral: true });
    }

    const selectedAccount = accounts.splice(Math.floor(Math.random() * accounts.length), 1)[0];

    // Hesabı dosyadan silme ve dosyayı güncelleme
    fs.writeFileSync(filePath, accounts.join('\n'));

    // Kullanıcıya DM ile hesap gönderme
    await interaction.user.send(`Hesabınız: ${selectedAccount}`);

    // Embed mesajını oluşturma
    const embed = new EmbedBuilder()
      .setTitle(`${interaction.guild.name}`)
      .setDescription(`📦 Kalan Stok --> ${accounts.length}\n✅ Hesap Başarıyla DM'den İletildi!`)
      .setColor(0x00FF00); // Yeşil renk

    // Butonları oluşturma
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(isBoost ? 'Boost Hesap' : isVip ? 'VIP Hesap' : isUltravip ? 'UltraVIP Hesap' : 'Normal Hesap')
        .setStyle(isBoost ? ButtonStyle.Secondary : isFree ? ButtonStyle.Danger : isUltravip ? ButtonStyle.Danger : ButtonStyle.Primary) // Boost ve Free renkleri değiştirildi
        .setCustomId('button-1')  // custom_id ekleyin
    );

    // Eğer zaten bir yanıt verildiyse, yeni bir yanıt göndermeyin
    if (!interaction.replied) {
      // Embed mesajını gönderiyoruz
      await interaction.reply({ embeds: [embed], components: [row] });
      console.log("Embed mesajı gönderildi.");
    } else {
      // Eğer etkileşime yanıt verildiyse, `followUp` kullanın
      await interaction.followUp({ embeds: [embed], components: [row] });
    }

    // Cooldown ekleme
    setCooldown(userId, isVip, isBoost, isUltravip);

  } catch (error) {
    console.error('Hesap gönderme hatası:', error);
    await interaction.reply({ content: 'Hesap gönderme sırasında bir hata oluştu.', ephemeral: true });
  }
}

// Kanal ve rol kontrolü
function checkChannelAndRole(interaction, isVip, isBoost, isUltravip) {
  const userId = interaction.user.id;
  const channelId = interaction.channel.id;

  // VIP, Boost ve UltraVIP rol kontrolü
  if (isUltravip && !interaction.member.roles.cache.some(role => role.name === 'Ultra Vip Gen') && userId !== adminId) {
    return interaction.reply({ content: 'UltraVIP Gen rolünüz yok!', ephemeral: true });
  }
  if (isVip && !interaction.member.roles.cache.some(role => role.name === 'Vip Gen') && userId !== adminId) {
    return interaction.reply({ content: 'Vip Gen rolünüz yok!', ephemeral: true });
  }
  if (isBoost && !interaction.member.roles.cache.some(role => role.name === 'Boost Gen') && userId !== adminId) {
    return interaction.reply({ content: 'Boost Gen rolünüz yok!', ephemeral: true });
  }

  // Kanal kontrolü
  if (isUltravip && channelId !== channelIds.ultravip) {
    return interaction.reply({ content: 'Bu komut sadece UltraVIP kanalında kullanılabilir!', ephemeral: true });
  }
  if (isVip && channelId !== channelIds.vip) {
    return interaction.reply({ content: 'Bu komut sadece VIP kanalında kullanılabilir!', ephemeral: true });
  }
  if (isBoost && channelId !== channelIds.boost) {
    return interaction.reply({ content: 'Bu komut sadece Boost kanalında kullanılabilir!', ephemeral: true });
  }
  if (!isUltravip && !isVip && !isBoost && channelId !== channelIds.normal) {
    return interaction.reply({ content: 'Bu komut sadece Normal kanalında kullanılabilir!', ephemeral: true });
  }

  return true;
}

// Cooldown fonksiyonu (geçici bekleme)
const cooldowns = {};

function setCooldown(userId, isVip, isBoost, isUltravip) {
  let cooldownTime = 1800; // Default cooldown (Normal) = 30 dakika

  if (isVip) cooldownTime = 1200;  // VIP cooldown = 20 dakika
  if (isBoost) cooldownTime = 900;  // Boost cooldown = 15 dakika
  if (isUltravip) cooldownTime = 600;  // UltraVIP cooldown = 10 dakika

  const currentTime = Date.now();
  cooldowns[userId] = currentTime + cooldownTime * 1000;
  setTimeout(() => delete cooldowns[userId], cooldownTime * 1000);  // Cooldown bitince temizle
}

client.login(token);
