const Promise = require('bluebird');
const cache = require('./cache');
const config = require('./config');
const fetch = require('node-fetch');
const fs = Promise.promisifyAll(require('fs'));
const R = require('ramda');
const sample = require('lodash/sample');
const jpeg = require('jpeg-js');
const slug = require('slug');
const setOSXWallpaper = require('./set-osx-wallpaper');

function verifyImageDimensions(options, width, height) {
  const {minWidth, minHeight, landscapeOnly} = options;
  if (minWidth && width < minWidth) return false;
  if (minHeight && height < minHeight) return false;
  if (landscapeOnly && (width < height)) return false;
  return true;
}


function getImages(subreddit, options = {}) {
  return cache.cached(
    subreddit,
    (() => {
      console.log(`+ Downloading ${subreddit}...`);
      return fetch(`https://reddit.com/r/${subreddit}.json`).then((r) => r.json());
    }),
    60 * 60 * 5
  ).then(R.pipe(
    (j) => j.data.children,
    R.pluck('data'),
    R.filter((item) => /^.+(jpeg|jpg)$/.test(item.url)),
    R.filter((item) => {
      const res = /(\d{2,})\s*x\s*(\d{2,})/.exec(item.title);
      if (res) {
        const width = parseInt(res[1]);
        const height = parseInt(res[2]);
        return verifyImageDimensions(options, width, height);
      }
      return true;
    })
  ));
}

function fetchToFile(url, localPath) {
  return fetch(url).then((resp) => {
    const fileStream = fs.createWriteStream(localPath);
    resp.body.pipe(fileStream);
    return new Promise((resolve) => {
      console.log(resp.body);
      resp.body.on('end', () => resolve(fileStream));
    });
  });
}

function downloadAndVerifyImage(image) {
  console.log(`~ Downloading ${image.title} (${image.url})...`);
  const tempName = `rw-${+new Date()}-${slug(image.title)}.jpg`;
  return fetchToFile(image.url, tempName).then(() => {
    return fs.readFileAsync(tempName).then((data) => {
      const {width, height} = jpeg.decode(data);
      if (!verifyImageDimensions(config.settings, width, height)) {
        throw new Error(`dimensions of image ${image.title} (${width}x${height}) are not accepted`);
      }
      return tempName;
    })
  });
}

const subreddit = sample(config.subreddits);

getImages(subreddit, config.settings).then((images) => {
  const image = sample(images);
  return downloadAndVerifyImage(image);
}).then((localPath) => {
  setOSXWallpaper(localPath);
});
