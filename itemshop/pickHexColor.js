var bot = require('../bot.js');
var fs = require('fs');
var colorRole;

var rolesToRemove = bot.msg.member.roles.filter(role => role.name.startsWith("#"));
bot.msg.member.removeRoles(bot.msg.member.roles.filter(role => role.name.startsWith("#")));
rolesToRemove.deleteAll();

if (/^#[0-9A-F]{6}$/i.test(bot.msg.content.split(" ")[2])) {
  var colorToSet = bot.msg.content.split(" ")[2].substr(1);
  var colorToSet = "0x" + colorToSet;
  bot.client.guilds.first().createRole({
    name: bot.msg.content.split(" ")[2],
    color: parseInt(colorToSet)
  })
  .then( role => { colorRole = role; return colorRole } )
  .then( colorRole => { bot.msg.member.addRole(colorRole) } )
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
