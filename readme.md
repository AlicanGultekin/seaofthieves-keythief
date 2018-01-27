# Keythief :skull:

## Scans for Sea of Thieves closed beta keys :key:

### Installation :computer:

```
git clone https://github.com/Vitaefinis/seaofthieves-keythief.git
cd seaofthieves-keythief
npm i
```

### Setup :wrench:

+ Rename .env.example file to .env and edit the variables inside

+ SUBREDDIT (string) is the subreddit you want to scan, by default it's seaofthieves

+ INTERVAL (number) is the time that should pass between each parse attempt, by default it's 10 seconds

+ PROXY (string) is optional, use if you are running this behind a proxy

+ DEBUG (boolean) is optional, use if you want to bypass key matching and post every new thread in the subreddit, by default it's false.

#### Twitter

+ TWITTER_CONSUMER_KEY (string) is optional, specify if you want to query Twitter
 
+ TWITTER_CONSUMER_SECRET (string) is optional, specify if you want to query Twitter

+ TWITTER_HASHTAG (string) is optional, specifiy hashtag to query, by default it's #seaofthieves

You can get your key and secret by creating an app here: [Twitter Apps](https://apps.twitter.com)

#### Slack

If Slack related variables are not used, results can still be seen on the console.
You can also extend the code with whatever notification method you want.

+ SLACK_URL (string) is a Slack webhook url

+ SLACK_CHANNEL (string) is the channel, person, etc.

More info here [Slack Incoming Webhook API](https://api.slack.com/incoming-webhooks)

#### Discord

If you want to post to Discord instead of Slack, just add /slack at the end of your Discord webhook url, you'll still need to use SLACK_URL for this.
More information here [Discord Webhook API](https://discordapp.com/developers/docs/resources/webhook#execute-slackcompatible-webhook)

#### Twitch
+ TWITCH_KEY (string) get it from here [Twitch Chat OAuth Password Generator](http://twitchapps.com/tmi/)
+ TWITCH_CHANNEL (string) name of your channel the bot should connect to

### Running :rocket:

+ ```npm start```

+ If you have [PM2](http://pm2.keymetrics.io/) then you can use ```npm run pm2start```

## TODO

+ Refactor
+ Create a separate notification handler module with uniform interface so that people can add their choice of notifications easily, for e.g.: Discord, Telegram, Slack, Twitter, etc.
+ Create separate parsers for Reddit, Twitter, Instagram etc.

## Enjoy :bomb::boom::fire:
