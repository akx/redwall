const Promise = require('bluebird');

const cache = require('./cache');
const config = require('./config');
const fs = Promise.promisifyAll(require('fs'));
const jpeg = require('jpeg-js');
const path = require('path');
const R = require('ramda');
const rp = require('request-promise');
const prettySize = require('prettysize');
const sample = require('lodash/sample');
const slug = require('slug');
const setOSXWallpaper = require('./set-osx-wallpaper');

process.on("unhandledRejection", (reason) => {
  throw reason;
});

function verifyImageDimensions(options, width, height) {
  const {minWidth, minHeight, minAspect, maxAspect,} = options;
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
      return rp({
        uri: `https://reddit.com/r/${subreddit}.json`,
        json: true,
      });
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

function downloadToLocalFile(uri, localPath, respCallback = R.identity) {
  const req = rp({
    uri,
    encoding: null,
  });
  req.on('response', respCallback);
  return req.then((body) => fs.writeFileAsync(localPath, body)).then(() => localPath);
}

function downloadAndVerifyImage(image) {
  console.log(`* subreddit:   ${image.subreddit}`);
  console.log(`* title:       ${image.title}`);
  console.log(`* url:         ${image.url}`);
  const localPath = path.resolve(`./downloads/${slug(image.title)}.jpg`);
  try {
    if (fs.accessSync(localPath, fs.F_OK)) {  // Pre-existing file

      console.log(`* found:    ${localPath}`);
      return localPath;
    }
  } catch (e) {
    // didn't exist, okay
  }
  return downloadToLocalFile(image.url, localPath, (resp) => {
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      return;
    }
    const size = parseInt(resp.headers['content-length']);
    if (size) {
      console.log(`* size:        ${prettySize(size)}`);
    }
  })
    .then((filename) => fs.readFileAsync(filename))
    .then((data) => {
      console.log(`* downloaded:  ${localPath}`);
      const {width, height,} = jpeg.decode(data);
      if (!verifyImageDimensions(config.settings, width, height)) {
        throw new Error(`dimensions of image ${image.title} (${width}×${height}) are not accepted`);
      }
      return localPath;
    });
}

function pickDownloadAndSetWallpaper(config) {
  const subreddit = sample(config.subreddits);
  return getImages(subreddit, config.settings).then((images) => {
    const image = sample(images);
    image.subreddit = subreddit;
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
