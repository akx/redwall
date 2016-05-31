const Promise = require('bluebird');
const cp = require('child_process');

const SCRIPT_TEMPLATE = `
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

module.exports = function (path) {
  const script = SCRIPT_TEMPLATE.replace(/__PATH__/g, path);
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
};
