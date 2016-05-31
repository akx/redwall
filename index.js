const main = require('./lib/main');
const config = require('./config');

process.on("unhandledRejection", (reason) => {
  throw reason;
});


function go() {
  return main.pickDownloadAndSetWallpaper(config).then(
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
