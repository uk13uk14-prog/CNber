import { get } from './request.js'

/**
 * 启动时检查内部测试版本。失败静默，不打断下单主链。
 * @param {'driver'|'client'} app
 */
export function checkAppVersion(app) {
  // #ifdef APP-PLUS
  setTimeout(() => {
    get('/app/version', { app }, { skipAuth: true, showErrorToast: false })
      .then((data) => {
        if (!data) return
        const remote = Number(data.versionCode)
        let local = 0
        try {
          local = Number(plus.runtime.versionCode || 0)
        } catch (e) {
          local = 0
        }
        if (!remote || remote <= local || !data.downloadUrl) return
        uni.showModal({
          title: '发现新版本',
          content: data.releaseNotes || `新版本 ${data.versionName || ''}`,
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
