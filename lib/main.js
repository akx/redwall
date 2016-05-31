const Promise = require('bluebird');

const fs = Promise.promisifyAll(require('fs'));
const jpeg = require('jpeg-js');
const path = require('path');
const prettySize = require('prettysize');
const sample = require('lodash/sample');
const slug = require('slug');
const {getImages} = require('./reddit');
const setWallpaper = require('./set-wallpaper');
const {downloadToLocalFile} = require('./download');
const {verifyImageDimensions} = require('./image');

function downloadAndVerifyImage(config, image) {
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
      const {width, height} = jpeg.decode(data);
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
    return downloadAndVerifyImage(config, image);
  }).then((localPath) => {
    console.log(`Setting wallpaper to ${path.basename(localPath)}`);
    return setWallpaper(localPath);
  });
}

module.exports.pickDownloadAndSetWallpaper = pickDownloadAndSetWallpaper;
