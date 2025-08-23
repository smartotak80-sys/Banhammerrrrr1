require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const CREATOR_CHANNEL_ID = process.env.CREATOR_CHANNEL_ID;
const CATEGORY_ID = process.env.VOICE_CATEGORY_ID;

client.once('ready', () => {
    console.log(`✅ Бот увійшов як ${client.user.tag}`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        const guild = newState.guild;

        // Якщо користувач зайшов у канал-тригер
        if (newState.channelId === CREATOR_CHANNEL_ID && oldState.channelId !== CREATOR_CHANNEL_ID) {

            // Шукаємо всі вже існуючі приватні канали
            const existingChannels = guild.channels.cache
                .filter(c => c.parentId === CATEGORY_ID && c.name.startsWith('Приват'))
                .map(c => c.name);

            // Визначаємо новий номер
            let maxNumber = 0;
            existingChannels.forEach(name => {
                const match = name.match(/Приват (\d+)/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (num > maxNumber) maxNumber = num;
                }
            });
            const newNumber = maxNumber + 1;

            // Створюємо приватний голосовий канал
            const privateChannel = await guild.channels.create({
                name: `Приват ${newNumber}`,
                type: 2,
                parent: CATEGORY_ID,
                permissionOverwrites: [
                    {
                        id: newState.member.id,
                        allow: [
                            PermissionsBitField.Flags.Connect,
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.Speak
                        ],
                    },
                    {
                        id: guild.roles.everyone.id,
                        deny: [
                            PermissionsBitField.Flags.Connect,
                            PermissionsBitField.Flags.ViewChannel
                        ],
                    }
                ]
            });

            // Переміщаємо користувача у приватний канал
            await newState.setChannel(privateChannel);
            console.log(`Створено приватний канал: ${privateChannel.name}`);
        }

        // Миттєво видаляємо порожні приватні канали
        if (oldState.channel) {
            const channel = oldState.channel;

            if (
                channel.parentId === CATEGORY_ID &&
                channel.members.size === 0 &&
                channel.name.startsWith('Приват')
            ) {
                if (channel.deletable) {
                    await channel.delete().catch(() => {});
                    console.log(`Видалено порожній приватний канал: ${channel.name}`);
                }
            }
        }

    } catch (error) {
        console.error('Помилка у voiceStateUpdate:', error);
    }
});

client.login(process.env.DISCORD_TOKEN);
