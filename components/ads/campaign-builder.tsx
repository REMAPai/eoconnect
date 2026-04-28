'use client'

import { useState, useTransition } from 'react'
import { createCampaign } from '@/actions/ads'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronLeft, ChevronRight, MousePointerClick } from 'lucide-react'
import type { Category } from '@/types/database'
import { toast } from 'sonner'

const STEPS = ['Format', 'Targeting', 'Bid & Budget', 'Review']

interface Props {
  categories: Category[]
  defaultCategoryIds: string[]
  defaultKeywords: string
  stripeEnabled: boolean
}

export function CampaignBuilder({ categories, defaultCategoryIds, defaultKeywords, stripeEnabled }: Props) {
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [data, setData] = useState({
    format: 'sponsored_listing' as 'sponsored_listing' | 'banner',
    goal: 'sponsored_search' as 'sponsored_search' | 'more_views',
    target_category_ids: defaultCategoryIds.slice(0, 5),
    keywords: defaultKeywords,
    bid_cpc: '1.00',
    budget_total: '50',
    daily_pacing_cap: '',
    start_date: '',
    end_date: '',
    creative_url: '',
  })

  const update = <K extends keyof typeof data>(key: K, val: typeof data[K]) =>
    setData(prev => ({ ...prev, [key]: val }))

  const toggleCategory = (id: string) => {
    setData(prev => ({
      ...prev,
      target_category_ids: prev.target_category_ids.includes(id)
        ? prev.target_category_ids.filter(c => c !== id)
        : prev.target_category_ids.length < 5 ? [...prev.target_category_ids, id] : prev.target_category_ids
    }))
  }

  const next = () => {
    if (step === 0 && !data.format) { setError('Choose a format'); return }
    if (step === 1 && data.target_category_ids.length === 0 && !data.keywords.trim()) {
      setError('Pick at least one category or keyword to target'); return
    }
    if (step === 2) {
      const bid = Number(data.bid_cpc); const budget = Number(data.budget_total)
      if (isNaN(bid) || bid < 0.10) { setError('Minimum bid is $0.10/click'); return }
      if (isNaN(budget) || budget < 10) { setError('Minimum total budget is $10'); return }
      if (budget < bid * 5) { setError('Total budget should cover at least 5 clicks'); return }
    }
    setError(null); setStep(s => s + 1)
  }

  const submit = () => {
    setError(null)
    const fd = new FormData()
    fd.set('format', data.format)
    fd.set('goal', data.goal)
    data.target_category_ids.forEach(id => fd.append('target_category_ids', id))
    fd.set('target_keywords', data.keywords)
    fd.set('bid_cpc', data.bid_cpc)
    fd.set('budget_total', data.budget_total)
    if (data.daily_pacing_cap) fd.set('daily_pacing_cap', data.daily_pacing_cap)
    if (data.start_date) fd.set('start_date', data.start_date)
    if (data.end_date) fd.set('end_date', data.end_date)
    if (data.creative_url) fd.set('creative_url', data.creative_url)

    startTransition(async () => {
      const result = await createCampaign(fd)
      if (result.error) { setError(result.error); return }
      if (result.checkout_url) {
        toast.success('Redirecting to payment…')
        window.location.href = result.checkout_url
      } else {
        toast.success('Campaign submitted for review')
        window.location.href = `/dashboard/ads/${result.campaign_id}`
      }
    })
  }

  const expectedClicks = Math.floor(Number(data.budget_total) / Math.max(Number(data.bid_cpc), 0.01))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span className={i === step ? 'font-semibold text-foreground' : i < step ? 'text-primary' : ''}>
              {i + 1}. {label}
            </span>
            {i < STEPS.length - 1 && <span>›</span>}
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        {/* Step 0: Format */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Pick a campaign format</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormatCard
                title="Sponsored Listing"
                description="Your business appears at the top of relevant search results and category pages."
                selected={data.format === 'sponsored_listing'}
                onClick={() => { update('format', 'sponsored_listing'); update('goal', 'sponsored_search') }}
              />
              <FormatCard
                title="Banner Ad"
                description="A visual banner placed on the marketplace homepage."
                selected={data.format === 'banner'}
                onClick={() => { update('format', 'banner'); update('goal', 'more_views') }}
              />
            </div>
            {data.format === 'banner' && (
              <div className="space-y-2">
                <Label htmlFor="creative_url">Banner image URL (1200×400 recommended)</Label>
                <Input id="creative_url" type="url" value={data.creative_url} onChange={e => update('creative_url', e.target.value)} placeholder="https://…" />
              </div>
            )}
          </div>
        )}

        {/* Step 1: Targeting */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Who should see your ad?</h2>
            <div>
              <Label className="mb-2 block">Categories (up to 5)</Label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => (
                  <div
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className="flex items-center gap-2 p-2.5 bg-background border border-border rounded-lg cursor-pointer hover:border-primary"
                  >
                    <Checkbox
                      checked={data.target_category_ids.includes(cat.id)}
                      onCheckedChange={() => toggleCategory(cat.id)}
                    />
                    <span className="text-sm">{cat.icon} {cat.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords (comma-separated)</Label>
              <Input
                id="keywords"
                value={data.keywords}
                onChange={e => update('keywords', e.target.value)}
                placeholder="fintech, B2B SaaS, sydney"
              />
              <p className="text-xs text-muted-foreground">Up to 15 keywords. Match queries containing any of these words.</p>
            </div>
          </div>
        )}

        {/* Step 2: Bid & Budget */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Set your bid and budget</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bid_cpc">Bid per click ($)</Label>
                <Input id="bid_cpc" type="number" step="0.10" min="0.10" max="50" value={data.bid_cpc} onChange={e => update('bid_cpc', e.target.value)} />
                <p className="text-xs text-muted-foreground">Higher bid = better placement.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget_total">Total budget ($)</Label>
                <Input id="budget_total" type="number" step="1" min="10" value={data.budget_total} onChange={e => update('budget_total', e.target.value)} />
                <p className="text-xs text-muted-foreground">Minimum $10. Pay upfront via Stripe.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="daily_pacing_cap">Daily pacing cap ($) <span className="text-muted-foreground font-normal">— optional</span></Label>
              <Input id="daily_pacing_cap" type="number" step="1" min="1" value={data.daily_pacing_cap} onChange={e => update('daily_pacing_cap', e.target.value)} placeholder="No limit" />
              <p className="text-xs text-muted-foreground">Cap how much you spend per day to extend the campaign duration.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start date <span className="text-muted-foreground font-normal">— optional</span></Label>
                <Input id="start_date" type="date" value={data.start_date} onChange={e => update('start_date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End date <span className="text-muted-foreground font-normal">— optional</span></Label>
                <Input id="end_date" type="date" value={data.end_date} onChange={e => update('end_date', e.target.value)} />
              </div>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
              <MousePointerClick className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">~{expectedClicks} expected clicks</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Based on ${data.bid_cpc}/click × ${data.budget_total} budget.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review and launch</h2>
            <div className="bg-background border border-border rounded-xl p-4 space-y-2 text-sm">
              <Row label="Format" value={data.format.replace('_', ' ')} />
              <Row label="Categories" value={`${data.target_category_ids.length} selected`} />
              <Row label="Keywords" value={data.keywords ? data.keywords.split(',').filter(Boolean).length + ' keywords' : '—'} />
              <Row label="Bid" value={`$${data.bid_cpc} per click`} />
              <Row label="Total budget" value={`$${data.budget_total}`} />
              <Row label="Expected clicks" value={`~${expectedClicks}`} />
              {data.daily_pacing_cap && <Row label="Daily cap" value={`$${data.daily_pacing_cap}`} />}
              {data.start_date && <Row label="Start" value={data.start_date} />}
              {data.end_date && <Row label="End" value={data.end_date} />}
            </div>
            <p className="text-xs text-muted-foreground">
              {stripeEnabled
                ? "After payment, your campaign goes to admin review. Once approved, it'll start serving."
                : "Payment is not yet configured — your campaign will go straight to admin review (no charge)."}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next} className="ml-auto gap-1 bg-primary text-primary-foreground font-bold">
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={submit} disabled={isPending} className="ml-auto bg-primary text-primary-foreground font-bold">
              {isPending ? 'Submitting…' : stripeEnabled ? 'Pay & Launch' : 'Submit for Review'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function FormatCard({ title, description, selected, onClick }: { title: string; description: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-xl border-2 transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/50'
      }`}
    >
      <p className="font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </button>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  )
}
