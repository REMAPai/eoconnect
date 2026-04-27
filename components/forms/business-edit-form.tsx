'use client'

import { useState, useTransition, useRef } from 'react'
import Image from 'next/image'
import { updateBusiness, type BusinessActionResult } from '@/actions/business'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, X } from 'lucide-react'
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
  const [logoPreview, setLogoPreview] = useState<string | null>(business.logo_url ?? null)
  const [coverPreview, setCoverPreview] = useState<string | null>(business.cover_url ?? null)
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([])
  const [portfolioNewPreviews, setPortfolioNewPreviews] = useState<string[]>([])
  const [portfolioExisting, setPortfolioExisting] = useState<string[]>((business as { portfolio_urls?: string[] }).portfolio_urls ?? [])
  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const portfolioInputRef = useRef<HTMLInputElement>(null)

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

  const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - portfolioFiles.length - portfolioExisting.length)
    if (!files.length) return
    setPortfolioFiles(prev => [...prev, ...files].slice(0, 5 - portfolioExisting.length))
    setPortfolioNewPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))].slice(0, 5 - portfolioExisting.length))
    e.target.value = ''
  }

  const removeExistingPortfolio = (index: number) => {
    setPortfolioExisting(prev => prev.filter((_, i) => i !== index))
  }

  const removeNewPortfolio = (index: number) => {
    setPortfolioFiles(prev => prev.filter((_, i) => i !== index))
    setPortfolioNewPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const fd = new FormData(e.currentTarget)
    formData.category_ids.forEach(id => fd.append('category_ids', id))
    portfolioFiles.forEach(f => fd.append('portfolio', f))
    portfolioExisting.forEach(url => fd.append('portfolio_keep', url))
    startTransition(async () => {
      const result: BusinessActionResult = await updateBusiness(business.id, fd)
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
        <p className="text-xs text-muted-foreground">Click to upload a new file. Leave empty to keep current.</p>

        {/* Logo */}
        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            <div
              className="relative h-20 w-20 rounded-xl border-2 border-border overflow-hidden flex-shrink-0 bg-muted cursor-pointer hover:border-primary transition-colors"
              onClick={() => logoInputRef.current?.click()}
            >
              {logoPreview ? (
                <Image src={logoPreview} alt="Logo preview" fill className="object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="text-sm text-primary hover:underline font-medium"
              >
                {logoPreview ? 'Change logo' : 'Upload logo'}
              </button>
              <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG up to 5MB</p>
              {logoPreview && logoPreview !== business.logo_url && (
                <p className="text-xs text-primary mt-0.5">New file selected ✓</p>
              )}
            </div>
            <input
              ref={logoInputRef}
              name="logo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) setLogoPreview(URL.createObjectURL(file))
              }}
            />
          </div>
        </div>

        {/* Cover */}
        <div className="space-y-2">
          <Label>Cover Image</Label>
          <div
            className="relative w-full h-36 rounded-xl border-2 border-dashed border-border overflow-hidden cursor-pointer hover:border-primary transition-colors bg-muted"
            onClick={() => coverInputRef.current?.click()}
          >
            {coverPreview ? (
              <>
                <Image src={coverPreview} alt="Cover preview" fill className="object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2 text-white text-sm font-medium">
                    <Upload className="h-4 w-4" /> Change cover
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center gap-2">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Upload cover (1200×400 recommended)</span>
              </div>
            )}
            {coverPreview && coverPreview !== business.cover_url && (
              <span className="absolute bottom-2 right-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">New file selected ✓</span>
            )}
          </div>
          <input
            ref={coverInputRef}
            name="cover"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) setCoverPreview(URL.createObjectURL(file))
            }}
          />
        </div>

        {/* Portfolio */}
        <div className="space-y-2">
          <Label>Portfolio Images (up to 5)</Label>
          {(portfolioExisting.length > 0 || portfolioNewPreviews.length > 0) && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {portfolioExisting.map((src, i) => (
                <div key={`existing-${i}`} className="relative h-24 rounded-lg overflow-hidden border border-border group">
                  <Image src={src} alt={`Portfolio ${i + 1}`} fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingPortfolio(i)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {portfolioNewPreviews.map((src, i) => (
                <div key={`new-${i}`} className="relative h-24 rounded-lg overflow-hidden border border-primary/50 group">
                  <Image src={src} alt={`New portfolio ${i + 1}`} fill className="object-cover" />
                  <span className="absolute bottom-1 left-1 text-xs bg-primary text-primary-foreground px-1 rounded">New</span>
                  <button
                    type="button"
                    onClick={() => removeNewPortfolio(i)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {(portfolioExisting.length + portfolioFiles.length) < 5 && (
            <div
              className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors"
              onClick={() => portfolioInputRef.current?.click()}
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {portfolioExisting.length + portfolioFiles.length > 0
                  ? `Add more (${5 - portfolioExisting.length - portfolioFiles.length} remaining)`
                  : 'Upload portfolio images'}
              </span>
            </div>
          )}
          <input
            ref={portfolioInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePortfolioChange}
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full bg-primary text-primary-foreground font-bold py-3">
        {isPending ? 'Saving…' : 'Save Changes'}
      </Button>
    </form>
  )
}
