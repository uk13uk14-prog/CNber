/**
 * 轻量会话：以 Storage 为准，避免额外依赖
 */
import { STORAGE_TOKEN, STORAGE_USER } from '../config/api.js'

export function getToken() {
  try {
    return uni.getStorageSync(STORAGE_TOKEN) || ''
  } catch (e) {
    return ''
  }
}

export function setSession(token, user) {
  uni.setStorageSync(STORAGE_TOKEN, token)
  uni.setStorageSync(STORAGE_USER, user || null)
}

export function getUser() {
  try {
    return uni.getStorageSync(STORAGE_USER) || null
  } catch (e) {
    return null
  }
}

export function clearSession() {
  try {
    uni.removeStorageSync(STORAGE_TOKEN)
    uni.removeStorageSync(STORAGE_USER)
  } catch (e) {
    /* ignore */
  }
}

export function isLoggedIn() {
  return !!getToken()
}
