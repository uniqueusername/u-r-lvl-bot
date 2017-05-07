﻿// initialization

var Discord = require('discord.js');
var bot = new Discord.Client();
var fs = require('fs');
var beautify = require('json-beautify');

// global vars

var config;
var userLevels = {};
var userStats = {}; // timer, message count, message array
var itemShop = JSON.parse(fs.readFileSync('itemShop.json'));

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

  if (msg.content.includes("where is the cheeto nick")) {

    var userXP = JSON.parse(fs.readFileSync('userLevels.json'))[msg.author.id][0];
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
          name: msg.author.username,
        },
        description: xpMessages[getRandomInt(0, xpMessages.length)],
        thumbnail: { url: msg.author.avatarURL() },
        color: 0xffffff,
        fields: [
          {
            name: "Level",
            value: getLevelFromXP(userXP),
            inline: true
          },
          {
            name: "XP",
            value: userXP + " (next level at " + getXPFromLevel(getLevelFromXP(userXP) + 1) + ")",
            inline: true
          },
          {
            name: "Rank",
            value: userRank + "/" + userRanks.length,
            inline: true
          },
          {
            name: "Tokens",
            value: getTokensFromTotalXP(userLevels[msg.author.id][1]),
            inline: true
          }
        ],
        footer: { text: 'uniqueusername/u-r-lvl-bot' }
      }
    });

  }
});

// token shop
bot.on('message', msg => {

  if (msg.content.toLowerCase() == ('open shop')) {
    msg.channel.send("Check your DMs.");
    msg.author.send("```" +
      "Level 5:\n" +
      "1 - color change (random) [2 tokens]\n" +
      "\n" +
      "Level 20:\n" +
      "2 - color change (hex code) [15 tokens]" +
      "```"
    );
  }

  if (msg.content.toLowerCase().includes('purchase')) {
    if (itemShop[msg.content.toLowerCase().split(" ")[1]] != undefined) {
      var userLevels = JSON.parse(fs.readFileSync('userLevels.json'));
      let selectedItem = itemShop[msg.content.toLowerCase().split(" ")[1]];
      if (getLevelFromXP(userLevels[msg.author.id][0]) < selectedItem["level"]) {
        msg.channel.send("You don't meet the level requirement ``(" + selectedItem["level"] + ")`` for ``" + selectedItem["description"] + "``");
      } else if (getTokensFromTotalXP(userLevels[msg.author.id][1]) < selectedItem["cost"]) {
        msg.channel.send("You don't have enough tokens for ``" + selectedItem["description"] + "``");
      } else {
        userLevels[msg.author.id][1] -= selectedItem["cost"] * 1000;
        msg.channel.send("Item purchased.");
      }
    }
  };

});

// xp and token resetter
bot.on('message', msg => {
  if (msg.content.toLowerCase().includes('reset xp of') && msg.author.id == '83807335650164736') {
    var userToReset = msg.content.split(' ')[3];
    var userLevels = JSON.parse(fs.readFileSync('userLevels.json'));
    userLevels[msg.mentions.users.firstKey()][0] = 0;
    fs.writeFileSync('userLevels.json', JSON.stringify(userLevels), 'utf8');
  }
  if (msg.content.toLowerCase().includes('reset tokens of') && msg.author.id == '83807335650164736') {
    var userToReset = msg.content.split(' ')[3];
    var userLevels = JSON.parse(fs.readFileSync('userLevels.json'));
    userLevels[msg.mentions.users.firstKey()][1] = 0;
    fs.writeFileSync('userLevels.json', JSON.stringify(userLevels), 'utf8');
  }
})

// random int function
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max-min) + min);
}

// numerical sorting function
function sortNumber(a, b) {
  return a - b;
}

// calculate level from xp
function getLevelFromXP(xp) {
  return Math.floor(0.2 * Math.sqrt(xp));
}

// calculate xp from level
function getXPFromLevel(level) {
  return Math.floor(level*5*level*5);
}

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
