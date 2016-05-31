const Promise = require('bluebird');
const cache = require('./cache');
const config = require('./config');
const fetch = require('node-fetch');
const fs = Promise.promisifyAll(require('fs'));
const R = require('ramda');
const sample = require('lodash/sample');
const jpeg = require('jpeg-js');
const path = require('path');
const slug = require('slug');
const setOSXWallpaper = require('./set-osx-wallpaper');

fetch.Promise = Promise;

process.on("unhandledRejection", function (reason, promise) {
  throw reason;
});

function verifyImageDimensions(options, width, height) {
  const {minWidth, minHeight, minAspect, maxAspect} = options;
  if (minWidth && width < minWidth) return false;
  if (minHeight && height < minHeight) return false;
  const aspect = minWidth / minHeight;
  if (minAspect && aspect < minAspect) return false;
  if (maxAspect && aspect > maxAspect) return false;
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
      fileStream.on('finish', () => {
        resolve(localPath);
      });
    });
  });
}

function downloadAndVerifyImage(image) {
  const tempName = path.resolve(`./downloads/${slug(image.title)}.jpg`);
  return fetchToFile(image.url, tempName)
    .then((filename) => fs.readFileAsync(filename))
    .then((data) => {
      const {width, height} = jpeg.decode(data);
      console.log(tempName, width, height);
      if (!verifyImageDimensions(config.settings, width, height)) {
        throw new Error(`dimensions of image ${image.title} (${width}x${height}) are not accepted`);
      }
      return tempName;
    });
}

function pickDownloadAndSetWallpaper(config) {
  const subreddit = sample(config.subreddits);
  return getImages(subreddit, config.settings).then((images) => {
    const image = sample(images);
    console.log(`* subreddit: ${subreddit}`);
    console.log(`* title:     ${image.title}`);
    console.log(`* url:       ${image.url}`);
    return downloadAndVerifyImage(image);
  }).then((localPath) => {
    console.log(`Setting wallpaper to ${localPath}`);
    return setOSXWallpaper(localPath);
  });
}

function go() {
  return pickDownloadAndSetWallpaper(config).then(
    () => {
    },
    (err) => {
      console.log(err);
      console.log('oops, rejected. trying another.');
      return go();
    }
  );
}

go();
