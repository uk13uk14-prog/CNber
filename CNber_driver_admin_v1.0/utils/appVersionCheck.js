import { get } from './request.js'

function localVersionCode() {
  try {
    const n = Number(plus.runtime.versionCode)
    return Number.isFinite(n) ? n : 0
  } catch (e) {
    return 0
  }
}

/** HBuilder 调试基座：不拿正式 APK 打断接单调试 */
function isDebugRuntime(localCode) {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
      return true
    }
  } catch (e) {
    /* ignore */
  }
  return localCode > 0 && localCode < 1000
}

/**
 * 启动时检查内部测试版本。失败静默，不打断现有接单/轮询。
 * 非 forceUpdate 时仅弹窗，不 return 掉任务监听。
 * @param {'driver'|'client'} app
 */
export function checkAppVersion(app) {
  // #ifdef APP-PLUS
  setTimeout(() => {
    get('/app/version', { app }, { skipAuth: true, showErrorToast: false })
      .then((data) => {
        if (!data) return
        const remote = Number(data.versionCode)
        if (!Number.isFinite(remote) || remote <= 0) return
        const local = localVersionCode()
        if (isDebugRuntime(local)) return
        if (remote <= local) return
        if (!data.downloadUrl) return
        uni.showModal({
          title: '发现新版本',
          content: data.releaseNotes || `新版本 ${data.versionName || ''}`,
          showCancel: data.forceUpdate ? false : true,
          cancelText: '稍后更新',
          confirmText: '立即更新',
          success(res) {
            if (res.confirm) {
              plus.runtime.openURL(String(data.downloadUrl))
            }
          }
        })
      })
      .catch(() => {})
  }, 1500)
  // #endif
}
