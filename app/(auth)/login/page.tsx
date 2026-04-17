'use client'

import { useState } from 'react'
import { OjitoAvatar } from '@/components/chat/OjitoAvatar'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [businessName, setBusinessName] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')

    if (mode === 'login') {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) {
        setError(loginError.message)
      } else {
        window.location.href = '/dashboard'
        return
      }
    } else {
      // ── Registro ──────────────────────────────────────────────
      if (!businessName.trim()) {
        setError('Por favor ingresa el nombre de tu negocio.')
        setLoading(false)
        return
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      })

      if (signUpError) {
        // Muestra el mensaje real de Supabase para facilitar debug
        console.error('[signUp error]', signUpError)
        setError(signUpError.message)
        setLoading(false)
        return
      }

      // En Supabase v2, signUp puede devolver user sin session
      // cuando "Email Confirmation" está habilitado en el proyecto.
      // Creamos el tenant con el user_id del usuario recién creado.
      const userId = data.user?.id
      const userEmail = data.user?.email ?? email.trim().toLowerCase()

      if (!userId) {
        // Caso: email ya registrado pero sin confirmar (identities vacías)
        setInfo('Este email ya está registrado. Revisa tu bandeja de entrada para confirmar tu cuenta o inicia sesión.')
        setLoading(false)
        return
      }

      // Crear tenant en nuestra DB
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: businessName.trim(),
          email: userEmail,
          user_id: userId,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error('[/api/tenants error]', body)
        setError(body.error ?? 'Error creando tu cuenta. Intenta de nuevo.')
        setLoading(false)
        return
      }

      // Si hay sesión activa (email confirmation desactivado) → directo al dashboard
      if (data.session) {
        window.location.href = '/dashboard'
        return
      }

      // Si no hay sesión → email de confirmación enviado
      setInfo('¡Cuenta creada! Revisa tu email y confirma tu cuenta para ingresar.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-100">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <OjitoAvatar size={56} animated />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">OptiChatBot</h1>
          <p className="text-gray-500 text-sm mt-1">
            {mode === 'login' ? 'Ingresa a tu panel' : 'Crea tu cuenta gratis'}
          </p>
        </div>

        {/* Toggle login / registro */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(''); setInfo('') }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del negocio
              </label>
              <input
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="Ej: Óptica Visión Clara"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@optica.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
              required
              minLength={6}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2.5 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {/* Info (email confirmation, etc.) */}
          {info && (
            <div className="bg-blue-50 text-blue-700 text-sm px-3 py-2.5 rounded-lg border border-blue-100">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Cargando…'
              : mode === 'login'
              ? 'Ingresar'
              : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by{' '}
          <span className="text-blue-500 font-semibold">OptiChatBot</span> · Claude AI
        </p>
      </div>
    </div>
  )
}
