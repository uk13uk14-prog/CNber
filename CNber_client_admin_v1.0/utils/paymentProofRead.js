/**
 * 将 chooseImage 的 tempFilePath 转为 data URL（供 imageBase64 上传）
 * app-plus：plus.io（不用 uni.getFileSystemManager）
 * H5：fetch + FileReader
 * 小程序：getFileSystemManager（仅 MP 环境存在时）
 */

function normalizeAppPlusPath(filePath) {
  const p = String(filePath || '').trim()
  if (!p) return p
  if (p.startsWith('file://')) return p
  try {
    if (plus.io.convertLocalFileSystemURL) {
      return plus.io.convertLocalFileSystemURL(p)
    }
  } catch (e) {
    /* use original */
  }
  return p
}

function readAppPlusDataUrl(filePath) {
  return new Promise((resolve, reject) => {
    if (typeof plus === 'undefined' || !plus.io) {
      reject(new Error('plus.io 不可用'))
      return
    }
    const localPath = normalizeAppPlusPath(filePath)
    plus.io.resolveLocalFileSystemURL(
      localPath,
      (entry) => {
        entry.file(
          (file) => {
            const reader = new plus.io.FileReader()
            reader.onloadend = (e) => {
              const result = e.target && e.target.result
              if (result) resolve(result)
              else reject(new Error('读取图片失败'))
            }
            reader.onerror = () => reject(new Error('读取图片失败'))
            reader.readAsDataURL(file)
          },
          () => reject(new Error('无法打开图片文件'))
        )
      },
      () => reject(new Error('无法解析图片路径'))
    )
  })
}

function readH5DataUrl(filePath) {
  return fetch(filePath)
    .then((r) => r.blob())
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
    )
}

function readMpDataUrl(filePath) {
  return new Promise((resolve, reject) => {
    const fs = uni.getFileSystemManager()
    fs.readFile({
      encoding: 'base64',
      filePath,
      success: (res) => resolve(`data:image/jpeg;base64,${res.data}`),
      fail: (err) => reject(err || new Error('读取图片失败'))
    })
  })
}

/**
 * @param {string} filePath uni.chooseImage tempFilePaths[0]
 * @returns {Promise<string>} data:image/...;base64,...
 */
export function readImageAsDataUrl(filePath) {
  const path = String(filePath || '').trim()
  if (!path) {
    return Promise.reject(new Error('缺少图片路径'))
  }

  if (typeof plus !== 'undefined' && plus.io) {
    return readAppPlusDataUrl(path)
  }

  // #ifdef H5
  if (typeof fetch === 'function') {
    return readH5DataUrl(path)
  }
  // #endif

  if (typeof uni.getFileSystemManager === 'function') {
    return readMpDataUrl(path)
  }

  return Promise.reject(new Error('当前环境不支持读取图片'))
}
