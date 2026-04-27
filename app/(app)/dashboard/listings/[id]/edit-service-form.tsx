'use client'

import { useState, useTransition } from 'react'
import { updateService } from '@/actions/services'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Service } from '@/types/database'

type PricingModel = 'fixed' | 'hourly' | 'project' | 'contact'

interface EditServiceFormProps {
  service: Service
}

export function EditServiceForm({ service }: EditServiceFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [formData, setFormData] = useState({
    title: service.title,
    description: service.description ?? '',
    pricing_model: (service.pricing_model ?? '') as PricingModel | '',
    price_from: service.price_from?.toString() ?? '',
    price_to: service.price_to?.toString() ?? '',
  })

  const update = (key: keyof typeof formData, value: string) =>
    setFormData(prev => ({ ...prev, [key]: value }))

  const showPriceFields = formData.pricing_model !== 'contact' && formData.pricing_model !== ''

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const fd = new FormData()
    fd.set('title', formData.title)
    fd.set('description', formData.description)
    fd.set('pricing_model', formData.pricing_model)
    if (formData.price_from) fd.set('price_from', formData.price_from)
    if (formData.price_to) fd.set('price_to', formData.price_to)

    startTransition(async () => {
      const result = await updateService(service.id, fd)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-8">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="mb-4">
          <AlertDescription>Service updated successfully.</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Service Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={e => update('title', e.target.value)}
            placeholder="e.g. Brand Strategy Consultation"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={e => update('description', e.target.value)}
            placeholder="Describe what this service includes…"
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label>Pricing Model</Label>
          <Select
            value={formData.pricing_model || undefined}
            onValueChange={(v: string | null) => update('pricing_model', v ?? '')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select pricing model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed Price</SelectItem>
              <SelectItem value="hourly">Hourly Rate</SelectItem>
              <SelectItem value="project">Per Project</SelectItem>
              <SelectItem value="contact">Contact for Pricing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showPriceFields && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_from">Price From ($)</Label>
              <Input
                id="price_from"
                type="number"
                min="0"
                value={formData.price_from}
                onChange={e => update('price_from', e.target.value)}
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_to">
                Price To ($){' '}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="price_to"
                type="number"
                min="0"
                value={formData.price_to}
                onChange={e => update('price_to', e.target.value)}
                placeholder="500"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-primary text-primary-foreground font-bold"
          >
            {isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
