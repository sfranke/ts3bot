var logger = exports,
    config = config = JSON.parse(require('fs').readFileSync('config.json'));

logger.debuglevel = config.debuglevel;

function date() {
    var date = new Date();
    return date;
};

logger.log = function(level, message) {
    var levels = ['error', 'warning', 'info'];
    if (levels.indexOf(level) >= levels.indexOf(logger.debugLevel)) {
        if (typeof message !== 'string') {
            message = JSON.stringify(message);
        };
        console.log(date() + ' ' + level + ': ' + message);
    };
};
