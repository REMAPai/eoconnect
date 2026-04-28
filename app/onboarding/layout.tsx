import Link from 'next/link'
import { ThemeToggle } from '@/components/layout/theme-toggle'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-6">
        <Link href="/" className="text-2xl font-extrabold tracking-tight">
          Member<span className="text-primary">Market</span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex-1 flex items-start justify-center px-4 py-8">
        {children}
      </main>
    </div>
  )
}
