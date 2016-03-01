#!/bin/sh

# ts3bot Startscript
SCRIPTPATH="$(dirname "${0}")"
cd "${SCRIPTPATH}"

SCRIPTNAME="ts3bot.js"
if [ ! -e $SCRIPTNAME ]; then
    echo "Could not locate JS-File, aborting"
    exit 5
fi

case "$1" in
    start)
        if [ -e ts3bot.pid ]; then
            if ( kill -0 $(cat ts3bot.pid) 2> /dev/null ); then
                echo "Ts3bot is already running, try restart or stop"
                exit 1
            else
                echo "A previously run instance has not been shut down properly."
                rm ts3bot.pid
            fi
        fi
        if [ "${UID}" = "0" ]; then
            echo "WARNING ! DO NOT RUN AS ROOT"
            c=1
            while [ "$c" -le 10 ]; do
                echo -n "!"
                sleep 1
                c=$((++c))
            done
            echo "!"
        fi
        echo "Starting Ts3bot.."
        if [ -e "$SCRIPTNAME" ]; then
                        if [ ! -x "$SCRIPTNAME" ]; then
                                echo "${SCRIPTNAME} is not executable, trying to set it"
                                chmod u+x "${SCRIPTNAME}"
                        fi
                        if [ -x "$SCRIPTNAME" ]; then
                                line="-------------$(date +'%D %T')-------------";
                                echo $line >> error.log
                                "./${SCRIPTNAME}" >> /dev/null 2>>error.log &
                                echo $! > ts3bot.pid
                                echo "Ts3bot for Teamspeak 3 started"
                        else
                                echo "${SCRIPTNAME} is not exectuable, cannot start Ts3bot"
                        fi
        else
            echo "Could not find JS-File, aborting"
            exit 5
        fi
    ;;
    stop)
        if [ -e ts3bot.pid ]; then
            echo -n "Stopping Ts3bot"
            if ( kill -TERM $(cat ts3bot.pid) 2> /dev/null ); then
                c=1
                while [ "$c" -le 300 ]; do
                    if ( kill -0 $(cat ts3bot.pid) 2> /dev/null ); then
                        echo -n "."
                        sleep 1
                    else
                        break
                    fi
                    c=$((++c))
                done
            fi
            if ( kill -0 $(cat ts3bot.pid) 2> /dev/null ); then
                echo "Ts3bot is not shutting down properly - killing"
                kill -KILL $(cat ts3bot.pid)
            else
                echo "done"
            fi
            rm ts3bot.pid
        else
            echo "Ts3bot is not running (ts3bot.pid is missing)"
            exit 7
        fi
    ;;
    restart)
        $0 stop && $0 start || exit 1
    ;;
    status)
        if [ -e ts3bot.pid ]; then
            if ( kill -0 $(cat ts3bot.pid) 2> /dev/null ); then
                echo "Ts3bot is running"
            else
                echo "Ts3bot seems to have died"
            fi
        else
            echo "Ts3bot is not running (ts3bot.pid is missing)"
        fi
    ;;
    *)
        echo "Usage: ${0} {start|stop|restart|status}"
        exit 2
esac
exit 0
