// initialization

'use strict';

var Discord = require('discord.js');
var bot = new Discord.Client();
var fs = require('fs');
var beautify = require('json-beautify');
var nunjucks = require('nunjucks');
var Chance = require('chance');
var chance = new Chance();

require('events').EventEmitter.prototype._maxListeners = 100;

nunjucks.configure({ autoescape: true, trimBlocks: true, lstripBlocks: true });

// global vars

var config;
var userLevels = {};
var userStats = {}; // timer, message count, message array
var activeTrades = [];
var leaderboardRequests = [];
var itemShop = JSON.parse(fs.readFileSync('plugins/itemShop.json'));
var helpList = JSON.parse(fs.readFileSync('plugins/help.json'));
var currentStream;
var currentlyPlaying;
var channelPending = false;

function anonReset() {
  var currentDate = new Date();
  var timeToResetAnon = new Date();
  var timeToResetAnon = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), config.anonKeyResetTime, 0, 0, 0);
  var millisLeft = timeToResetAnon.getTime() - currentDate.getTime();
  if (millisLeft <= 0) {
    millisLeft = 86400000 - millisLeft
  }
  setTimeout(function() { fs.writeFileSync('anonKeys.json', '{ }', 'utf8'); anonReset() }, millisLeft);
}

function ventReset() {
  var currentDate = new Date();
  var timeToResetVent = new Date();
  var timeToResetVent = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), config.ventResetTime, 0, 0, 0);
  var millisLeft = timeToResetVent.getTime() - currentDate.getTime();
  if (millisLeft <= 0) {
    millisLeft = 86400000 - millisLeft
  }
  setTimeout(function() {
    bot.guilds.first().channels.get(config.ventChannel).delete().then(channel => {
      bot.guilds.first().createChannel("vent", "text").then(channel2 => {
        channel2.setPosition(config.ventPosition);
        channel2.setTopic("im mad ya dip");
        config.ventChannel = channel2.id;
        config.anonymousChannel = channel2.id;
        fs.writeFileSync('config.json', JSON.stringify(config), 'utf8');
      });
    });

    ventReset();
  }, millisLeft);
}
var xpMessages = ["i think this is slavery but you have ", "u fuck u got ", "when do i get my paycheck, because it better be more than ", "i really am not getting paid for this, can i have some of that juicy ", "u could buy a car with this dank af ", "idk what youre smoking but thats a thicc ", "the snail sleeps for ", "dad said he went to the store but i havent seen him since the fall of ", "you are now allowed to identify as this many genders: ", "bush did ", "where is the cheeto nick"];

// give xp per message
bot.on('message', msg => {
  userLevels = JSON.parse(fs.readFileSync('userLevels.json'));
  let userLevelStats = userStats[msg.author.id];

  // dynamically add xp based on amount of characters and message sent within a minute
  if (userLevels[msg.author.id] == undefined) {
    userLevels[msg.author.id] = [0, 0]; // set xp and tokens to 0
  }
  if (userLevelStats == undefined) {
    userLevelStats = { "timerEnabled": false, "messageArray": [] };
    userStats[msg.author.id] = userLevelStats;
  }
  userLevelStats["messageArray"].push(msg.content); // push the message into the message array
  if (userLevelStats["timerEnabled"] === false) {
    const numCharacters = userLevelStats["messageArray"].join("").split(" ").join("").length // number of characters in message array without spaces
    const averageCharacters = Math.floor( numCharacters / userLevelStats["messageArray"].length); // amount of xp per current minute
    userLevels[msg.author.id][0] += averageCharacters; // add character count / number of messages to user total xp
    userLevels[msg.author.id][1] += averageCharacters; // add gained xp to token count
    userLevelStats["timerEnabled"] = true; // 1 for timer enabled
    userLevelStats["messageArray"] = []; // reset message array
    // timeout to reset timer after 60 seconds
    setTimeout(function() {
      userLevelStats["timerEnabled"] = false;
    }, 60000);
    userStats[msg.author.id] = userLevelStats;
  } else {
    userStats[msg.author.id] = userLevelStats;
  }

  fs.writeFileSync('userLevels.json', JSON.stringify(userLevels), 'utf8');
});

// check amount of xp
bot.on('message', msg => {
  xpChecker: { if (msg.content.toLowerCase() == ("where is the cheeto nick") || msg.content.startsWith("_rank")) {
    userLevels = JSON.parse(fs.readFileSync('userLevels.json'));
    if (msg.content.split(" ").length == 2 && msg.mentions.users.firstKey() != undefined) {
      var userXP = userLevels[msg.mentions.users.firstKey()][0];
      var nameOfUser = msg.mentions.members.first().displayName;
      var userAvatar = msg.mentions.users.first().avatarURL();
      var userCheckID = msg.mentions.users.firstKey();
    } else if (msg.content.split(" ").length == 2 && msg.mentions.users.firstKey() == undefined) {
      msg.channel.send("Improper syntax! Make sure to mention the user properly. ``_rank @usertocheck#xxxx``");
      break xpChecker;
    } else {
      var userXP = JSON.parse(fs.readFileSync('userLevels.json'))[msg.author.id][0];
      var nameOfUser = msg.member.displayName;
      var userAvatar = msg.author.avatarURL();
      var userCheckID = msg.author.id;
    }

    var userRanks = []

    for (var key in userLevels) {
      userRanks.push(userLevels[key][0]);
    }
    userRanks = userRanks.sort(sortNumber).reverse();
    let userRank = userRanks.indexOf(userXP) + 1;

    msg.channel.send({
      embed: {
        author: {
          name: nameOfUser,
        },
        description: xpMessages[getRandomInt(0, xpMessages.length)],
        thumbnail: { url: userAvatar },
        color: 0xffffff,
        fields: [
          {
            name: "Level",
            value: getLevelFromXP(userXP),
            inline: true
          },
          {
            name: "XP",
            value: `${userXP}/${getXPFromLevel(getLevelFromXP(userXP) + 1)}`,
            inline: true
          },
          {
            name: "Rank",
            value: `${userRank}/${userRanks.length}`,
            inline: true
          },
          {
            name: "Tokens",
            value: getTokensFromTotalXP(userLevels[userCheckID][1]),
            inline: true
          }
        ],
        footer: { text: 'uniqueusername/u-r-lvl-bot' }
      }
    });

    }
  }
});

// leaderboard
bot.on('message', msg => {
  if (msg.content.toLowerCase() == '_lb' || msg.content.toLowerCase() == "i just stole half these stacks off these racks i didnt even have to pay tax") {
    msg.reply("👪 for top 10, 🙆 to skip to yourself.")
      .then(message => {
        message.react("👪")
          .then(reaction => {
            reaction.message.react("🙆")
            leaderboardRequests.push(reaction.message.id);
          });
      });
  }
});

// token shop
bot.on('message', msg => {

  if (msg.content.toLowerCase() == ('open shop') || msg.content.toLowerCase() == "_shop") {
    msg.react("✅");
    msg.author.send(nunjucks.render('plugins/shop.template', itemShop));
  }

  if (msg.content.toLowerCase().startsWith('_purchase')) {
    if (itemShop["itemShop"][parseInt(msg.content.toLowerCase().split(" ")[1]) - 1] != undefined) {
      var userLevels = JSON.parse(fs.readFileSync('userLevels.json'));
      let selectedItem = itemShop["itemShop"][parseInt(msg.content.toLowerCase().split(" ")[1]) - 1];
      if (getLevelFromXP(userLevels[msg.author.id][0]) < selectedItem["level"]) {
        msg.channel.send("You don't meet the level requirement ``(" + selectedItem["level"] + ")`` for ``" + selectedItem["description"] + "``");
      } else if (getTokensFromTotalXP(userLevels[msg.author.id][1]) < selectedItem["cost"]) {
        msg.channel.send("You don't have enough tokens for ``" + selectedItem["description"] + "``");
      } else {
        module.exports = { userLevels: userLevels, client: bot, msg: msg, selectedItem: selectedItem };
        delete require.cache[require.resolve('./plugins/' + selectedItem["file"])];
        require('./plugins/' + selectedItem["file"]);
        userLevels[msg.author.id][1] -= selectedItem["cost"] * 1000;
        fs.writeFileSync('userLevels.json', JSON.stringify(userLevels), 'utf8');
      }
    }
  };

});

// help command
bot.on('message', msg => {
  if (msg.content.toLowerCase() == ('_help')) {
    msg.react("✅");
    msg.author.send(nunjucks.render('plugins/help.template', helpList));
  }
});

// xp and token resetter
bot.on('message', msg => {
  if (msg.content.toLowerCase().startsWith('reset xp of') && msg.author.id == config.adminID) {
    var userLevels = JSON.parse(fs.readFileSync('userLevels.json'));
    var userToReset = msg.mentions.users.firstKey();
    if (userLevels[userToReset] != undefined) {
      userLevels[userToReset][0] = 0;
      fs.writeFileSync('userLevels.json', JSON.stringify(userLevels), 'utf8');
      msg.channel.send('get dunkd');
    } else {
      msg.channel.send("That user has no xp.");
    }
  }

  if (msg.content.toLowerCase().startsWith('reset tokens of') && msg.author.id == config.adminID) {
    var userLevels = JSON.parse(fs.readFileSync('userLevels.json'));
    var userToReset = msg.mentions.users.firstKey();
    if (userLevels[userToReset] != undefined) {
      userLevels[userToReset][1] = 0;
      fs.writeFileSync('userLevels.json', JSON.stringify(userLevels), 'utf8');
      msg.channel.send('get dunkd');
    } else {
      msg.channel.send("That user has no tokens.");
    }
  }
});

// gift another user tokens
bot.on('message', msg => {
  if (msg.content.toLowerCase().startsWith('_gift')) {
    var userLevels = JSON.parse(fs.readFileSync('userLevels.json'));
    var userToGift = msg.mentions.users.firstKey();
    if (userLevels[userToGift] == undefined) {
      userLevels[userToGift] = [0, 0];
    }

    if (isNaN(parseInt(msg.content.split(' ')[2])) === false) {
      var amountToGift = parseInt(msg.content.split(' ')[2]);
      if (amountToGift < 0) {
        msg.channel.send("U sneaky that isn't gonna work this time");
      } else if (userLevels[msg.author.id][1] >= amountToGift*1000) {
        userLevels[msg.author.id][1] -= amountToGift*1000;
        userLevels[userToGift][1] += amountToGift*1000;
        fs.writeFileSync('userLevels.json', JSON.stringify(userLevels), 'utf8');
        msg.channel.send(`You have gifted <@${userToGift}> ${amountToGift} tokens!`);
      } else {
        msg.channel.send("You don't have that many tokens!");
      }
    } else {
      msg.channel.send("Invalid amount of tokens! Make sure you send your message in the form ``_gift @userToGift tokensToGift``");
    }
  }
});

// color trade
bot.on('message', msg => {
  if (msg.content.toLowerCase().startsWith('_trade')) {
    var userToTrade = msg.mentions.users.firstKey(); // id of tradee
    var memberToTrade = msg.mentions.members.first(); // member object of tradee
    if (userToTrade != undefined && userToTrade != msg.author.id) {
      if (memberToTrade.roles.filter(role => role.name.startsWith("#")).first() != undefined && msg.member.roles.filter(role => role.name.startsWith("#")).first() != undefined) {
        msg.channel.send(`<@${userToTrade}>, would you like to trade colors with <@${msg.author.id}>?`).then(message => {
          message.react('✔');
          message.react('✖');
          activeTrades.push(message.id);
        });
       } else {
        msg.channel.send("Either you or the tradee does not have a color.");
      }
    } else if (userToTrade == msg.author.id) {
      msg.channel.send("boi u cant trade with yourself");
    } else {
      msg.channel.send("That is not a valid user.");
    }
  }
});

bot.on('message', msg => {
  if (msg.content.toLowerCase().startsWith('_anon')) {
    var anonKeys = JSON.parse(fs.readFileSync('anonKeys.json'));
    var anonMessage = cut(msg.content, 0, 5);

    if (anonKeys[msg.author.id] != undefined) {
      bot.guilds.first().channels.get(config.anonymousChannel).send(`${anonKeys[msg.author.id]}: ${anonMessage}`);
    } else {
      anonKeys[msg.author.id] = `${chance.word()}${chance.age()}`;
      bot.guilds.first().channels.get(config.anonymousChannel).send(`${anonKeys[msg.author.id]}: ${anonMessage}`);
      fs.writeFileSync('anonKeys.json', JSON.stringify(anonKeys), 'utf8');
    }
  }
})

// actual trading of colors/leaderboard
bot.on('messageReactionAdd', (reaction, user) => {
  if (activeTrades.includes(reaction.message.id)) {
    var tradeeID = reaction.message.content.split(",")[0];
    tradeeID = cut(tradeeID, 0, 1);
    tradeeID = cut(tradeeID, tradeeID.length - 1, tradeeID.length)
    if (user.id != tradeeID) { // firstkey is the user who is being asked
      return;
    } else {
      if (reaction.emoji.name == "✔") {
        let trader = reaction.message.mentions.members.last();
        let tradee = reaction.message.mentions.members.first();
        let traderColor = trader.roles.filter(role => role.name.startsWith("#")).first();
        let tradeeColor = tradee.roles.filter(role => role.name.startsWith("#")).first();

        trader.removeRole(traderColor);
        tradee.removeRole(tradeeColor);
        trader.addRole(tradeeColor);
        tradee.addRole(traderColor);
        reaction.message.channel.send("Trade complete.");

        activeTrades.splice(activeTrades.indexOf(reaction.message.id), 1);
      } else if (reaction.emoji.name == "✖") {
        reaction.message.channel.send("Trade cancelled.");

        activeTrades.splice(activeTrades.indexOf(reaction.message.id), 1);
      } else {
        return;
      }
    }
  } else if (leaderboardRequests.includes(reaction.message.id)) {
    var requesterID = reaction.message.mentions.users.firstKey();
    if (user.id != requesterID) {
      return;
    } else {
      if (reaction.emoji.name == "👪") {
        sendTopLeaderboard(reaction.message);
        leaderboardRequests.splice(leaderboardRequests.indexOf(reaction.message.id), 1);
      } else if (reaction.emoji.name == "🙆") {
        sendPersonalLeaderboard(reaction.message);
        leaderboardRequests.splice(leaderboardRequests.indexOf(reaction.message.id), 1);
      }
    }
  }
});

bot.on('message', msg => {
  if (msg.author.id == config.adminID) {
    if (msg.content.toLowerCase() == "_cast join") {
      channelPending = true;
      msg.member.voiceChannel.join().then(vc => {
        currentStream = vc;
        channelPending = false;
      });
    } else if (msg.content.toLowerCase() == "_cast leave") {
      if (bot.voiceConnections.first() != undefined) {
        bot.voiceConnections.first().disconnect();
        currentStream = undefined;
        currentlyPlaying = undefined;
      } else {
        return;
      }
    }

    if (!channelPending) {
      if (msg.content.toLowerCase() == "_cast play" && currentStream != undefined) {
        currentlyPlaying = currentStream.playStream(config.streamPath);
      } else if (msg.content.toLowerCase() == "_cast play" && currentStream == undefined) {
        msg.channel.send("**Error!** You must execute ``_cast join`` first.");
      } else if (msg.content.toLowerCase() == "_cast stop" && currentlyPlaying != undefined) {
        currentlyPlaying.end();
      } else if (msg.content.toLowerCase() == "_cast pause" && currentlyPlaying != undefined) {
        currentlyPlaying.pause();
      } else if (msg.content.toLowerCase() == "_cast resume" && currentlyPlaying != undefined) {
        currentlyPlaying.resume();
      };
    } else {
      return;
    }
  }
});

bot.on('message', msg => {
  if (msg.content.toLowerCase() == "_ping") {
    msg.channel.send('fuck ``' + bot.ping + 'ms``');
  }
});

function sendTopLeaderboard(msg) {
  userLevels = JSON.parse(fs.readFileSync('userLevels.json'));
  var userRanks = {};

  for (var key in userLevels) {
    userRanks[userLevels[key][0]] = key;
  }

  var topXPList = Object.keys(userRanks).sort(sortNumber).reverse(); // list of top 10 xp numbers
  var topUsers = [];

  for (var i = 0; i < 10; i++) {
    var currentNick;
    var currentMember;
    var currentUser = bot.users.fetch(userRanks[topXPList[i]])
      .then(userObject => {
        currentMember = bot.guilds.first().members.fetch(userObject)
          .then(memberObject => {
            currentNick = memberObject.displayName;
            topUsers.push(currentNick)

            if (topUsers.length == 10) {
              var leaderboardMessage = "```Current leaderboard:"

              for (let ii = 0; ii < 10; ii++) {
                leaderboardMessage += `\n${ii+1}. ${topUsers[ii]} (Level ${getLevelFromXP(topXPList[ii])}) (Total XP: ${topXPList[ii]})`;
              }

              leaderboardMessage += '```';
              msg.channel.send(leaderboardMessage);
            }
          })
      })
  }
}

function sendPersonalLeaderboard(msg) {
  userLevels = JSON.parse(fs.readFileSync('userLevels.json'));
  var userRanks = {};

  for (var key in userLevels) {
    userRanks[userLevels[key][0]] = key;
  }

  var topXPList = Object.keys(userRanks).sort(sortNumber).reverse(); // list of top xp numbers
  var topUsers = [];

  var requesterID = msg.mentions.users.firstKey();
  var indexOfRequester = topXPList.indexOf(userLevels[requesterID][0].toString());

  if (indexOfRequester < 2 || indexOfRequester > topXPList.length - 2) {
    sendTopLeaderboard(msg);
  } else {
    for (var i = 0; i < 5; i++) {
      let currentIndex = i - 2;
      let currentRank = (indexOfRequester - currentIndex) + 1;
      bot.users.fetch(userRanks[topXPList[indexOfRequester - currentIndex]])
        .then(userObject => {
          bot.guilds.first().members.fetch(userObject)
            .then(memberObject => {
              topUsers.push(`${currentRank}. ${memberObject.displayName} (Level ${getLevelFromXP(userLevels[memberObject.id][0])}) (Total XP: ${userLevels[memberObject.id][0]})`);
              if (topUsers.length == 5) {
                topUsers = topUsers.reverse();
                var leaderboardMessage = "```Your position on the leaderboard:"
                for (var i = 0; i < 5; i++) {
                  if (i == 2) {
                    leaderboardMessage += `\n>> ${topUsers[i]}`
                  } else {
                    leaderboardMessage += `\n${topUsers[i]}`;
                  }
                }
                leaderboardMessage += "```";
                msg.channel.send(leaderboardMessage);
              }
            });
        });
    }
  }
}

// random int function
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max-min) + min);
}

// numerical sorting function
function sortNumber(a, b) {
  return a - b;
}

// cut out part of a string
function cut(str, cutStart, cutEnd){
  return str.substr(0,cutStart) + str.substr(cutEnd+1);
}

// calculate level from xp
function getLevelFromXP(xp) {
  return Math.floor(0.2 * Math.sqrt(xp));
}

// calculate xp from level
function getXPFromLevel(level) {
  return Math.floor(level*5*level*5);
}

// calculate tokens from total xp
function getTokensFromTotalXP(totalxp) {
  return Math.floor(totalxp / 1000);
}

function loadConfiguration(callback) {
  config = JSON.parse(fs.readFileSync('config.json'));
  console.log('Read configuration from `config.json`.');

  if (config.token === undefined || config.token.length < 1) {
    console.log('No bot token is set in config.json.');
  } else {
    bot.login(config.token);
  }
}

// start bot
loadConfiguration();

bot.on('ready', () => {
  anonReset();
  ventReset();
  console.log('u r lvl BOT rEEEEEEEEEEEEEEEEEEEEEEEEEEEE');

  if (!fs.existsSync('userLevels.json')) {
    fs.writeFileSync('userLevels.json', '{ }');
  } else if (fs.readFileSync('userLevels.json') == "") {
    fs.writeFileSync('userLevels.json', '{ }');
  }

  if (!fs.existsSync('anonKeys.json')) {
    fs.writeFileSync('anonKeys.json', '{ }');
  } else if (fs.readFileSync('anonKeys.json') == "") {
    fs.writeFileSync('userLevels.json', '{ }');
  }
});
