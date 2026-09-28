const log4js = require('log4js')
const log4jsConfig = require('../../log4js.json')

class LoggerError {

    constructor() {
        this.configLogger()
        this.logger = log4js.getLogger('error')
    }

    configLogger() {
        log4js.configure(log4jsConfig);
    }

    log(log) {
        this.logger.error(log);
    }
}

module.exports = new LoggerError;