# GITSbot

## About
A chatbot for the Gaming In Interesting Times Fortnite stream: <http://twitch.tv/joshbirk>

The stream usually airs every Thursday, 5PM CST for about 1-2 hours.

GITSbot welcomes new viewers, provides links and updates on donations to Extra Life (when possible) and tracks stats on various things being reported on the stream.

### Commands
  * !help: displays this list
  * !hello: prompts a greeting from GITSbot
  * !donate: displays the donation link to Extra Life, and if Extra Life is connected - the last donation
  * !land ("place"): picks a random location for the squad to land or recommends one if "place" is included
  * !fire: reports a fire
  * !blame: determines who was to blame and reports it
  * !woot: reports a woot worthy moment
  * !goodidea: votes that it was a good idea
  * !badidea: votes that it was a bad idea
  * !calcidea: initiates an idea vote
  * !hdead|!heatherdead|!heatherdeath: reports a Heather level death (cannot be revived in any way)
  * !thank|!thanks: reminder to thanks the bus driver
  * !stats: display stats reported during the current match
  * !allstats: display stats across matches 
  * !zen: provides a random zen joke
  * !luv: prompts a luv response

### Extra Life connection
GITSbot will add the latest donations to its original greeting, report the very last one with !donate and also tell the chat if a new donation has come through.

Or it would do any of that if Cloudfare hadn't started randomly responding to EL chatbots with 403 errors.  No resolution currently for that.  Our polling is only every 75 seconds and Cloudflare also started blocking curl tests, so I guess it just hates CLI.

### Custom GIF server

There is a [companion app](https://github.com/joshbirk/gitsgifs) which serves up GIFs to a web socket enabled client for displaying custom reactions to the report commands.

###Setup and running

If you want to clone and run a version of gitsbot yourself, it's fairly easy to setup.  It runs locally or could be setup as a Heroku instance or the like.  Once you have the code and node setup, you'll need the following environment variables:

* process.env.EXTRALIFE\_ID: For creating the API calls to Extra Life
* process.env.TWITCH\_USERNAME: The channel/user that GITSbot will sign into
* process.env.HANDSHAKE\_TOKEN: This has to be the same variable set on gitsgifs for custom GIFs to appear
* process.env.DONATE\_LINK: Link for people to donate
* process.env.TWITCH\_OAUTH\_TOKEN: The bot's authentication info



To get that authentication token, Twilio has a [great tutorial]( https://www.twilio.com/blog/creating-twitch-chat-bots-with-node-js).

Once you have that set, go to the directory you have the code and:

>npm install

To download the dependencies.  After that it is:

>node index


GITSbot will sign in, say hello, and monitor the chat.  To sign out, just kill the process (Control-C on OSX, for instance).  GITSbot does catch when the process ends and will politely say goodbye before shutting down.  So Midwestern.

You might also check out GITSbot's sibling, [llamadramabot](https://github.com/dancinllama/llamadramabot).

Have fun and don't forget to thank the bus driver!


  