ürünükontrolü
    if (!checkChannelAndRole(interaction, isVip, isBoost, isUltravip) && !isVip && !isBoost && channelId !== channelIds.normal) {
    return interaction.reply({ content: 'Bu komut sadece Normal kanalında kullanılabilir!', epheme
