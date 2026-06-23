const mongoose = require('mongoose')
const SystemAuditLog = require('../models/SystemAuditLog')

/**
 * 写入系统操作审计日志（异步，不阻塞主流程）
 * @param {object} req - Express request（可选，用于取操作人）
 * @param {object} payload
 */
async function auditLog(req, payload = {}) {
  try {
    const uid = req?.user?.userId || req?.user?._id || payload.operatorId || null
    let operatorId = null
    if (uid && mongoose.Types.ObjectId.isValid(String(uid))) {
      operatorId = uid
    }
    await SystemAuditLog.create({
      operatorId,
      operatorPhone: String(req?.user?.phone || payload.operatorPhone || '').trim(),
      action: String(payload.action || '').trim(),
      module: String(payload.module || '').trim(),
      entityId: payload.entityId != null ? String(payload.entityId) : '',
      entityType: String(payload.entityType || '').trim(),
      description: String(payload.description || '').trim()
    })
  } catch (err) {
    console.warn('[auditLog]', err.message)
  }
}

module.exports = { auditLog }
