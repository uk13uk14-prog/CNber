const {
  getConfigMap,
  setConfigEntries,
  toAdminPayload,
  toPublicPayload,
  bodyToPatch
} = require('../utils/systemConfig')
const { auditLog } = require('../utils/auditLog')

/** GET /api/admin/system-config */
exports.getAdminSystemConfig = async (_req, res) => {
  const map = await getConfigMap()
  res.json({
    code: 0,
    message: 'success',
    data: toAdminPayload(map)
  })
}

/** PUT /api/admin/system-config */
exports.putAdminSystemConfig = async (req, res) => {
  const patch = bodyToPatch(req.body || {})
  if (!Object.keys(patch).length) {
    const e = new Error('无可保存的配置项')
    e.code = 400
    throw e
  }
  const map = await setConfigEntries(patch, req)
  void auditLog(req, {
    action: '修改系统设置',
    module: 'system_settings',
    entityType: 'system_config',
    description: `更新配置项：${Object.keys(patch).join(', ')}`
  })
  res.json({
    code: 0,
    message: 'success',
    data: toAdminPayload(map)
  })
}

/** GET /api/public/system-config */
exports.getPublicSystemConfig = async (_req, res) => {
  const map = await getConfigMap()
  res.json({
    code: 0,
    message: 'success',
    data: toPublicPayload(map)
  })
}
