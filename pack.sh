#!/usr/bin/sh
rm enhanced-middle-click.xpi
zip -r enhanced-middle-click.xpi * -x ".*" "pack.sh" "*.xpi" "index.html" "*work_files*"

# needs https://addons.mozilla.org/en-US/firefox/addon/autoinstaller/
wget --post-file=enhanced-middle-click.xpi http://localhost:8888/
