
import axios from 'axios'

const axiosClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Mengirim token JWT secara otomatis pada setiap request
axiosClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('medan-istore-auth-token')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

export default axiosClient
