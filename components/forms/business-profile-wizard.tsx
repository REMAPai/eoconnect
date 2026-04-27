'use client'

import { useState, useTransition } from 'react'
import { createBusiness } from '@/actions/business'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { ChevronRight, ChevronLeft, Upload } from 'lucide-react'
import type { Category } from '@/types/database'

const STEPS = ['Business Basics', 'Categories & Keywords', 'Contact Details', 'Media', 'Review & Publish']
const TEAM_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'] as const

interface WizardProps {
  categories: Category[]
}

export function BusinessProfileWizard({ categories }: WizardProps) {
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    name: '', tagline: '', description: '', website: '',
    founded_year: '', team_size: '' as string,
    city: '', country: '',
    category_ids: [] as string[], tags: '',
    phone: '', email: '',
    social_linkedin: '', social_twitter: '',
  })

  const update = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }))
  const toggleCategory = (id: string) => {
    setFormData(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(id)
        ? prev.category_ids.filter(c => c !== id)
        : prev.category_ids.length < 3 ? [...prev.category_ids, id] : prev.category_ids
    }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    formData.category_ids.forEach(id => fd.append('category_ids', id))
    startTransition(async () => {
      const result = await createBusiness(fd)
      if (result?.error) setError(result.error)
    })
  }

  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
          <span className="text-sm font-medium">{STEPS[step]}</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <div className="bg-card border border-border rounded-2xl p-8">
        {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

        {/* Step 0: Business Basics */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Tell us about your business</h2>
            <div className="space-y-2">
              <Label htmlFor="name">Business Name *</Label>
              <Input id="name" name="name" value={formData.name} onChange={e => update('name', e.target.value)} placeholder="Acme Consulting Ltd." required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input id="tagline" name="tagline" value={formData.tagline} onChange={e => update('tagline', e.target.value)} placeholder="One-line description of what you do" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={e => update('description', e.target.value)} placeholder="Describe your business, what makes you different…" rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="founded_year">Founded Year</Label>
                <Input id="founded_year" name="founded_year" type="number" value={formData.founded_year} onChange={e => update('founded_year', e.target.value)} placeholder="2018" min="1900" max={new Date().getFullYear()} />
              </div>
              <div className="space-y-2">
                <Label>Team Size</Label>
                <Select value={formData.team_size} onValueChange={(v: string | null) => update('team_size', v ?? '')}>
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
                <Input id="city" name="city" value={formData.city} onChange={e => update('city', e.target.value)} placeholder="London" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" name="country" value={formData.country} onChange={e => update('country', e.target.value)} placeholder="United Kingdom" />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Categories */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Categories & Keywords</h2>
            <div>
              <Label className="mb-2 block">Select up to 3 categories</Label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 p-3 bg-background border border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
                    onClick={() => toggleCategory(cat.id)}
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
              <p className="text-xs text-muted-foreground">Add up to 10 keywords to improve discoverability.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" type="url" value={formData.website} onChange={e => update('website', e.target.value)} placeholder="https://yourcompany.com" />
            </div>
          </div>
        )}

        {/* Step 2: Contact */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Contact Details</h2>
            <div className="space-y-2">
              <Label htmlFor="email">Business Email</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={e => update('email', e.target.value)} placeholder="hello@yourcompany.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" value={formData.phone} onChange={e => update('phone', e.target.value)} placeholder="+44 20 7946 0958" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social_linkedin">LinkedIn</Label>
              <Input id="social_linkedin" name="social_linkedin" value={formData.social_linkedin} onChange={e => update('social_linkedin', e.target.value)} placeholder="https://linkedin.com/company/yourco" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social_twitter">X (Twitter)</Label>
              <Input id="social_twitter" name="social_twitter" value={formData.social_twitter} onChange={e => update('social_twitter', e.target.value)} placeholder="https://x.com/yourco" />
            </div>
          </div>
        )}

        {/* Step 3: Media */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Add Media</h2>
            <div className="space-y-2">
              <Label>Logo</Label>
              <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Upload logo (PNG, JPG, max 5MB)</span>
                <input name="logo" type="file" accept="image/*" className="hidden" />
              </label>
            </div>
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Upload cover image (1200×400 recommended)</span>
                <input name="cover" type="file" accept="image/*" className="hidden" />
              </label>
            </div>
            <div className="space-y-2">
              <Label>Portfolio Images (up to 5)</Label>
              <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Upload portfolio images</span>
                <input name="portfolio" type="file" accept="image/*" multiple className="hidden" />
              </label>
            </div>
          </div>
        )}

        {/* Step 4: Review & Publish */}
        {step === 4 && (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Review & Publish</h2>
              <div className="bg-background border border-border rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Business</span><span className="font-medium">{formData.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span>{[formData.city, formData.country].filter(Boolean).join(', ') || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Categories</span><span>{formData.category_ids.length} selected</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tags</span><span>{formData.tags ? formData.tags.split(',').length : 0} keywords</span></div>
              </div>
              <p className="text-sm text-muted-foreground">
                Your listing will go live immediately. You can edit or pause it at any time from your dashboard.
              </p>
              {Object.entries(formData).map(([key, val]) =>
                key !== 'category_ids' && typeof val === 'string' ? (
                  <input key={key} type="hidden" name={key} value={val} />
                ) : null
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1 gap-1">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1 bg-primary text-primary-foreground font-bold">
                {isPending ? 'Publishing…' : 'Publish Listing'}
              </Button>
            </div>
          </form>
        )}

        {/* Navigation (non-final steps) */}
        {step < 4 && (
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1 gap-1">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            )}
            <Button
              type="button"
              onClick={() => {
                if (step === 0 && !formData.name.trim()) { setError('Business name is required'); return }
                setError(null)
                setStep(s => s + 1)
              }}
              className="flex-1 bg-primary text-primary-foreground font-bold gap-1"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
