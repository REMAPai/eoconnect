'use client'

import { useState, useTransition, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload } from 'lucide-react'
import { updateProfile } from '@/actions/profile'
import { ChapterPicker, type Chapter } from '@/components/forms/chapter-picker'

interface Props {
  chapters: Chapter[]
  currentAvatar: string | null
  defaultName: string
  defaultChapter: string
  defaultMembershipType: string
}

export function AccountForm({ chapters, currentAvatar, defaultName, defaultChapter, defaultMembershipType }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [membershipType, setMembershipType] = useState(defaultMembershipType)
  const [chapter, setChapter] = useState<Chapter | null>(
    chapters.find(c => c.name === defaultChapter) ?? null
  )
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentAvatar)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (!chapter) {
      setError('Please select your EO chapter')
      return
    }
    const fd = new FormData(e.currentTarget)
    fd.set('eo_membership_type', membershipType)
    fd.set('eo_chapter', chapter.name)
    fd.set('region', chapter.region)
    fd.set('chapter_country', chapter.country ?? '')
    fd.set('chapter_city', chapter.city ?? '')
    if (avatarFile) fd.set('avatar', avatarFile)
    startTransition(async () => {
      const result = await updateProfile(fd)
      if (result.error) setError(result.error)
      else { setSuccess(true); setAvatarFile(null) }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-5">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && (
        <Alert className="border-primary/50 bg-primary/10">
          <AlertDescription className="text-primary font-medium">Profile updated.</AlertDescription>
        </Alert>
      )}

      {/* Avatar */}
      <div className="space-y-2">
        <Label>Profile Photo</Label>
        <div className="flex items-center gap-4">
          <div
            onClick={() => avatarInputRef.current?.click()}
            className="relative h-20 w-20 rounded-full border-2 border-border overflow-hidden flex-shrink-0 bg-muted cursor-pointer hover:border-primary transition-colors"
          >
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div>
            <button type="button" onClick={() => avatarInputRef.current?.click()} className="text-sm text-primary hover:underline font-medium">
              {avatarPreview ? 'Change photo' : 'Upload photo'}
            </button>
            <p className="text-xs text-muted-foreground mt-0.5">PNG or JPG · Square works best · Max 5MB</p>
            {avatarFile && <p className="text-xs text-primary mt-0.5">{avatarFile.name} selected ✓</p>}
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="full_name">Full Name *</Label>
        <Input id="full_name" name="full_name" defaultValue={defaultName} required minLength={2} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="eo_membership_type">EO Membership Type *</Label>
        <Select value={membershipType} onValueChange={(v: string | null) => setMembershipType(v ?? '')}>
          <SelectTrigger id="eo_membership_type">
            <SelectValue placeholder="Select your status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current_member">Current EO Member</SelectItem>
            <SelectItem value="alumni">EO Alumni</SelectItem>
            <SelectItem value="accelerator">EO Accelerator</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>EO Chapter *</Label>
        <ChapterPicker chapters={chapters} value={chapter?.name ?? null} onChange={setChapter} />
        {chapter && (chapter.country || chapter.city) && (
          <p className="text-xs text-muted-foreground">
            Region: <span className="text-foreground">{chapter.region}</span>
            {chapter.country && <> · Country: <span className="text-foreground">{chapter.country}</span></>}
            {chapter.city && <> · City: <span className="text-foreground">{chapter.city}</span></>}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isPending || !membershipType || !chapter} className="w-full bg-primary text-primary-foreground font-bold">
        {isPending ? 'Saving…' : 'Save Profile'}
      </Button>
    </form>
  )
}
