import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [{ data: profile }, { data: convs }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, avatar_url, eo_chapter, role, status').eq('id', user.id).single(),
    db.from('conversations').select('id').contains('participant_ids', [user.id]) as Promise<{ data: Array<{ id: string }> | null }>,
  ])

  let unreadMessages = 0
  if (convs && convs.length > 0) {
    const { count } = await db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', convs.map(c => c.id))
      .neq('sender_id', user.id)
      .is('read_at', null) as { count: number | null }
    unreadMessages = count ?? 0
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar profile={profile} unreadMessages={unreadMessages} />
      <main className="flex-1 mx-auto w-full max-w-[1280px] py-8 px-4 md:px-6">
        {children}
      </main>
      <Footer />
    </div>
  )
}
