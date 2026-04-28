import { type NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware-client'
import type { EoMembershipType, UserRole, UserStatus } from '@/types/database'

export async function proxy(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  const pathname = request.nextUrl.pathname

  const protectedPaths = ['/dashboard', '/marketplace', '/admin', '/onboarding']
  const isProtected = protectedPaths.some(p => pathname.startsWith(p))
  const authPages = ['/login', '/signup', '/reset-password', '/verify', '/suspended']
  const isAuthPage = authPages.some(p => pathname.startsWith(p))

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/marketplace', request.url))
  }

  if (!user) return response

  // Single profile fetch for all gating below.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status, eo_membership_type, country, onboarded_at')
    .eq('id', user.id)
    .single() as {
      data: {
        role: UserRole
        status: UserStatus
        eo_membership_type: EoMembershipType | null
        country: string | null
        onboarded_at: string | null
      } | null
      error: unknown
    }

  if (profile?.status === 'suspended' && pathname !== '/suspended') {
    return NextResponse.redirect(new URL('/suspended', request.url))
  }

  if (pathname.startsWith('/admin')) {
    // TEMP DEBUG — surface the actual gate decision so we can see why a
    // super_admin user is being redirected. Will remove once diagnosed.
    console.log('[admin-gate]', JSON.stringify({
      user_id: user.id,
      user_email: user.email,
      profile_role: profile?.role ?? null,
      profile_status: profile?.status ?? null,
      profile_is_null: !profile,
    }))
    if (!profile || !['chapter_admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Existing users (onboarded_at backfilled in migration 005) skip the gate
  // entirely. Only brand-new signups (onboarded_at IS NULL) get guided through
  // the onboarding form + business wizard.
  const isNewUser = profile && !profile.onboarded_at

  if (isNewUser) {
    const exemptFromOnboardingGate =
      pathname === '/onboarding' ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/_next') ||
      pathname === '/'

    // Step 1: must complete the onboarding form
    if (!exemptFromOnboardingGate && (!profile.eo_membership_type || !profile.country)) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // Step 2: must list a business
    const exemptFromBusinessGate =
      exemptFromOnboardingGate ||
      pathname.startsWith('/dashboard/business/new') ||
      pathname.startsWith('/admin')

    if (!exemptFromBusinessGate && profile.eo_membership_type && profile.country) {
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle() as { data: { id: string } | null; error: unknown }

      if (!business) {
        return NextResponse.redirect(new URL('/dashboard/business/new', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)'],
}
