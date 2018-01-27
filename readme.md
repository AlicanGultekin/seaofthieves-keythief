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

+ DEBUG (boolean) is optional, use if you want by pass key matching and post every new thread in the subreddit, by default it's false.

#### Slack

If Slack related variables are not used, results can still be seen on the console.
You can also extend the code with whatever notification method you want.

+ SLACK_URL (string) is a Slack webhook url

+ SLACK_CHANNEL (string) is the channel, person, etc.

More info here: [Slack Incoming Webhook API](https://api.slack.com/incoming-webhooks)

### Running :rocket:

+ ```npm start```

+ If you have [PM2](http://pm2.keymetrics.io/) then you can use ```npm run pm2start```

## TODO

+ Create a separate notification handler module with uniform interface so that people can add their choice of notifications easily

## Enjoy :bomb::boom::fire:
