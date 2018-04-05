var bot = require('../bot.js');
var fs = require('fs');
var colorRole;

if (/^#[0-9A-F]{6}$/i.test(bot.msg.content.split(" ")[2])) {
  var rolesToRemove = bot.msg.member.roles.filter(role => role.name.startsWith("#"));
  bot.msg.member.roles.remove(bot.msg.member.roles.filter(role => role.name.startsWith("#")));
  rolesToRemove.deleteAll();
  var colorToSet = bot.msg.content.split(" ")[2].substr(1);
  var colorToSet = "0x" + colorToSet;
  bot.client.guilds.first().roles.create({
    data: {
      name: bot.msg.content.split(" ")[2],
      color: parseInt(colorToSet),
    },
    reason: 'hex color purchase',
  })
  .then( role => { colorRole = role; return colorRole } )
  .then( colorRole => { bot.msg.member.roles.add(colorRole) } )
  bot.msg.channel.send({
    embed: {
      author: {
        name: "Transaction Complete",
        icon_url: bot.msg.author.avatarURL()
      },
      description: 'Successfully purchased ``color change (hex code)``.',
      color: parseInt(colorToSet),
      footer: { text: 'uniqueusername/u-r-lvl-bot' }
    }
  });
} else {
  bot.msg.channel.send("**Invalid hex code!** Make sure you send your message in the format ``purchase 2 #aabbcc`` (replace aabbcc with your own code).");
  bot.userLevels[bot.msg.author.id][1] += bot.selectedItem["cost"] * 1000;
  fs.writeFileSync('../userLevels.json', JSON.stringify(bot.userLevels), 'utf8');
}
