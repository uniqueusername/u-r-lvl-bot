var bot = require('../bot.js');
var randomColor = require('random-hex-color');
var colorRole;

var roleName = randomColor();
var randomHex = roleName.substr(1);
var randomHex = "0x" + randomHex;

var rolesToRemove = bot.msg.member.roles.filter(role => role.name.startsWith("#"));
bot.msg.member.roles.remove(bot.msg.member.roles.filter(role => role.name.startsWith("#")));
rolesToRemove.deleteAll();

bot.client.guilds.first().roles.create({
  data: {
    name: roleName,
    color: randomHex,
  },
  reason: 'random color purchase',
})
.then( role => { colorRole = role; return colorRole } )
.then( colorRole => { bot.msg.member.roles.add(colorRole) } )

bot.msg.channel.send({
  embed: {
    author: {
      name: "Transaction Complete",
      icon_url: bot.msg.author.avatarURL()
    },
    description: 'Successfully purchased ``color change (random)``.',
    color: parseInt(randomHex),
    footer: { text: 'uniqueusername/u-r-lvl-bot' }
  }
});
