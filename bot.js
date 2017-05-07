// initialization

var Discord = require('discord.js');
var bot = new Discord.Client();
var fs = require('fs');
var beautify = require('json-beautify');

// global vars

var config;
var userLevels = {};
var userStats = {}; // timer, message count, message array

var xpMessages = ["i think this is slavery but you have ", "u fuck u got ", "when do i get my paycheck, because it better be more than ", "i really am not getting paid for this, can i have some of that juicy ", "u could buy a car with this dank af ", "idk what youre smoking but thats a thicc ", "the snail sleeps for ", "dad said he went to the store but i havent seen him since the fall of ", "you are now allowed to identify as this many genders: ", "bush did ", "where is the cheeto nick"];

// give xp per message
bot.on('message', msg => {

  userLevels = JSON.parse(fs.readFileSync('userLevels.json'));
  let userLevelStats = userStats[msg.author.id];

  // add 15 xp per message
  /*if (userLevels[msg.author.id] === undefined) {
    userLevels[msg.author.id] = 15;
  } else if (userLevels[msg.author.id] !== undefined) {
    userLevels[msg.author.id] += 15;
  }*/

  // dynamically add xp based on amount of characters and message sent within a minute
  if (userLevels[msg.author.id] == undefined) {
    userLevels[msg.author.id] = 0;
  }
  if (userLevelStats == undefined) {
    userLevelStats = { "timerEnabled": false, "messageArray": [] };
    userStats[msg.author.id] = userLevelStats;
  }
  userLevelStats["messageArray"].push(msg.content); // push the message into the message array
  if (userLevelStats["timerEnabled"] === false) {
    const numCharacters = userLevelStats["messageArray"].join("").split(" ").join("").length // number of characters in message array without spaces
    const averageCharacters = Math.floor( numCharacters / userLevelStats["messageArray"].length);
    userLevels[msg.author.id] += averageCharacters // add character count / number of messages to user total xp
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
  var userXP = JSON.parse(fs.readFileSync('userLevels.json'))[msg.author.id]

  if (msg.content.includes("where is the cheeto nick")) {
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
            value: userXP,
            inline: true
          },
        ],
        footer: { text: 'uniqueusername/u-r-lvl-bot' }
      }
    });

  }
});

// xp resetter
bot.on('message', msg => {
  if (msg.content.includes('reset xp of') && msg.author.id == '83807335650164736') {
    var userToReset = msg.content.split(' ')[3];
    var userLevels = JSON.parse(fs.readFileSync('userLevels.json'));
    userLevels[msg.mentions.users.firstKey()] = 0;
    fs.writeFileSync('userLevels.json', JSON.stringify(userLevels), 'utf8');
  }
})

// random int function
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max-min) + min);
}

// calculate level from xp
function getLevelFromXP(xp) {
  return Math.floor(0.2 * Math.sqrt(xp));
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
