'use client'

import { useState, useTransition } from 'react'
import { updateBusiness } from '@/actions/business'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload } from 'lucide-react'
import type { Business, Category } from '@/types/database'

const TEAM_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'] as const

interface BusinessEditFormProps {
  business: Business
  categories: Category[]
}

export function BusinessEditForm({ business, categories }: BusinessEditFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const socialLinks = (business.social_links ?? {}) as Record<string, string>

  const [formData, setFormData] = useState({
    name: business.name ?? '',
    tagline: business.tagline ?? '',
    description: business.description ?? '',
    website: business.website ?? '',
    founded_year: business.founded_year?.toString() ?? '',
    team_size: business.team_size ?? '' as string,
    city: business.city ?? '',
    country: business.country ?? '',
    phone: business.phone ?? '',
    email: business.email ?? '',
    tags: business.tags?.join(', ') ?? '',
    social_linkedin: socialLinks.linkedin ?? '',
    social_twitter: socialLinks.twitter ?? '',
    social_instagram: socialLinks.instagram ?? '',
    social_facebook: socialLinks.facebook ?? '',
    category_ids: business.category_ids ?? [] as string[],
  })

  const update = (key: string, value: string) =>
    setFormData(prev => ({ ...prev, [key]: value }))

  const toggleCategory = (id: string) => {
    setFormData(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(id)
        ? prev.category_ids.filter(c => c !== id)
        : prev.category_ids.length < 3 ? [...prev.category_ids, id] : prev.category_ids,
    }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const fd = new FormData(e.currentTarget)
    // Remove any category_ids from the native form and append from state
    formData.category_ids.forEach(id => fd.append('category_ids', id))
    startTransition(async () => {
      const result = await updateBusiness(business.id, fd)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-primary/50 bg-primary/10">
          <AlertDescription className="text-primary font-medium">Business profile updated successfully.</AlertDescription>
        </Alert>
      )}

      {/* Basic Info */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Basic Information</h2>
        <div className="space-y-2">
          <Label htmlFor="name">Business Name *</Label>
          <Input id="name" name="name" value={formData.name} onChange={e => update('name', e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tagline">Tagline</Label>
          <Input id="tagline" name="tagline" value={formData.tagline} onChange={e => update('tagline', e.target.value)} placeholder="One-line description" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" value={formData.description} onChange={e => update('description', e.target.value)} rows={5} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="founded_year">Founded Year</Label>
            <Input id="founded_year" name="founded_year" type="number" value={formData.founded_year} onChange={e => update('founded_year', e.target.value)} min="1900" max={new Date().getFullYear()} />
          </div>
          <div className="space-y-2">
            <Label>Team Size</Label>
            <Select value={formData.team_size || undefined} onValueChange={(v: string | null) => update('team_size', v ?? '')}>
              <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
              <SelectContent>
                {TEAM_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <input type="hidden" name="team_size" value={formData.team_size} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" value={formData.city} onChange={e => update('city', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country / Region</Label>
            <Input id="country" name="country" value={formData.country} onChange={e => update('country', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Categories & Tags */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Categories & Keywords</h2>
        <div>
          <Label className="mb-2 block">Categories (up to 3)</Label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map(cat => (
              <div
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className="flex items-center gap-2 p-3 bg-background border border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
              >
                <Checkbox
                  checked={formData.category_ids.includes(cat.id)}
                  onCheckedChange={() => toggleCategory(cat.id)}
                />
                <span className="text-sm">{cat.icon} {cat.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Keywords / Tags</Label>
          <Input id="tags" name="tags" value={formData.tags} onChange={e => update('tags', e.target.value)} placeholder="SaaS, fintech, B2B (comma-separated)" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" type="url" value={formData.website} onChange={e => update('website', e.target.value)} placeholder="https://yourcompany.com" />
        </div>
      </div>

      {/* Contact */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Business Email</Label>
            <Input id="email" name="email" type="email" value={formData.email} onChange={e => update('email', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" value={formData.phone} onChange={e => update('phone', e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="social_linkedin">LinkedIn</Label>
          <Input id="social_linkedin" name="social_linkedin" value={formData.social_linkedin} onChange={e => update('social_linkedin', e.target.value)} placeholder="https://linkedin.com/company/yourco" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="social_twitter">X (Twitter)</Label>
          <Input id="social_twitter" name="social_twitter" value={formData.social_twitter} onChange={e => update('social_twitter', e.target.value)} placeholder="https://x.com/yourco" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="social_instagram">Instagram</Label>
          <Input id="social_instagram" name="social_instagram" value={formData.social_instagram} onChange={e => update('social_instagram', e.target.value)} placeholder="https://instagram.com/yourco" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="social_facebook">Facebook</Label>
          <Input id="social_facebook" name="social_facebook" value={formData.social_facebook} onChange={e => update('social_facebook', e.target.value)} placeholder="https://facebook.com/yourco" />
        </div>
      </div>

      {/* Media */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Media</h2>
        <p className="text-xs text-muted-foreground">Upload a new file to replace the existing one. Leave empty to keep current.</p>
        <div className="space-y-2">
          <Label>Logo</Label>
          <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Upload new logo (PNG, JPG)</span>
            <input name="logo" type="file" accept="image/*" className="hidden" />
          </label>
        </div>
        <div className="space-y-2">
          <Label>Cover Image</Label>
          <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Upload new cover (1200×400 recommended)</span>
            <input name="cover" type="file" accept="image/*" className="hidden" />
          </label>
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full bg-primary text-primary-foreground font-bold py-3">
        {isPending ? 'Saving…' : 'Save Changes'}
      </Button>
    </form>
  )
}
