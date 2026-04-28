import { createClient } from '@/lib/supabase/server'

// Debug-only page. Renders the current session's user.id and the matching
// profile row. Lets us diagnose role/onboarding issues from the deployed app.
//
// Visit /whoami while signed in.

export const dynamic = 'force-dynamic'

export default async function WhoamiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  let profile = null
  let profileError = null
  if (user) {
    const result = await db.from('profiles')
      .select('id, full_name, role, status, eo_membership_type, country, onboarded_at, created_at')
      .eq('id', user.id)
      .maybeSingle()
    profile = result.data
    profileError = result.error
  }

  return (
    <div style={{ fontFamily: 'monospace', padding: 24, fontSize: 13, lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 18, marginBottom: 16 }}>whoami — debug</h1>

      <h2 style={{ fontSize: 14, marginTop: 16, fontWeight: 700 }}>auth.user</h2>
      <pre style={{ background: '#111', color: '#0f0', padding: 12, borderRadius: 6, overflow: 'auto' }}>
        {user ? JSON.stringify({
          id: user.id,
          email: user.email,
          provider: user.app_metadata?.provider,
          created_at: user.created_at,
        }, null, 2) : '(not signed in)'}
      </pre>

      <h2 style={{ fontSize: 14, marginTop: 16, fontWeight: 700 }}>profiles row</h2>
      <pre style={{ background: '#111', color: '#0ff', padding: 12, borderRadius: 6, overflow: 'auto' }}>
        {profile ? JSON.stringify(profile, null, 2) : '(no profile row found for this user.id)'}
      </pre>

      {profileError != null && (
        <>
          <h2 style={{ fontSize: 14, marginTop: 16, fontWeight: 700, color: '#f66' }}>profile fetch error</h2>
          <pre style={{ background: '#311', color: '#fcc', padding: 12, borderRadius: 6, overflow: 'auto' }}>
            {JSON.stringify(profileError, null, 2)}
          </pre>
        </>
      )}

      <p style={{ marginTop: 24, color: '#888', fontSize: 12 }}>
        If profile.role is &quot;super_admin&quot; here but /admin still redirects to /dashboard,
        copy this whole page and send it back.
      </p>
    </div>
  )
}
