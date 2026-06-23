const mongoose = require('mongoose')

function buildOperationLog(req, action, message) {
  let operatorId = null
  const uid = req.user && req.user.userId
  if (uid && mongoose.Types.ObjectId.isValid(String(uid))) {
    operatorId = uid
  }
  return {
    action: String(action || '').trim(),
    operatorId,
    operatorPhone: String((req.user && req.user.phone) || '').trim(),
    message: String(message || '').trim(),
    createdAt: new Date()
  }
}

function logPushPayload(req, action, message) {
  return { operationLogs: buildOperationLog(req, action, message) }
}

module.exports = {
  buildOperationLog,
  logPushPayload
}
