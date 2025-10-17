"use client"

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseClient'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSendOtp = async () => {
    try {
      setLoading(true)
      setMessage(null)
      const { error } = await supabaseBrowser.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
      if (error) throw error
      setStep('otp')
      setMessage('We sent a one-time code to your email.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send code'
      setMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    try {
      setLoading(true)
      setMessage(null)
      const { error } = await supabaseBrowser.auth.verifyOtp({ email, token: otp, type: 'email' })
      if (error) throw error
      window.location.href = '/dashboard'
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid code'
      setMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm rounded-md border p-4 space-y-3">
        <h1 className="text-base font-semibold">Sign in</h1>
        {step === 'email' && (
          <div className="space-y-2">
            <input
              type="email"
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              onClick={handleSendOtp}
              disabled={loading || !email}
              className="w-full rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
            >{loading ? 'Sending…' : 'Send code'}</button>
          </div>
        )}
        {step === 'otp' && (
          <div className="space-y-2">
            <input
              type="text"
              inputMode="numeric"
              className="w-full rounded border px-3 py-2 text-sm tracking-widest"
              placeholder="Enter code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button
              onClick={handleVerifyOtp}
              disabled={loading || !otp}
              className="w-full rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
            >{loading ? 'Verifying…' : 'Verify'}</button>
          </div>
        )}
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
      </div>
    </div>
  )
}


