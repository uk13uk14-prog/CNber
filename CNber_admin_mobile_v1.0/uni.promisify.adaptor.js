// @ts-nocheck
if (typeof uni !== 'undefined' && typeof uni.promisify !== 'function') {
  uni.promisify = function (api) {
    return function (options = {}) {
      return new Promise((resolve, reject) => {
        api({ ...options, success: resolve, fail: reject })
      })
    }
  }
}
