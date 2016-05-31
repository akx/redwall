const Promise = require('bluebird');
const rp = require('request-promise');
const writeFileAsync = Promise.promisify(require('fs').writeFile);
const noop = require('lodash/noop');

function downloadToLocalFile(uri, localPath, respCallback = noop) {
  const req = rp({uri, encoding: null});
  req.on('response', respCallback);
  return req.then((body) => writeFileAsync(localPath, body)).then(() => localPath);
}

module.exports.downloadToLocalFile = downloadToLocalFile;
