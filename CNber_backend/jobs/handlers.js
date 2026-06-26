const logger = require('../utils/logger')

/**
 * 后台任务处理器注册表（V1 框架：业务逻辑可后续填充）
 * @type {Record<string, (payload: object) => Promise<void>>}
 */
const handlers = {
  async dispatch_notify(payload) {
    logger.info('[job:dispatch_notify] stub', { payload })
  },

  async payment_reminder(payload) {
    logger.info('[job:payment_reminder] stub', { payload })
  },

  async daily_report(payload) {
    logger.info('[job:daily_report] stub', { payload })
  },

  async cleanup_logs(payload) {
    logger.info('[job:cleanup_logs] stub', { payload })
  }
}

function getHandler(type) {
  return handlers[type] || null
}

function listJobTypes() {
  return Object.keys(handlers)
}

module.exports = {
  handlers,
  getHandler,
  listJobTypes
}
