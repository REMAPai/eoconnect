'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const ServiceSchema = z.object({
  title: z.string().min(3, 'Service title required'),
  description: z.string().optional(),
  pricing_model: z.enum(['fixed', 'hourly', 'project', 'contact']),
  price_from: z.coerce.number().min(0).optional(),
  price_to: z.coerce.number().min(0).optional(),
})

export type ServiceActionResult = { error: string | null; id?: string }

// The Database type uses Partial<T> for Insert/Update which causes
// Supabase's TS generics to resolve mutation payloads as `never`.
// We cast the client to a looser type for mutation calls only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

export async function createService(business_id: string, formData: FormData): Promise<ServiceActionResult> {
  const supabase: AnyClient = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', business_id)
    .eq('owner_id', user.id)
    .single()

  if (!business) return { error: 'Business not found or not authorized' }

  const parsed = ServiceSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    pricing_model: formData.get('pricing_model'),
    price_from: formData.get('price_from'),
    price_to: formData.get('price_to'),
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data, error } = await supabase
    .from('services')
    .insert({ ...parsed.data, business_id, status: 'published' })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { error: null, id: data.id }
}

export async function updateService(id: string, formData: FormData): Promise<ServiceActionResult> {
  const supabase: AnyClient = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // verify ownership via join
  const { data: service } = await supabase
    .from('services')
    .select('id, business_id, businesses!inner(owner_id)')
    .eq('id', id)
    .single()

  if (!service || service.businesses.owner_id !== user.id) {
    return { error: 'Not authorized' }
  }

  const parsed = ServiceSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    pricing_model: formData.get('pricing_model'),
    price_from: formData.get('price_from'),
    price_to: formData.get('price_to'),
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('services').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/listings')
  return { error: null }
}

export async function deleteService(id: string): Promise<ServiceActionResult> {
  const supabase: AnyClient = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // fetch service and verify ownership via join before deleting
  const { data: service } = await supabase
    .from('services')
    .select('id, businesses!inner(owner_id)')
    .eq('id', id)
    .single()

  if (!service || service.businesses.owner_id !== user.id) {
    return { error: 'Not authorized' }
  }

  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/listings')
  return { error: null }
}
