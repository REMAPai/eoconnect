import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/marketplace'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/marketplace'

  if (code) {
    return NextResponse.redirect(`${origin}/auth/confirm?code=${code}&next=${next}`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
