import Link from 'next/link'
import { ThemeToggle } from '@/components/layout/theme-toggle'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-6">
        <Link href="/" className="text-2xl font-extrabold tracking-tight">
          EO<span className="text-primary">connect</span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  )
}
