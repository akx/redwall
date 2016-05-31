const Promise = require('bluebird');
const fs = require('fs');
const readFileAsync = Promise.promisify(fs.readFile);
const jpeg = require('jpeg-js');

function verifyImageDimensions(options, width, height) {
  const {minWidth, minHeight, minAspect, maxAspect} = options;
  if (minWidth && width < minWidth) return false;
  if (minHeight && height < minHeight) return false;
  const aspect = minWidth / minHeight;
  if (minAspect && aspect < minAspect) return false;
  if (maxAspect && aspect > maxAspect) return false;
  return true;
}

function verifyLocalFileDimensions(options, filename) {
  return readFileAsync(filename).then((data) => {
    const {width, height} = jpeg.decode(data);
    if (!verifyImageDimensions(options, width, height)) {
      throw new Error(`dimensions of image ${filename} (${width}×${height}) are not accepted`);
    }
    return {width, height};
  });
}

module.exports.verifyImageDimensions = verifyImageDimensions;
module.exports.verifyLocalFileDimensions = verifyLocalFileDimensions;
