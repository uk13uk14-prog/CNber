/**
 * 接口层：认证（复用 POST /api/auth/login，需账号 role=admin）
 */
import { post } from '../utils/request.js'

export function loginByPhone(phone, password) {
  return post(
    'auth/login',
    { phone, password },
    { skipAuth: true, showErrorToast: true }
  )
}
