#!/bin/sh

# ts3bot_cronjob.sh
SCRIPTPATH="$(dirname "${0}")"
cd "${SCRIPTPATH}"

DATE="$(exec date +'%y%m%d-%H%M')"

BACKUPFOLDER="$($SCRIPTPATH/backup)" 2> /dev/null
if [ ! -e BACKUPFOLDER ]; then
    mkdir -p backup/$DATE
else
    echo "Backup folder already exists."
fi

mv log backup/$DATE/log &&
exec pm2 restart ts3bot &&
exec pm2 restart www
exit 0
