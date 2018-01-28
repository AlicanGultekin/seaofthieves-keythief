const {
  SUBREDDIT,
  SLACK_URL,
  SLACK_CHANNEL,
  TWITTER_CONSUMER_KEY,
  TWITTER_CONSUMER_SECRET,
  TWITTER_HASHTAG,
  TWITCH_KEY,
  TWITCH_BOT_NAME,
  TWITCH_CHANNEL,
  INTERVAL,
  KEY_ONLY,
  PROXY,
  DEBUG,
} = require('./config');

const request = PROXY ? require('request-promise').defaults({ proxy: PROXY }) : require('request-promise');
const jsonpath = require('jsonpath');
const winston = require('winston');
const NodeCache = require('node-cache');
const urlencode = require('urlencode');
const TwitchBot = require('twitch-bot');
const crypto = require('crypto');

const threadCache = new NodeCache();
const subreddit = SUBREDDIT || 'seaofthieves';
const twitterHashtag = TWITTER_HASHTAG || '#seaofthieves';
const interval = INTERVAL || 10000;
const keyRegex = /([^-]{5}-[^-]{5}-[^-]{5}-[^-]{5}-[^-]{5})/gi;
const keyMentionRegex = /(giveaway|code|token|key)/gi;
const twitterBase64 = (Buffer.from(`${TWITTER_CONSUMER_KEY}:${TWITTER_CONSUMER_SECRET}`, 'ascii')).toString('base64');

let twitterToken = '';
let twitchBot;

if (TWITCH_KEY && TWITCH_CHANNEL) {
  winston.info(TWITCH_BOT_NAME, TWITCH_CHANNEL, TWITCH_KEY);
  twitchBot = new TwitchBot({
    username: TWITCH_BOT_NAME || 'Key Thief',
    oauth: TWITCH_KEY,
    channels: [TWITCH_CHANNEL],
  });

  twitchBot.on('join', () => {
    const joinMessage = 'R) Arada bir Sea of Thieves kapalı beta kodu dağıtıyorum. Eğer kod attığımda içinde ? varsa orayı kendiniz A-Z 0-9 deneyeceksiniz. Kodlar tamamen rasgele düşer, belirli bir zamanı yoktur.';
    twitchBot.say(joinMessage);
    winston.info(`${TWITCH_BOT_NAME} joined ${TWITCH_CHANNEL}.`);
  });

  twitchBot.on('part', () => {
    winston.info(`${TWITCH_BOT_NAME} left ${TWITCH_CHANNEL}.`);
    // twitchBot.join(TWITCH_CHANNEL);
  });

  twitchBot.on('error', (err) => {
    winston.error(err);
  });

  twitchBot.join(TWITCH_CHANNEL);
}

function hash(input) {
  if (!input) {
    throw new Error('Missing input for hash!');
  }

  try {
    return crypto.createHash('md5').update(input).digest('hex');
  } catch (error) {
    winston.error(error);
    return null;
  }
}

function removeDuplicatesFromArray(arr) {
  return arr.filter((elem, index, self) => index === self.indexOf(elem));
}

async function getTwitterToken(keyAndSecretBase64 = twitterBase64) {
  if (!keyAndSecretBase64) {
    throw new Error('Missing Twitter consumer & key base64');
  }

  try {
    const requestOptions = {
      headers: { Authorization: `Basic ${keyAndSecretBase64}` },
      method: 'POST',
      uri: 'https://api.twitter.com/oauth2/token?grant_type=client_credentials',
      json: true,
    };

    return request(requestOptions);
  } catch (error) {
    winston.error(error);
    return null;
  }
}

async function getPostsInHashtag(hashtag = twitterHashtag, token = twitterToken) {
  if (!hashtag) {
    throw new Error('Missing Twitter hashtag');
  }
  if (!token) {
    throw new Error('Missing Twitter token');
  }

  try {
    const requestOptions = {
      headers: { Authorization: `Bearer ${token}` },
      method: 'GET',
      uri: `https://api.twitter.com/1.1/search/tweets.json?q=${urlencode(hashtag)}`,
      json: true,
    };

    return request(requestOptions);
  } catch (error) {
    winston.error(error);
    return null;
  }
}

async function parseTwitterPosts(posts) {
  if (!posts) {
    throw new Error('Missing posts from hashtag!\nPass results from getPostsInHashtag function');
  }

  try {
    return jsonpath.query(posts, '$.statuses[*]');
  } catch (error) {
    winston.error(error);
    return null;
  }
}

async function findKeysFromTwitter(parsedPosts) {
  if (!parsedPosts) {
    throw new Error('Missing parsed posts from hashtag!\nPass results from parseTwitterPosts function');
  }

  try {
    const results = parsedPosts.map((post) => {
      let result = null;
      try {
        const keyRegexMatches = post.text.match(keyRegex);
        let keyMentionRegexMatches = null;

        // eslint-disable-next-line eqeqeq
        if (!KEY_ONLY == true) {
          keyMentionRegexMatches = post.text.match(keyMentionRegex);
          if (keyMentionRegexMatches) keyMentionRegexMatches = removeDuplicatesFromArray(keyMentionRegexMatches);
        }

        // eslint-disable-next-line eqeqeq
        if ((keyRegexMatches || keyMentionRegexMatches || DEBUG == true) && threadCache.get(post.id_str) !== hash(post.text)) {
          result = {
            id: post.id_str,
            body: `${post.text}`,
            mentions: keyMentionRegexMatches,
            keys: keyRegexMatches,
            url: `https://twitter.com/statuses/${post.id_str}`,
          };
          winston.info('Match found!');
        }
      } catch (error) {
        winston.error(error);
        return null;
      }
      return result;
    });
    return results;
  } catch (error) {
    winston.error(error);
    return null;
  }
}

async function getNewPostsInSubreddit(subredditName = subreddit) {
  if (!subredditName) {
    throw new Error('Missing subreddit name');
  }
  try {
    return request(`https://www.reddit.com/r/${subredditName}/new.json?sort=new`);
  } catch (error) {
    winston.error(error);
    return null;
  }
}

async function parseNewPosts(newPosts) {
  if (!newPosts) {
    throw new Error('Missing new posts from subreddit!\nPass results from getNewPostsInSubreddit function.');
  }

  try {
    return jsonpath.query(JSON.parse(newPosts), '$.data.children[*].data');
  } catch (error) {
    winston.error(error);
    return null;
  }
}

async function findKeys(parsedNewPosts) {
  if (!parsedNewPosts) {
    throw new Error('Missing parsed new posts!\nPass results from parseNewPosts function');
  }

  try {
    const results = parsedNewPosts.map((newPost) => {
      let result = null;
      try {
        const keyRegexMatches = newPost.selftext.match(keyRegex);
        /* let keyMentionRegexMatches = newPost.selftext.match(keyMentionRegex);
        if (keyMentionRegexMatches) keyMentionRegexMatches = removeDuplicatesFromArray(keyMentionRegexMatches); */

        // eslint-disable-next-line eqeqeq
        if ((keyRegexMatches /* || keyMentionRegexMatches */ || DEBUG == 'true') && threadCache.get(newPost.id) !== hash(newPost.selftext)) {
          result = {
            id: newPost.id,
            title: newPost.title,
            body: newPost.selftext,
            keys: keyRegexMatches,
            // mentions: keyMentionRegexMatches,
            url: newPost.url,
            permalink: `https://www.reddit.com${newPost.permalink}`,
          };
          winston.info('Match found!');
        }
      } catch (error) {
        winston.error(error);
      }
      return result;
    });
    return results;
  } catch (error) {
    winston.error(error);
    return null;
  }
}

async function postToSlack(data, url = SLACK_URL, channel = SLACK_CHANNEL) {
  if (!url) {
    throw new Error('No SLACK_URL defined in .env');
  }
  if (!data) {
    throw new Error('Missing data!\nPass an object { url, title, body } to be posted to Slack.');
  }

  const discordCompatibleMode = url.includes('discord');

  try {
    const body = {
      username: 'Key Thief',
      icon_emoji: ':old_key:',
      attachments: [
        {
          fallback: data.url,
          // pretext: data.title,
          color: '#000000',
          title_link: data.url,
          title: data.title,
          text: discordCompatibleMode ? `${data.body}\n\n:link: ${data.url}` : data.body,
          short: false,
        },
      ],
    };

    if (data.keys) {
      body.attachments[0].text = `@here \n:key: Keys:\n${data.keys.join('\n')}\n\n:pencil: ${body.attachments[0].text}`;
    }

    if (data.mentions) {
      body.attachments[0].text = `:mag_right: Mentioned keywords: ${data.mentions.join(', ')}\n\n:pencil: ${body.attachments[0].text}`;
    }

    if (channel) {
      body.channel = channel;
    }

    const requestOptions = {
      body,
      method: 'POST',
      uri: url,
      json: true,
    };

    return request(requestOptions);
  } catch (error) {
    winston.error(error);
    return null;
  }
}

async function sendKeysToTwitchChat(data) {
  if (data.keys) {
    twitchBot.say('R) Bu closed beta keyler taze düştü, ? varsa orayı kendiniz A-Z 0-9 deneyeceksiniz');
    data.keys.map(key => twitchBot.say(key));
  }
  if (data.mentions) {
    twitchBot.say(`R) Şu kelimelerden bahsedilmiş: ${data.mentions.join(', ')} `);
    twitchBot.say(data.body);
    twitchBot.say(data.url);
  }
}

async function postResults(keys) {
  if (!keys) {
    throw new Error('Missing keys!\n');
  }

  try {
    // eslint-disable-next-line no-plusplus
    for (let index = 0; index < keys.length; index++) {
      const element = keys[index];
      if (element) {
        threadCache.set(element.id, hash(element.body));
        winston.info(JSON.stringify(element, null, 4));
        if (SLACK_URL) postToSlack(element);
        if (TWITCH_CHANNEL && TWITCH_KEY) sendKeysToTwitchChat(element);
      }
    }
  } catch (error) {
    winston.error(error);
  }
}

async function huntKeysOnReddit() {
  try {
    let result = null;

    if (SUBREDDIT) {
      const newPostsInSubreddit = await getNewPostsInSubreddit();
      const parsedNewPosts = await parseNewPosts(newPostsInSubreddit);
      const keysFromReddit = await findKeys(parsedNewPosts);
      result = keysFromReddit;
    }

    return result;
  } catch (error) {
    winston.error(error);
    return null;
  }
}

async function huntKeysOnTwitter() {
  try {
    let result = null;

    if (TWITTER_CONSUMER_KEY && TWITTER_CONSUMER_SECRET) {
      twitterToken = await getTwitterToken();
      twitterToken = twitterToken.access_token;
      const postsInHashtag = await getPostsInHashtag();
      const parsedPostsFromHashtag = await parseTwitterPosts(postsInHashtag);
      const keysFromTwitter = await findKeysFromTwitter(parsedPostsFromHashtag);
      result = keysFromTwitter;
    }

    return result;
  } catch (error) {
    winston.error(error);
    return null;
  }
}

async function huntKeys() {
  try {
    // eslint-disable-next-line no-plusplus
    winston.info(`Parse Attempt [${Date().toString()}]`);

    const keysFromTwitter = await huntKeysOnTwitter();
    if (keysFromTwitter) postResults(keysFromTwitter);

    const keysFromReddit = await huntKeysOnReddit();
    if (keysFromReddit) postResults(keysFromReddit);
  } catch (error) {
    winston.error(error);
  }
}

huntKeys();
// eslint-disable-next-line no-unused-vars, prefer-const
let timer = setInterval(huntKeys, interval);
