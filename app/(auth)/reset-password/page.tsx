import { Suspense } from 'react'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md h-64 animate-pulse rounded-xl bg-card border border-border" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
