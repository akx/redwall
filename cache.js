const R = require('ramda');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const crypto = require('crypto');
const os = require('os');

const mem = {};

const getFilename = (key) => {
  const hasher = crypto.createHash('sha256');
  hasher.update(key);
  return `${os.tmpdir()}/redwall-${hasher.digest('hex')}.cache`;
};

const get = (key) => (
  new Promise((resolve) => {
    if (mem[key]) {
      resolve(mem[key]);
    }
    fs.readFileAsync(getFilename(key), 'utf8').then(
      JSON.parse,
      (err) => {
        if (err.code === 'ENOENT') {
          return Promise.resolve(undefined);
        }
        throw err;
      }
    ).then(resolve);
  })
    .then((data) => {
      if (data === undefined || data.expires < +new Date()) {
        delete mem[key];
        return undefined;
      }
      mem[key] = data;
      return data.data;
    })
);

const put = (key, value, ttl = 60) => {
  const payload = {
    data: value,
    expires: (+new Date() + ttl * 1000),
  };
  mem[key] = payload;
  return fs.writeFileAsync(getFilename(key), JSON.stringify(payload), 'utf8');
};

module.exports.cached = (key, getter, expiry = 60, validator = R.identity) => (
  get(key).then((cachedVal) => {
    if (validator(cachedVal)) {
      return R.merge({$cache: true,}, cachedVal);
    }
    return getter(key).then((newVal) => {
      put(key, R.merge({$mtime: +new Date(),}, newVal), expiry);
      return newVal;
    });
  })
);
