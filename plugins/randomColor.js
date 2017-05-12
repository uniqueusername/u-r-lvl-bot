var bot = require('../bot.js');
var randomColor = require('random-hex-color');
var colorRole;

var roleName = randomColor();
var randomHex = roleName.substr(1);
var randomHex = "0x" + randomHex;

var rolesToRemove = bot.msg.member.roles.filter(role => role.name.startsWith("#"));
bot.msg.member.removeRoles(bot.msg.member.roles.filter(role => role.name.startsWith("#")));
rolesToRemove.deleteAll();

bot.client.guilds.first().createRole({
  name: roleName,
  color: randomHex
})
.then( role => { colorRole = role; return colorRole } )
.then( colorRole => { bot.msg.member.addRole(colorRole) } )

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