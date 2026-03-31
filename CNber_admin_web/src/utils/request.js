import axios from 'axios'

const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // .env.development 中配置
  timeout: 5000
})

// 请求拦截器
service.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, error => {
  return Promise.reject(error)
})

// 响应拦截器
service.interceptors.response.use(
  res => {
    if (res.status === 200) {
      return res.data
    } else {
      return Promise.reject(res)
    }
  },
  err => {
    console.error('❌ 接口请求失败:', err)
    return Promise.reject(err)
  }
)

export default service
