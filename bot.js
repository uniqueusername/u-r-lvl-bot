// initialization

var Discord = require('discord.js');
var bot = new Discord.Client();
var fs = require('fs');
var beautify = require('json-beautify');
var nunjucks = require('nunjucks');

nunjucks.configure({ autoescape: true, trimBlocks: true, lstripBlocks: true });

// global vars

var config;
var userLevels = {};
var userStats = {}; // timer, message count, message array
var itemShop = JSON.parse(fs.readFileSync('plugins/itemShop.json'));
var helpList = JSON.parse(fs.readFileSync('plugins/help.json'));

var xpMessages = ["i think this is slavery but you have ", "u fuck u got ", "when do i get my paycheck, because it better be more than ", "i really am not getting paid for this, can i have some of that juicy ", "u could buy a car with this dank af ", "idk what youre smoking but thats a thicc ", "the snail sleeps for ", "dad said he went to the store but i havent seen him since the fall of ", "you are now allowed to identify as this many genders: ", "bush did ", "where is the cheeto nick"];

// give xp per message
bot.on('message', msg => {

  if(msg.member.roles.filter(role => role.name !== ("STRIKE"))) {
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

  }
});

// check amount of xp
bot.on('message', msg => {
  xpChecker: { if (msg.content.toLowerCase() == ("where is the cheeto nick") || msg.content.startsWith("_rank")) {
    if (msg.content.split(" ").length == 2 && msg.mentions.users.firstKey() != undefined) {
      var userXP = JSON.parse(fs.readFileSync('userLevels.json'))[msg.mentions.users.firstKey()][0];
      var nameOfUser = msg.mentions.members.first().nickname;
      var userAvatar = msg.mentions.users.first().avatarURL();
      var userCheckID = msg.mentions.users.firstKey();
    } else if (msg.content.split(" ").length == 2 && msg.mentions.users.firstKey() == undefined) {
      msg.channel.send("Improper syntax! Make sure to mention the user properly. ``_rank @usertocheck#xxxx``");
      break xpChecker;
    } else {
      var userXP = JSON.parse(fs.readFileSync('userLevels.json'))[msg.author.id][0];
      var nameOfUser = msg.member.nickname;
      var userAvatar = msg.author.avatarURL();
      var userCheckID = msg.author.id;
    }

    var userRanks = []
    userLevels = JSON.parse(fs.readFileSync('userLevels.json'));

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
      if (userLevels[msg.author.id][1] >= amountToGift*1000) {
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
  console.log('u r lvl BOT rEEEEEEEEEEEEEEEEEEEEEEEEEEEE');

  if (!fs.existsSync('userLevels.json')) {
    fs.writeFileSync('userLevels.json', '{ }');
  } else if (fs.readFileSync('userLevels.json') == "") {
    fs.writeFileSync('userLevels.json', '{ }');
  }
});
