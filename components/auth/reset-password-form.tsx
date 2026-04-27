'use client'

import { useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { requestPasswordReset, updatePassword } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const isSettingNew = searchParams.get('type') === 'recovery'
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = isSettingNew
        ? await updatePassword(formData)
        : await requestPasswordReset(formData)
      if (result?.error) setError(result.error)
      else if (!isSettingNew) setSuccess(true)
    })
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">📧</div>
          <h2 className="text-xl font-bold mb-2">Check your email</h2>
          <p className="text-muted-foreground text-sm">
            We sent a password reset link to your email address.
          </p>
          <Link href="/auth/login" className="text-primary text-sm font-medium hover:underline block mt-4">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-card border border-border rounded-xl p-8">
        <h1 className="text-2xl font-bold mb-2">
          {isSettingNew ? 'Set new password' : 'Reset password'}
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          {isSettingNew
            ? 'Enter your new password below.'
            : "Enter your email and we'll send you a reset link."}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          {isSettingNew ? (
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input id="password" name="password" type="password" placeholder="Min. 8 characters" required minLength={8} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@company.com" required />
            </div>
          )}
          <Button type="submit" className="w-full bg-primary text-primary-foreground font-bold" disabled={isPending}>
            {isPending ? 'Sending…' : isSettingNew ? 'Update Password' : 'Send Reset Link'}
          </Button>
        </form>
        <Link href="/auth/login" className="text-primary text-sm font-medium hover:underline block text-center mt-4">
          Back to login
        </Link>
      </div>
    </div>
  )
}
