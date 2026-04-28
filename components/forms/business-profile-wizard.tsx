'use client'

import { useState, useTransition, useRef } from 'react'
import { createBusiness } from '@/actions/business'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { ChevronRight, ChevronLeft, Upload, X } from 'lucide-react'
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
    custom_categories: '',
  })

  // File state
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([])
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([])

  // File input refs
  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const portfolioInputRef = useRef<HTMLInputElement>(null)

  const update = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }))

  const toggleCategory = (id: string) => {
    setFormData(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(id)
        ? prev.category_ids.filter(c => c !== id)
        : prev.category_ids.length < 3 ? [...prev.category_ids, id] : prev.category_ids
    }))
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - portfolioFiles.length)
    if (!files.length) return
    setPortfolioFiles(prev => [...prev, ...files].slice(0, 5))
    setPortfolioPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))].slice(0, 5))
    e.target.value = ''
  }

  const removePortfolioImage = (index: number) => {
    setPortfolioFiles(prev => prev.filter((_, i) => i !== index))
    setPortfolioPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    formData.category_ids.forEach(id => fd.append('category_ids', id))
    if (logoFile) fd.set('logo', logoFile)
    if (coverFile) fd.set('cover', coverFile)
    portfolioFiles.forEach(f => fd.append('portfolio', f))
    if (formData.custom_categories.trim()) fd.set('custom_categories', formData.custom_categories)
    startTransition(async () => {
      const result = await createBusiness(fd)
      if (result?.error) setError(result.error)
    })
  }

  const progress = ((step + 1) / STEPS.length) * 100
  const totalCategories = formData.category_ids.length + formData.custom_categories.split(',').filter(s => s.trim()).length

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
              <Input id="name" value={formData.name} onChange={e => update('name', e.target.value)} placeholder="Acme Consulting Ltd." required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input id="tagline" value={formData.tagline} onChange={e => update('tagline', e.target.value)} placeholder="One-line description of what you do" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={formData.description} onChange={e => update('description', e.target.value)} placeholder="Describe your business, what makes you different…" rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="founded_year">Founded Year</Label>
                <Input id="founded_year" type="number" value={formData.founded_year} onChange={e => update('founded_year', e.target.value)} placeholder="2018" min="1900" max={new Date().getFullYear()} />
              </div>
              <div className="space-y-2">
                <Label>Team Size</Label>
                <Select value={formData.team_size} onValueChange={(v: string | null) => update('team_size', v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent>
                    {TEAM_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={formData.city} onChange={e => update('city', e.target.value)} placeholder="London" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={formData.country} onChange={e => update('country', e.target.value)} placeholder="United Kingdom" />
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
              <Label htmlFor="custom_categories">Custom category (not in the list above)</Label>
              <Input
                id="custom_categories"
                value={formData.custom_categories}
                onChange={e => update('custom_categories', e.target.value)}
                placeholder="e.g. Blockchain, Aerospace (comma-separated)"
                disabled={totalCategories >= 3}
              />
              <p className="text-xs text-muted-foreground">
                {totalCategories >= 3 ? 'Maximum 3 categories selected.' : `${3 - totalCategories} remaining slots`}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Keywords / Tags</Label>
              <Input id="tags" value={formData.tags} onChange={e => update('tags', e.target.value)} placeholder="SaaS, fintech, B2B (comma-separated)" />
              <p className="text-xs text-muted-foreground">Add up to 10 keywords to improve discoverability.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" type="url" value={formData.website} onChange={e => update('website', e.target.value)} placeholder="https://yourcompany.com" />
            </div>
          </div>
        )}

        {/* Step 2: Contact */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Contact Details</h2>
            <div className="space-y-2">
              <Label htmlFor="email">Business Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={e => update('email', e.target.value)} placeholder="hello@yourcompany.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={formData.phone} onChange={e => update('phone', e.target.value)} placeholder="+44 20 7946 0958" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social_linkedin">LinkedIn</Label>
              <Input id="social_linkedin" value={formData.social_linkedin} onChange={e => update('social_linkedin', e.target.value)} placeholder="https://linkedin.com/company/yourco" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social_twitter">X (Twitter)</Label>
              <Input id="social_twitter" value={formData.social_twitter} onChange={e => update('social_twitter', e.target.value)} placeholder="https://x.com/yourco" />
            </div>
          </div>
        )}

        {/* Step 3: Media */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">Add Media</h2>

            {/* Logo */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                <div
                  className="relative h-20 w-20 rounded-xl border-2 border-border overflow-hidden flex-shrink-0 bg-muted cursor-pointer hover:border-primary transition-colors"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <button type="button" onClick={() => logoInputRef.current?.click()} className="text-sm text-primary hover:underline font-medium">
                    {logoPreview ? 'Change logo' : 'Upload logo'}
                  </button>
                  <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG up to 5MB · Recommended: 400×400px</p>
                  {logoFile && <p className="text-xs text-primary mt-0.5">{logoFile.name} selected ✓</p>}
                </div>
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
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
                    <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
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
              </div>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
            </div>

            {/* Portfolio */}
            <div className="space-y-2">
              <Label>Portfolio Images (up to 5)</Label>
              {portfolioPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {portfolioPreviews.map((src, i) => (
                    <div key={i} className="relative h-24 rounded-lg overflow-hidden border border-border group">
                      <img src={src} alt={`Portfolio ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePortfolioImage(i)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {portfolioFiles.length < 5 && (
                <label
                  className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors"
                  onClick={() => portfolioInputRef.current?.click()}
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {portfolioFiles.length > 0 ? `Add more (${5 - portfolioFiles.length} remaining)` : 'Upload portfolio images'}
                  </span>
                </label>
              )}
              <input ref={portfolioInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePortfolioChange} />
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
                <div className="flex justify-between"><span className="text-muted-foreground">Categories</span><span>{totalCategories} selected</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Keywords</span><span>{formData.tags ? formData.tags.split(',').filter(Boolean).length : 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Logo</span><span>{logoFile ? '✓ uploaded' : '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cover</span><span>{coverFile ? '✓ uploaded' : '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Portfolio</span><span>{portfolioFiles.length > 0 ? `${portfolioFiles.length} image(s)` : '—'}</span></div>
              </div>
              <p className="text-sm text-muted-foreground">
                Your listing will go live immediately. You can edit or pause it at any time from your dashboard.
              </p>
              {/* Hidden fields for all string form data */}
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
