import { createClient } from '@/lib/supabase/server'
import { MembersTable } from '@/components/admin/members-table'

export default async function AdminMembersPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()

  const { data: me } = await db.from('profiles').select('role, eo_chapter').eq('id', user!.id).single() as {
    data: { role: 'chapter_admin' | 'super_admin'; eo_chapter: string | null } | null
  }

  let query = db.from('profiles').select('id, full_name, eo_chapter, role, status, created_at, eo_membership_email').order('created_at', { ascending: false })
  if (me?.role === 'chapter_admin' && me.eo_chapter) {
    query = query.eq('eo_chapter', me.eo_chapter)
  }

  const { data: members } = await query as {
    data: Array<{
      id: string
      full_name: string
      eo_chapter: string | null
      role: 'member' | 'chapter_admin' | 'super_admin'
      status: 'pending' | 'active' | 'suspended'
      created_at: string
      eo_membership_email: string | null
    }> | null
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {me?.role === 'chapter_admin'
            ? `Members of your chapter (${me.eo_chapter ?? 'unknown'}).`
            : 'All members across all chapters.'}
        </p>
      </div>
      <MembersTable members={members ?? []} canChangeRole={me?.role === 'super_admin'} />
    </div>
  )
}
