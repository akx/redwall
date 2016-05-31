const Promise = require('bluebird');
const cp = require('child_process');

const OSX_SCRIPT_TEMPLATE = `
tell application "System Events"
	set desktopArr to a reference to every desktop
	repeat with x from 1 to (count desktopArr)
		tell item x of desktopArr
			set picture rotation to 0
			set picture to "__PATH__"
		end tell
	end repeat
end tell
`;

function setOSXWallpaper (path) {
  const script = OSX_SCRIPT_TEMPLATE.replace(/__PATH__/g, path);
  return new Promise((resolve, reject) => {
    const osascript = cp.spawn('/usr/bin/osascript', {
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    osascript.stdin.write(script);
    osascript.stdin.end();
    osascript.on('close', (code) => {
      if (code !== 0) {
        reject(`osascript process exited with code ${code}`);
      }
      resolve();
    });
  });
}


module.exports = function (path) {
  switch(process.platform) {
  case 'darwin':
    return setOSXWallpaper(path);
  default:
    throw new Error(`wallpaper setting is not supported on your platform ${process.platform} quite yet`);
  }
};
