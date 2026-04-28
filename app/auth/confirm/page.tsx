'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthConfirmPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const rawNext = params.get('next') ?? '/marketplace'
    const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/marketplace'

    if (!code) {
      window.location.href = '/login?error=auth_callback_failed'
      return
    }

    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        window.location.href = '/login?error=auth_callback_failed'
      } else {
        window.location.href = next
      }
    })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm">Signing you in…</p>
    </div>
  )
}
