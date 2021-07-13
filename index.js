//required mods: filesystem, twitch and extralife
const fs = require('fs');
const tmi = require('tmi.js');
const extraLife = require('extra-life');

//ENV vars include your EL ID (from your profile page), twitch username (which doubles as the channel name) and donation link.
const extraLifeID = process.env.EXTRALIFE_ID;
const channel = process.env.TWITCH_USERNAME;
const donate_link = process.env.DONATE_LINK;

//Due to EL throwing 403's, we park it with a boolean until we can confirm connection
const extra_life_connected = false;

//instatiate and connect the twitch client
//Twilio has great getting started ,for getting the token, etc: https://www.twilio.com/blog/creating-twitch-chat-bots-with-node-js
const client = new tmi.Client({
  options: { debug: true },
  connection: {
    secure: true,
    reconnect: true
  },
  identity: {
    username: channel,
    password: process.env.TWITCH_OAUTH_TOKEN
  },
  channels: [channel]
});

//known bots and admins
const known_bots = ["anotherttvviewer","commanderroot","streamlabs","joshbirk"];


//chat related vars follow.  
var said_hello = false;

var fires = 0;
var goodideas = 0;
var badideas = 0;
var heatherdeaths = 0;
var woots = 0;
var blames = 0;
var yeets = 0;

//persistent stats are held in a JSON config file.
var alltimestats = null;
if (fs.existsSync('.stats')){
  var stats = fs.readFileSync('.stats');
  alltimestats = JSON.parse(stats);
  console.log(alltimestats.fires);
} else {
  alltimestats = {
    fires: fires,
    woots: woots,
    yeets: yeets,
    blames: blames,
    heatherdeaths: heatherdeaths
  }
  writeAllTimeStats();
}

//set the actual .stats file.
function writeAllTimeStats() {
  fs.writeFile(".stats", '{"fires":"'+alltimestats.fires+'","heatherdeaths":"'+alltimestats.heatherdeaths+'","yeets":"'+alltimestats.yeets+'","blames":"'+alltimestats.blames+'","woots":"'+alltimestats.woots+'"}', function(err) {
    if(err) {
        return console.log(err);
    } else {
        return console.log("All Time Stats set")
    }
  });
}

//the idea here was to keep duplicate votes (two people voting on the same event) from counting.
//might remove it later, not sure it's actually being useful
var fire_cooldown = false;
var idea_cooldown = false;
var heather_cooldown = false;

//placeholder object for the most recent donation
var last_donation = {};

//Stolen from zen-compiler.  Practically an easter egg, but handy for testing.
var wait_phrases1 = ["Brooks are babbling","Blaze your own trail","Leaves are rustling","A cool breeze blows","Somewhere there is a rainbow","It is likely a puppy got adopted today","Somewhere, the skies are blue","Today is not a good day to die"];
var wait_phrases2 = ["Live the life you have imagined.","A mountain sighs","Changing the polarity","The tree that bends survives the storm","Take a deep breath","Every morning, a fresh dew on the leaf","Pixels can make true art","Mistakes are part of learning","Errors do not define you"];
var wait_phrases3 = ["Go confidently in the direction of your dreams.","Take a moment, this API is...","Taking the next star to the right","A river flows into the ocean","Could use a sonic screwdriver","The sun will always shine again","We left footprints on the moon","Tomorrow is the first day of the rest of your life","Shy from danger, not the fight","To err is human"];

//the three arrays are just to keep them more human readable.  Here we just join them together.
var all_phrases = [];
for(var x = 0; x < wait_phrases1.length; x++) {
  all_phrases.push(wait_phrases1[x]);
}
for(var x = 0; x < wait_phrases2.length; x++) {
  all_phrases.push(wait_phrases2[x]);
}
for(var x = 0; x < wait_phrases3.length; x++) {
  all_phrases.push(wait_phrases3[x]);
}

//randomly return a phrase
function getWaitPhrase() {
    return all_phrases[Math.floor(Math.random()*all_phrases.length)];
  }



//Update this manually as the seasons change. Might create an API CLI utility to auto-update/move this to a config instead.
var land_locations = ["CORAL CASTLE","CATTY CORNER","CORNY COMPLEX","CRAGGY CLIFFS","DIRTY DOCKS","HOLLY HATCHERY","LAZY LAKE","MISTY MEADOWS","STEALTHY STRONGHOLD","PLEASANT PARK","SLURPY SWAMP","BONEY BURBS","BELIEVER BEACH","WEEPING WOODS","WEIRD ALIEN AREA","SKI LODGE"];

//randomly return a location
function getLandingSpot() {
    return land_locations[Math.floor(Math.random()*land_locations.length)];
}

//so the goal here was to give the audience the chance if the squad is doing a good idea or a bad one.
//it's almost always a bad idea so this was more of an exercise in a timed vote than functionality people use.
function startIdeaCooldown() {
    idea_cooldown = true;
    setTimeout(function() {
        idea_cooldown = false;
        var isitgood = goodideas > badideas;
        var vote_result = "bad";
        if(isitgood) { vote_result = "good"; }
        client.say(channel, `@Hi! With a vote of ${goodideas} to ${badideas}, it looks like this is a ${vote_result} idea.  Good luck, crew!`);
        goodideas = 0;
        badideas = 0;
    }, 10000);
}

//Extra Life API code


//Post EL API connection, we make calls to get recent donors, after the first we get here where GITS says hi
//Then we start doing the timed call to keep checking for a more recent donor.
//But if res is null that means EL tossed a 403 at us and then we don't keep knocking the server's door.
function formatResponse(res) {
  var r = 'Hi! I am the GITSBot1000.  If you are seeing this the match is about to start.  I can keep track of various stats during the game if you help me. Chat "!help" to see my commands.';
  if(res) {
    extra_life_connected = true;
    r += '\n\nA reminder that we are gaming for Extra Life! Here are the most recent donations!  Thanks to all our donors!\n\n';
    for(var i = 0; i < res.totalRecords; i++) {
        r += `${res.records[i].title}: \$${res.records[i].amount}`;
        if(res.records[i].message != null) {r += `  "${res.records[i].message}"`;}
        r += '\n';
      }
      client.say(channel,r);
      if(res.totalRecords > 0) {last_donation = res.records[0];}
      setTimeout(getLastDonation,75000);
  } else { 
    client.say(channel,r);
  }
}

//Call for the most recent donor
function getLastDonation() {
  extraLife.getParticipantActivity(extraLifeID).then(checkLastDonation, function(error) {
    console.log(error);
  });
}

//Check the most recent against our last known.  If it's new - ka-ching.
function checkLastDonation(res) {
  if(res.totalRecords == 0) {setTimeout(getLastDonation,75000);}
  else {
    if(res.records[0].createdDateUTC != last_donation.createdDateUTC) {
        var r = 'We have had a new donation!\n';
        r += `${res.records[0].title}: \$${res.records[0].amount}`;
        if(res.records[0].message != null) {r += `  "${res.records[0].message}"`;}
        r += `\n`;
        r += `Thank you, ${res.records[0].title}!  Kids can't wait.`;
        last_donation = res.records[0];
        client.say(channel,r);
    }
    setTimeout(getLastDonation,75000);
  }
}



//TMI (Twitch client) is event based.
//*join* is when the client connects to the channel.  Note that the client likes to drop and re-connect.  
//*message* is when someone (including the bot) messages in chat 
client.on("join", function (channel, username, self) 
	{
		console.log(username + " has entered " + channel);
    if(!self && !known_bots.includes(username)) {
      client.say(channel,`@Welcome to the chat ${username}. I am GITSbot. We are playing for Extra Life.  Type !donate to see the donation link. Try !help to see my commands. Enjoy the show!`);    
    }
    if(!said_hello) {
            said_hello = true;
            extraLife.getParticipantActivity(extraLifeID).then(formatResponse, function(error) {
              console.log("Never got to ExtraLife");
              formatResponse(null);
              console.log(error);
            });
        } else {
            if(Math.random() == 0.1) {client.say(channel,'We hope you are enjoying the game.  Type !donate to see the donation link. Try !help to see my commands.');}
        }
  });
    

//Listen for messages and respond
client.on('message', (channel, tags, message, self) => {
  // Ignore echoed messages.
  if(self) return;
  console.log(tags);
  var m = message.toLowerCase();

  if(m.indexOf(" ") > 0) { m = m.split(" ")[0]; }

  var r = null;

  console.log(m);

  if(m == '!help') {
    r = `@${tags.username}, Hi! try: !help !hello !donate !land ("place") !fire !blame !woot !goodidea !badidea !calcidea !hdead|!heatherdead|!heatherdeath !thank|!thanks !stats !allstats !zen !luv`;
  }

  if(m === '!hello') {
    r = `@${tags.username}, great seeing you today.  Try !help to see my commands.  Here is a zen phrase for you: ${getWaitPhrase()}`;
  }

  if(m === '!donate') {
    r = `@${tags.username}, Hi!  The link to donate is ${donate_link} #kidscantwait.`;
    if(extra_life_connected) {
        r += `The last donation was ${last_donation.title}: \$${last_donation.amount}`;
      if(last_donation.message != null) {r += `  "${last_donation.message}"`;}
    }
  }

  if(m === '!land') {
    console.log(m);
    var l = message.replace("!land","");
    console.log(l);
    if(l.length > 1) {
        r = `@${tags.username}, Hi!  It looks like you are suggesting the crew lands at${l}.`;
    } else {
        l = getLandingSpot();
        r = `@${tags.username}, Hi!  That looks like a request for a random land location. My satellites have huddled together and recommend ${l}.`;
    }
    
  }

  if(m === '!fire') {
    if(fire_cooldown) { r = `@${tags.username}, Hi!  The last fire was reported less than five seconds ago.  This might be a double report.`;}
    else {
        fires++;
        alltimestats.fires++;
        r = `@${tags.username}, Hi!  Looks like the crew set something on fire.  Probably Slychika. According to the audience the crew has exploded or set ${fires} thing(s) on fire.`;
        fire_cooldown = true;
        writeAllTimeStats();
        setTimeout(function() {
            fire_cooldown = false;
        }, 5000);
    }
  }
  
  if(m === '!blame') {
    blames++;
    alltimestats.blames++;
    r = `@${tags.username}, Hi!  After crunching the numbers and doing a lot of really hard math - it looks like Reid was to blame.  He has been blamed ${blames} time(s).  This vote has no cooldown.`;
    writeAllTimeStats();
  }

  if(m === '!woot') {
    woots++;
    alltimestats.woots++;
    r = `@${tags.username}, Hi!  Woot added! The crew has earned ${woots} woot(s).  This vote has no cooldown.`;
    writeAllTimeStats();
  }

  if(m === '!yeet') {
    yeets++;
    alltimestats.yeets++;
    r = `@${tags.username}, Hi!  Yeet added! Someone, probably Reid, has yeeted ${yeets} player(s) so far.  This vote has no cooldown.`;
    writeAllTimeStats();
  }

  if(m === '!calcidea') {
    var isitgood = Math.random() > 0.7;
    var idea = "good";
    if(!isitgood) {idea = "bad"; badideas++;}
    else{goodideas++;}
    r = `@${tags.username}, Hi!  I have calculated all the odds and this is probably a ${idea} idea.`;
    if(!idea_cooldown) { startIdeaCooldown(); r += 'An idea vote has started.  Outcome determined in 10 seconds. I can submit multiple calculations.' }
  }

  if(m === '!goodidea') {
    goodideas++;
    r = `@${tags.username}, Hi!  I have you as voting that this is a good idea.`;
    if(!idea_cooldown) { startIdeaCooldown(); r += 'An idea vote has started.  Outcome determined in 10 seconds. You may vote several times.' }
  }

  if(m === '!badidea') {
    badideas++;
    r = `@${tags.username}, Hi!  I have you as voting that this is a bad idea.`;
    if(!idea_cooldown) { startIdeaCooldown(); r += 'An idea vote has started.  Outcome determined in 10 seconds. You may vote several times.' }
}

  if(m === '!hdead' || m === '!heatherdead' || m === '!heatherdeath') {
    if(heather_cooldown) { r = `@${tags.username}, Hi!  The last heather level death was reported less than five seconds ago.  This might be a double report.`;}
    else {
        heatherdeaths++;
        alltimestats.heatherdeaths++;
        r = `@${tags.username}, Hi! Thank you for reporting a heather level death.  There have been ${heatherdeaths} so far.`;
        heather_cooldown = true;
        setTimeout(function() {
            heather_cooldown = false;
        }, 5000);
    }
    writeAllTimeStats();
  }

  if(m === '!thank' || m === '!thanks') {
    r = `Crew, if you are reading this: @${tags.username} has requested that you thank the bus driver.`;
  }

  if(m === '!stats') {
    r = `@${tags.username}, Hi!  The crew has earned ${woots} woot(s), yeeted ${yeets} players, set ${fires} fire(s), died ${heatherdeaths} heather death(s) and blamed Reid ${blames} time(s).`;
  }

  if(m === '!allstats') {
    r = `@${tags.username}, Hi!  Since time immemorial: The crew has earned ${alltimestats.woots} woot(s), yeeted ${alltimestats.yeets} players, set ${alltimestats.fires} fire(s), died ${alltimestats.heatherdeaths} heather death(s) and blamed Reid ${alltimestats.blames} time(s).`;
  }

  if(m === '!zen') {
    r = `@${tags.username}, Hi!  Here is your zen moment: `+getWaitPhrase();
  }

  if(m === '!luv') {
    r = `@Awww thanks ${tags.username}!, We luv you too`;
  }

  if(r != null) {
    client.say(channel, r);
  }
});





//connect the client and start the show
client.connect().catch(console.error);


//all of this code fot GITSbot1000 so say goodbye.  So dramatic.
//TLDR it hangs the process to keep it open and then catches all possible exit events.
process.stdin.resume();//so the program will not close instantly

function exitHandler(options, exitCode) {
    client.say(channel,'GITSbot1000 signing off.  Thanks for watching.  GG everyone!');
    
    if (options.cleanup) console.log('clean');
    if (exitCode || exitCode === 0) console.log(exitCode);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));