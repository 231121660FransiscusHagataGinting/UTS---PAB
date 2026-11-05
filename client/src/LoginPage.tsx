
import { useState, type FormEvent } from 'react'
import { login } from './Services/authApi'
import type { AuthUser } from './Services/authApi'

interface LoginPageProps {
  onLoginSuccess: (token: string, user: AuthUser) => void
}

export default function LoginPage({
  onLoginSuccess,
}: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setErrorMessage('')

    if (!username.trim() || !password) {
      setErrorMessage('Username dan password wajib diisi.')
      return
    }

    setLoading(true)

    try {
      const result = await login({
        username: username.trim(),
        password,
      })

      onLoginSuccess(result.token, result.user)
    } catch (error: unknown) {
      const responseError = error as {
        response?: {
          data?: {
            message?: string
          }
        }
      }

      setErrorMessage(
        responseError.response?.data?.message ||
        (error instanceof Error
          ? error.message
          : 'Login gagal. Silakan coba lagi.')
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">

       
{/* BRAND */}
<div className="mb-8 text-center">
  <div className="mx-auto mb-4 flex h-50 w-100 items-center justify-center">
    <img
      src="/images/logo-medan-istore.png"
      alt="Logo Medan iStore"
      className="h-full w-full object-contain"
    />
  </div>

  <h1 className="text-2xl font-bold text-slate-900">
  </h1>

  <p className="mt-2 text-sm text-slate-500">
    Point of Sale Management System
  </p>
</div>


        {/* FORM LOGIN */}
        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Username
            </label>

            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Masukkan username"
              autoComplete="username"
              disabled={loading}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Masukkan password"
              autoComplete="current-password"
              disabled={loading}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
            >
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Memproses login...' : 'Masuk ke Aplikasi'}
          </button>

        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          Medan iStore © 2026
        </p>

      </div>
    </div>
  )
}
