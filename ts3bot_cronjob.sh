#!/bin/sh

# ts3bot_cronjob.sh
SCRIPTPATH="$(dirname "${0}")"
cd "${SCRIPTPATH}"

BOTSTARTSCRIPT="ts3bot_startscript.sh"
if [ ! -e $BOTSTARTSCRIPT ]; then
    echo "Could not locate ts3bot_startscript.sh, aborting"
    exit 5
fi

DATE="$(exec date +'%y%m%d')"

BACKUPFOLDER="$($SCRIPTPATH/backup)" 2> /dev/null
if [ ! -e BACKUPFOLDER ]; then
    mkdir -p backup/$DATE
else
    echo "Backup folder already exists."
fi

BOTSTATUS=$(exec ./ts3bot_startscript.sh status)

    case "$BOTSTATUS" in
        "ts3bot is running")
            echo "Ts3bot checked and still running."
            ./$BOTSTARTSCRIPT stop &&
            mv error.log backup/$DATE/error.log &&
            mv log backup/$DATE/log &&
            cp ts3bot.sqlitedb backup/$DATE/ts3bot_sqlitedb &&
            ./$BOTSTARTSCRIPT start &&
            echo "Creating backup."
            cd backup/ &&
            zip -r $DATE"_backup" $DATE/ >> /dev/null &&
            rm -rf $DATE/
        ;;

        "ts3bot seems to have died")
            echo "Ts3bot checked and it may have died."
            mv ts3bot.pid backup/$DATE/ts3bot.pid &&
            mv error.log backup/$DATE/error.log &&
            mv log backup/$DATE/log &&
            cp ts3bot.sqlitedb backup/$DATE/ts3bot_sqlitedb &&
            ./$BOTSTARTSCRIPT start &&
            echo "Creating backup."
            cd backup/ &&
            zip -r $DATE"_backup" $DATE/ >> /dev/null &&
            rm -rf $DATE/
        ;;

        "Ts3bot is not running (ts3bot.pid is missing)")
            echo "No ts3bot.pid found."
            ./$BOTSTARTSCRIPT start
        ;;
esac
exit 0