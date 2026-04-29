import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  // Prefer the explicitly-configured public URL over the request's origin.
  // Behind a reverse proxy (Dokploy/Traefik) that doesn't forward the Host
  // header, request.url shows the container's internal bind (e.g.
  // '0.0.0.0:3000') instead of the public domain — which then leaks into
  // the redirect target sent back to the browser.
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || requestUrl.origin
  const searchParams = requestUrl.searchParams
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/marketplace'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/marketplace'

  if (code) {
    const redirectUrl = new URL(next, origin)
    const response = NextResponse.redirect(redirectUrl)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return response
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
}
