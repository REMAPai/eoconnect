'use client'

import { useState, useTransition } from 'react'
import { signUp } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GoogleButton } from './google-button'
import Link from 'next/link'

export function SignupForm() {
  const [error, setError] = useState<string | null>(null)
  const [membershipType, setMembershipType] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await signUp(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Join Member Market</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Exclusive to verified members
        </p>

        <GoogleButton label="Sign up with Google" />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" name="fullName" placeholder="Alex Thompson" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Membership Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@company.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="membershipType">EO Membership Type *</Label>
            <Select value={membershipType} onValueChange={(v: string | null) => setMembershipType(v ?? '')}>
              <SelectTrigger id="membershipType">
                <SelectValue placeholder="Select your status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_member">Current EO Member</SelectItem>
                <SelectItem value="alumni">EO Alumni</SelectItem>
                <SelectItem value="accelerator">EO Accelerator</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="membershipType" value={membershipType} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chapter">EO Chapter</Label>
            <Input id="chapter" name="chapter" placeholder="e.g. EO London" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="Min. 8 characters" required minLength={8} />
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground font-bold" disabled={isPending}>
            {isPending ? 'Creating account…' : 'Create Account'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          By registering you confirm you are an active member.
        </p>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
