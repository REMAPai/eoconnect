'use server'

import { createClient } from '@/lib/supabase/server'
import { uploadFile } from '@/lib/storage'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const BusinessSchema = z.object({
  name: z.string().min(2, 'Business name required'),
  tagline: z.string().optional(),
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  founded_year: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(1900).max(new Date().getFullYear()).optional()
  ),
  team_size: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  category_ids: z.array(z.string()).max(3).optional(),
  tags: z.array(z.string()).max(10).optional(),
})

export type BusinessActionResult = { error: string | null; id?: string }

export async function createBusiness(formData: FormData): Promise<BusinessActionResult> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = {
    name: formData.get('name'),
    tagline: formData.get('tagline'),
    description: formData.get('description'),
    website: formData.get('website'),
    founded_year: formData.get('founded_year'),
    team_size: formData.get('team_size'),
    city: formData.get('city'),
    country: formData.get('country'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    category_ids: formData.getAll('category_ids'),
    tags: (formData.get('tags') as string | null)?.split(',').map(t => t.trim()).filter(Boolean) ?? [],
  }

  const parsed = BusinessSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  let logo_url: string | undefined
  let cover_url: string | undefined

  const logoFile = formData.get('logo') as File | null
  const coverFile = formData.get('cover') as File | null

  try {
    if (logoFile && logoFile.size > 0) {
      logo_url = await uploadFile('eoconnect-media', `logos/${user.id}-${Date.now()}`, logoFile)
    }
    if (coverFile && coverFile.size > 0) {
      cover_url = await uploadFile('eoconnect-media', `covers/${user.id}-${Date.now()}`, coverFile)
    }

    const portfolioFiles = formData.getAll('portfolio') as File[]
    const portfolio_urls: string[] = []
    for (const file of portfolioFiles.slice(0, 5)) {
      if (file.size > 0) {
        const url = await uploadFile('eoconnect-media', `portfolio/${user.id}-${Date.now()}-${Math.random()}`, file)
        portfolio_urls.push(url)
      }
    }

    const social_links: Record<string, string> = {}
    for (const platform of ['linkedin', 'twitter', 'instagram', 'facebook']) {
      const val = formData.get(`social_${platform}`) as string | null
      if (val) social_links[platform] = val
    }

    // Handle custom categories: insert or find each, then merge IDs
    const customCatsRaw = formData.get('custom_categories') as string | null
    const customCatNames = customCatsRaw?.split(',').map(s => s.trim()).filter(Boolean) ?? []
    const extraCategoryIds: string[] = []
    for (const name of customCatNames) {
      const { data: found } = await db.from('categories').select('id').ilike('name', name).single()
      if (found?.id) {
        extraCategoryIds.push(found.id)
      } else {
        const { data: created } = await db.from('categories').insert({ name, active: true }).select('id').single()
        if (created?.id) extraCategoryIds.push(created.id)
      }
    }
    const mergedCategoryIds = [...(parsed.data.category_ids ?? []), ...extraCategoryIds].slice(0, 3)

    const { data, error } = await db
      .from('businesses')
      .insert({
        owner_id: user.id,
        ...parsed.data,
        category_ids: mergedCategoryIds,
        logo_url,
        cover_url,
        portfolio_urls,
        social_links,
        status: 'published',
      })
      .select('id')
      .single()

    if (error) return { error: error.message }
    void data

    // Mark new-user onboarding fully complete (only if not already set).
    // Existing users were grandfathered in migration 005, so this is a no-op for them.
    await db.from('profiles')
      .update({ onboarded_at: new Date().toISOString() })
      .eq('id', user.id)
      .is('onboarded_at', null)

    revalidatePath('/marketplace')
    redirect('/dashboard/listings')
  } catch (err) {
    if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) throw err
    return { error: err instanceof Error ? err.message : 'Failed to create business' }
  }
}

export async function updateBusiness(id: string, formData: FormData): Promise<BusinessActionResult> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: existing } = await db
    .from('businesses')
    .select('id, owner_id')
    .eq('id', id)
    .single() as { data: { id: string; owner_id: string } | null }

  if (!existing) return { error: 'Business not found' }

  if (existing.owner_id !== user.id) {
    // Allow admins to edit any business
    const { data: me } = await db.from('profiles').select('role').eq('id', user.id).single() as {
      data: { role: 'member' | 'chapter_admin' | 'super_admin' } | null
    }
    if (!me || !['chapter_admin', 'super_admin'].includes(me.role)) {
      return { error: 'Not authorized' }
    }
  }

  const raw = {
    name: formData.get('name'),
    tagline: formData.get('tagline'),
    description: formData.get('description'),
    website: formData.get('website'),
    founded_year: formData.get('founded_year'),
    team_size: formData.get('team_size'),
    city: formData.get('city'),
    country: formData.get('country'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    category_ids: formData.getAll('category_ids'),
    tags: (formData.get('tags') as string | null)?.split(',').map(t => t.trim()).filter(Boolean) ?? [],
  }

  const parsed = BusinessSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  let logo_url: string | undefined
  let cover_url: string | undefined

  try {
    const logoFile = formData.get('logo') as File | null
    const coverFile = formData.get('cover') as File | null

    if (logoFile && logoFile.size > 0) {
      logo_url = await uploadFile('eoconnect-media', `logos/${user.id}-${Date.now()}`, logoFile)
    }
    if (coverFile && coverFile.size > 0) {
      cover_url = await uploadFile('eoconnect-media', `covers/${user.id}-${Date.now()}`, coverFile)
    }

    const portfolioNewFiles = formData.getAll('portfolio') as File[]
    const portfolioKeep = formData.getAll('portfolio_keep') as string[]
    const newPortfolioUrls: string[] = []
    for (const file of portfolioNewFiles.slice(0, 5)) {
      if (file.size > 0) {
        const url = await uploadFile('eoconnect-media', `portfolio/${user.id}-${Date.now()}-${Math.random()}`, file)
        newPortfolioUrls.push(url)
      }
    }
    const portfolio_urls = [...portfolioKeep, ...newPortfolioUrls].slice(0, 5)

    const social_links: Record<string, string> = {}
    for (const platform of ['linkedin', 'twitter', 'instagram', 'facebook']) {
      const val = formData.get(`social_${platform}`) as string | null
      if (val) social_links[platform] = val
    }

    const updateData: Record<string, unknown> = { ...parsed.data, social_links, portfolio_urls }
    if (logo_url) updateData.logo_url = logo_url
    if (cover_url) updateData.cover_url = cover_url

    const { error } = await db.from('businesses').update(updateData).eq('id', id)
    if (error) return { error: error.message }

    revalidatePath('/marketplace')
    revalidatePath(`/marketplace/${id}`)
    revalidatePath('/dashboard/business/edit')
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update business' }
  }
}

export async function updateBusinessStatus(
  id: string,
  status: 'draft' | 'published' | 'paused'
): Promise<BusinessActionResult> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await db
    .from('businesses')
    .update({ status })
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/listings')
  revalidatePath('/marketplace')
  return { error: null }
}
