export default new class nccommon {
    /**
     * 输出Info日志
     * @param botInfo BotInfo
     * @param args 
     */
    info(botInfo = '未登录', ...args) {
        logger.info(logger.blue('[NapCat]'), botInfo, ...args)
    }
    /**
     * 输出Mark日志
     * @param botInfo BotInfo
     * @param args 
     */
    mark(botInfo = '未登录', ...args) {
        logger.mark(logger.blue('[NapCat]'), botInfo, ...args)
    }
    /**
     * 输出Warn日志
     * @param botInfo BotInfo
     * @param args 
     */
    warn(botInfo = '未登录', ...args) {
        logger.warn(logger.blue('[NapCat]'), botInfo, ...args)
    }
    /**
     * 输出Error日志
     * @param botInfo BotInfo
     * @param args 
     */
    error(botInfo = '未登录', ...args) {
        logger.error(logger.blue('[NapCat]'), botInfo, ...args)
    }
    /**
     * 输出Debug日志
     * @param botInfo BotInfo
     * @param args 
     */
    debug(botInfo = '未登录', ...args) {
        logger.debug(logger.blue('[NapCat]'), botInfo, ...args)
    }
    /**
     * 睡觉
     * @param ms 睡多久
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}