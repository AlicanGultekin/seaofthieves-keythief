const {
  SUBREDDIT,
  SLACK_URL,
  SLACK_CHANNEL,
  INTERVAL,
  PROXY,
  DEBUG,
} = require('./config');
const request = PROXY ? require('request-promise').defaults({ proxy: PROXY }) : require('request-promise');
const jsonpath = require('jsonpath');
const winston = require('winston');
const NodeCache = require('node-cache');

const threadCache = new NodeCache();
const subreddit = SUBREDDIT || 'seaofthieves';
const interval = INTERVAL || 10000;
const keyRegex = /[^-]{5}-[^-]{5}-[^-]{5}-[^-]{5}-[^-]{5}/g;

let count = 0;

async function getNewPostsInSubreddit(subredditName = subreddit) {
  if (!subredditName) {
    throw new Error('Missing subreddit name');
  }

  return request(`https://www.reddit.com/r/${subredditName}/new.json?sort=new`);
}

async function parseNewPosts(newPosts) {
  if (!newPosts) {
    throw new Error('Missing new posts from subreddit!\nPass results from getNewPostsInSubreddit function.');
  }

  return jsonpath.query(JSON.parse(newPosts), '$.data.children[*].data');
}

async function findKey(parsedNewPosts) {
  if (!parsedNewPosts) {
    throw new Error('Missing parsed new posts!\nPass results from parseNewPosts function');
  }

  const results = parsedNewPosts.map((newPost) => {
    let result = null;
    try {
      // eslint-disable-next-line eqeqeq
      if ((newPost.selftext.match(keyRegex) || DEBUG == 'true') && !threadCache.get(newPost.id)) {
        result = {
          id: newPost.id,
          title: newPost.title,
          body: newPost.selftext,
          url: newPost.url,
          comment: `https://www.reddit.com${newPost.permalink}`,
        };
        winston.info('Match found!');
      }
    } catch (error) {
      winston.error(error);
    }
    return result;
  });
  return results;
}

async function postToSlack(data, url = SLACK_URL, channel = SLACK_CHANNEL) {
  if (!url) {
    throw new Error('No SLACK_URL defined in .env');
  }
  if (!data) {
    throw new Error('Missing data!\nPass an object { url, title, body } to be posted to Slack.');
  }

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
        text: data.body,
        short: false,
      },
    ],
  };

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
}

/* eslint-disable no-plusplus */
async function postResults(keys) {
  if (!keys) {
    throw new Error('Missing keys!\nPass results from findKey function');
  }

  winston.info(`Parse Attempt #${++count} [${Date().toString()}]`);
  for (let index = 0; index < keys.length; index++) {
    const element = keys[index];
    if (element) {
      threadCache.set(element.id, true);
      winston.info(JSON.stringify(element, null, 4));
      postToSlack(element);
    }
  }
}
/* eslint-enable no-plusplus */

async function huntKeys() {
  const newPostsInSubreddit = await getNewPostsInSubreddit();
  const parsedNewPosts = await parseNewPosts(newPostsInSubreddit);
  const keys = await findKey(parsedNewPosts);
  postResults(keys);
}

huntKeys();
// eslint-disable-next-line no-unused-vars, prefer-const
let timer = setInterval(huntKeys, interval);
