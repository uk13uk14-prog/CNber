/**
 * Tab 页用 reLaunch 带 query；子页用 navigateTo
 */
export function goTab(url) {
  uni.reLaunch({ url })
}

export function goPage(url) {
  uni.navigateTo({ url })
}

export function back() {
  uni.navigateBack({ delta: 1 })
}
