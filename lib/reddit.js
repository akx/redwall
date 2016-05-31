const cache = require('./cache');
const rp = require('request-promise');
const image = require('./image');
const _ = require('lodash');

function getImages(subreddit, options = {}) {
  return cache.cached(
    subreddit,
    (() => {
      console.log(`+ Downloading ${subreddit}...`);
      return rp({
        uri: `https://reddit.com/r/${subreddit}.json`,
        json: true,
      });
    }),
    60 * 60 * 5
  ).then((j) => _.filter(
    _.map(j.data.children, 'data'),
    (item) => {
      if (!/^.+(jpeg|jpg)$/.test(item.url)) {
        return false;  // Not a JPEG
      }
      const res = /(\d{2,})\s*x\s*(\d{2,})/.exec(item.title);
      if (res) {
        const width = parseInt(res[1]);
        const height = parseInt(res[2]);
        return image.verifyImageDimensions(options, width, height);
      }
      return true;  // Unable to determine size, so fine.
    }
  ));
}

module.exports.getImages = getImages;
