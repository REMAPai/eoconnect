import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function SuspendedPage() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold mb-2">Account Suspended</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Your EOconnect account has been suspended. Please contact your chapter admin for more information.
        </p>
        <Link
          href="/auth/login"
          className={cn(buttonVariants(), 'mt-6 bg-primary text-primary-foreground font-bold')}
        >
          Back to Login
        </Link>
      </div>
    </div>
  )
}
