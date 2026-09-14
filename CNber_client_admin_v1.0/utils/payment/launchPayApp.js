import { PaymentError } from './PaymentProvider.js'
import { isAppPlusRuntime } from './saveQrToAlbum.js'

const WECHAT = {
  name: '微信',
  pname: 'com.tencent.mm',
  schemes: ['weixin://']
}

const ALIPAY = {
  name: '支付宝',
  pname: 'com.eg.android.AlipayGphone',
  schemes: ['alipays://platformapi/startapp', 'alipayqr://platformapi/startapp', 'alipays://']
}

function notInstalled(app) {
  return new PaymentError(
    'APP_NOT_INSTALLED',
    `未检测到${app.name}，请使用查看收款码方式付款`
  )
}

function launchFail(app) {
  return new PaymentError('LAUNCH_FAIL', `无法打开${app.name}，请使用查看收款码方式付款`)
}

function appSpec(paymentMethod) {
  return paymentMethod === 'alipay' ? ALIPAY : WECHAT
}

function hasPlus() {
  return typeof plus !== 'undefined' && plus.runtime
}

function isInstalled(app) {
  if (!hasPlus() || typeof plus.runtime.isApplicationExist !== 'function') return null
  try {
    const ok = plus.runtime.isApplicationExist({
      pname: app.pname,
      action: app.schemes[0]
    })
    return Boolean(ok)
  } catch {
    return null
  }
}

function launchByAndroidPackage(pname) {
  if (!hasPlus() || !plus.android) return false
  try {
    const main = plus.android.runtimeMainActivity()
    plus.android.importClass(main)
    const pm = main.getPackageManager()
    plus.android.importClass(pm)
    const intent = pm.getLaunchIntentForPackage(pname)
    if (!intent) return false
    plus.android.importClass(intent)
    intent.addFlags(268435456)
    main.startActivity(intent)
    return true
  } catch {
    return false
  }
}

function launchByApplication(app) {
  return new Promise((resolve, reject) => {
    if (!hasPlus() || typeof plus.runtime.launchApplication !== 'function') {
      resolve(false)
      return
    }
    let settled = false
    const done = (ok, err) => {
      if (settled) return
      settled = true
      if (ok) resolve(true)
      else reject(err || launchFail(app))
    }
    try {
      plus.runtime.launchApplication({ pname: app.pname, extra: { type: 0 } }, (e) => {
        done(false, e ? notInstalled(app) : launchFail(app))
      })
      setTimeout(() => done(true), 800)
    } catch (e) {
      done(false, launchFail(app))
    }
  })
}

function launchByScheme(url, app) {
  return new Promise((resolve, reject) => {
    if (!hasPlus() || typeof plus.runtime.openURL !== 'function') {
      resolve(false)
      return
    }
    let settled = false
    plus.runtime.openURL(url, () => {
      if (settled) return
      settled = true
      reject(notInstalled(app))
    })
    setTimeout(() => {
      if (settled) return
      settled = true
      resolve(true)
    }, 600)
  })
}

/**
 * Android APP-PLUS：用 package / URI 拉起微信或支付宝。
 * 不能让对方 App 自动识别图片，用户仍需扫一扫 → 相册选码。
 */
export async function launchPayApp(paymentMethod) {
  const app = appSpec(paymentMethod)
  if (!isAppPlusRuntime() || !hasPlus()) {
    throw new PaymentError(
      'APP_ENV',
      `当前环境无法拉起${app.name}，请使用查看收款码方式付款`
    )
  }

  const installed = isInstalled(app)
  if (launchByAndroidPackage(app.pname)) return true
  if (installed === false) throw notInstalled(app)

  try {
    const ok = await launchByApplication(app)
    if (ok) return true
  } catch (e) {
    if (e && e.code === 'APP_NOT_INSTALLED') throw e
  }

  for (const scheme of app.schemes) {
    try {
      const ok = await launchByScheme(scheme, app)
      if (ok) return true
    } catch (e) {
      if (e && e.code === 'APP_NOT_INSTALLED') {
        continue
      }
    }
  }

  if (installed === false) throw notInstalled(app)
  throw launchFail(app)
}

export function payAppName(paymentMethod) {
  return paymentMethod === 'alipay' ? '支付宝' : '微信'
}
