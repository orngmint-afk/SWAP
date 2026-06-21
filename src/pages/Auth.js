import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } }
      })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="app-shell" style={{ justifyContent: 'center', padding: '32px 24px' }}>
      <div style={{ marginBottom: 36, textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, marginBottom: 6 }}>
          SWA<span style={{ color: 'var(--red)' }}>P</span>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Buy and sell car parts, directly.
        </p>
      </div>

      <div style={{ display: 'flex', marginBottom: 24, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 3 }}>
        {['login', 'signup'].map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(''); setMessage('') }}
            style={{
              flex: 1, padding: '9px', border: 'none', borderRadius: 'var(--radius-sm)',
              fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
              background: mode === m ? 'var(--bg)' : 'transparent',
              color: mode === m ? 'var(--text)' : 'var(--text-secondary)',
              boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            {m === 'login' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <div className="form-group">
            <label className="form-label">Your name</label>
            <input className="form-input" type="text" placeholder="e.g. Mike Khumalo" value={name} onChange={e => setName(e.target.value)} required />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#FCEBEB', borderRadius: 'var(--radius-md)', marginBottom: 14, fontSize: 13, color: '#A32D2D' }}>
            {error}
          </div>
        )}
        {message && (
          <div style={{ padding: '10px 14px', background: '#E1F5EE', borderRadius: 'var(--radius-md)', marginBottom: 14, fontSize: 13, color: '#0F6E56' }}>
            {message}
          </div>
        )}

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? <div className="spinner" style={{ borderTopColor: '#fff' }} /> : (mode === 'login' ? 'Sign in' : 'Create account')}
        </button>
      </form>
    </div>
  )
}
