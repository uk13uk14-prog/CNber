import { PaymentError } from './PaymentProvider.js'

function fail(code, message) {
  return Promise.reject(new PaymentError(code, message))
}

function isAppPlusRuntime() {
  try {
    if (typeof plus !== 'undefined' && plus.runtime) return true
    const info = uni.getSystemInfoSync()
    return info.uniPlatform === 'app' || info.osName === 'android'
  } catch {
    return false
  }
}

function requestAlbumPermission() {
  return new Promise((resolve, reject) => {
    if (typeof uni.authorize !== 'function') {
      resolve(true)
      return
    }
    uni.authorize({
      scope: 'scope.writePhotosAlbum',
      success: () => resolve(true),
      fail: () => {
        uni.showModal({
          title: '需要相册权限',
          content: '保存收款码需要访问相册，请允许后重试。',
          confirmText: '去设置',
          success: (r) => {
            if (!r.confirm) {
              reject(new PaymentError('PERMISSION_DENIED', '相册权限被拒绝，请使用查看收款码方式付款'))
              return
            }
            uni.openSetting({
              success: (s) => {
                if (s.authSetting && s.authSetting['scope.writePhotosAlbum']) resolve(true)
                else reject(new PaymentError('PERMISSION_DENIED', '相册权限被拒绝，请使用查看收款码方式付款'))
              },
              fail: () =>
                reject(new PaymentError('PERMISSION_DENIED', '相册权限被拒绝，请使用查看收款码方式付款'))
            })
          }
        })
      }
    })
  })
}

function downloadRemoteFile(url) {
  return new Promise((resolve, reject) => {
    uni.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode === 200 && res.tempFilePath) resolve(res.tempFilePath)
        else reject(new PaymentError('DOWNLOAD_FAIL', '收款码下载失败，请检查网络后重试'))
      },
      fail: () => reject(new PaymentError('DOWNLOAD_FAIL', '收款码下载失败，请检查网络后重试'))
    })
  })
}

function saveFileToAlbum(filePath) {
  return new Promise((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve(true),
      fail: (e) => {
        const msg = String(e?.errMsg || '')
        if (/auth|permission|denied|authorize/i.test(msg)) {
          reject(new PaymentError('PERMISSION_DENIED', '相册权限被拒绝，请使用查看收款码方式付款'))
          return
        }
        reject(new PaymentError('SAVE_FAIL', '保存到相册失败，请使用查看收款码方式付款'))
      }
    })
  })
}

/** 下载远程二维码并保存到系统相册 */
export async function saveRemoteImageToAlbum(url) {
  const src = String(url || '').trim()
  if (!src) {
    return fail('QR_MISSING', '收款码未配置，请联系客服')
  }
  await requestAlbumPermission()
  const filePath = await downloadRemoteFile(src)
  await saveFileToAlbum(filePath)
  return { filePath }
}

export { isAppPlusRuntime }
