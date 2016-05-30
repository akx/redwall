const Promise = require('bluebird');
const cp = require('child_process');

// BASED ON https://github.com/pipwerks/OS-X-Wallpaper-Changer/blob/master/wallpaper.scpt
const SCRIPT_TEMPLATE = `
tell application "Finder"
	try
		set mainDisplayPicture to POSIX file "__PATH__"
		tell application "System Events"
			set theDesktops to a reference to every desktop
			if ((count theDesktops) > 1) then
				repeat with x from 2 to (count theDesktops)
					set picture of item x of the theDesktops to mainDisplayPicture
				end repeat
			end if
		end tell
		set desktop picture to mainDisplayPicture
	end try
end tell
`;

module.exports = function (path) {
  const script = SCRIPT_TEMPLATE.replace(/__PATH__/g, path);
  return new Promise((resolve, reject) => {
    const osascript = cp.spawn('/usr/bin/osascript', {
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    osascript.stdin.write(script);
    osascript.on('close', (code) => {
      if (code !== 0) {
        reject(`osascript process exited with code ${code}`);
      }
      resolve();
    });
  });
};
