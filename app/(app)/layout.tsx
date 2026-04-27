import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, eo_chapter, role, status')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar profile={profile} />
      <main className="flex-1 mx-auto w-full max-w-[1280px] py-8 px-4 md:px-6">
        {children}
      </main>
      <Footer />
    </div>
  )
}
