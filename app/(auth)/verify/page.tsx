import Link from 'next/link'

export default function VerifyPage() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <div className="text-5xl mb-4">✉️</div>
        <h1 className="text-2xl font-bold mb-2">Verify your email</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          We sent a verification link to your email. Click it to activate your EOconnect account.
        </p>
        <p className="text-muted-foreground text-xs mt-4">
          Didn&apos;t get it? Check your spam folder or{' '}
          <Link href="/auth/signup" className="text-primary hover:underline">try again</Link>.
        </p>
        <Link href="/auth/login" className="text-primary text-sm font-medium hover:underline block mt-6">
          Back to login
        </Link>
      </div>
    </div>
  )
}
