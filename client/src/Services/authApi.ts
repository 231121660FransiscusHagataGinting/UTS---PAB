
import axiosClient from '../api/axiosClient'

export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthUser {
  id: number
  name: string
  username: string
  role: 'admin' | 'cashier'
}

interface LoginResponse {
  success: boolean
  message: string
  data: {
    token: string
    user: AuthUser
  }
}

// POST: Login admin dan kasir
export async function login(
  credentials: LoginCredentials
): Promise<{ token: string; user: AuthUser }> {
  const response = await axiosClient.post<LoginResponse>(
    '/auth/login',
    credentials
  )

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || 'Login gagal.')
  }

  return response.data.data
}
