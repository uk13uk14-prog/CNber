/**
 * H5 预览：原生能力友好降级（不破坏 APP-PLUS 真机逻辑）
 */
export const APP_ONLY_TIP = '此功能请在 CNber App 中使用'

export function showAppOnlyToast() {
  try {
    if (typeof uni !== 'undefined' && uni.showToast) {
      uni.showToast({ title: APP_ONLY_TIP, icon: 'none', duration: 2500 })
      return
    }
  } catch (_) {
    /* ignore */
  }
  try {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(APP_ONLY_TIP)
    }
  } catch (_) {
    /* ignore */
  }
}

export function runAppPlusOnly(fn) {
  // #ifdef APP-PLUS
  try {
    return typeof fn === 'function' ? fn() : undefined
  } catch (e) {
    console.warn('[APP-PLUS]', e)
    return undefined
  }
  // #endif
  // #ifndef APP-PLUS
  showAppOnlyToast()
  return undefined
  // #endif
}
