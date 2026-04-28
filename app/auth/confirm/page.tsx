'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthConfirmPage() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const rawNext = params.get('next') ?? '/marketplace'
    const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/marketplace'

    if (!code) {
      router.replace('/login?error=auth_callback_failed')
      return
    }

    const supabase = createClient()
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        router.replace('/login?error=auth_callback_failed')
      } else {
        router.replace(next)
      }
    })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm">Signing you in…</p>
    </div>
  )
}
