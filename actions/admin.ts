'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Service-role client for operations that need to bypass RLS
// (writing to other users' profile rows).
function adminDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

async function requireAdmin() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const, supabase, db, user: null, role: null }

  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: 'member' | 'chapter_admin' | 'super_admin' } | null }

  if (!profile || !['chapter_admin', 'super_admin'].includes(profile.role)) {
    return { error: 'Not authorized' as const, supabase, db, user, role: null }
  }

  return { error: null, supabase, db, user, role: profile.role }
}

// ── Categories ────────────────────────────────────────────────

const CategorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  icon: z.string().trim().max(8).optional(),
  sort_order: z.coerce.number().int().min(0).max(9999).optional(),
})

export async function createCategory(formData: FormData): Promise<{ error: string | null }> {
  const ctx = await requireAdmin()
  if (ctx.error) return { error: ctx.error }
  if (ctx.role !== 'super_admin') return { error: 'Super admin only' }

  const parsed = CategorySchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    icon: formData.get('icon') ?? undefined,
    sort_order: formData.get('sort_order') ?? undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await ctx.db.from('categories').insert({ ...parsed.data, active: true })
  if (error) return { error: error.message }
  revalidatePath('/admin/categories')
  revalidatePath('/marketplace')
  return { error: null }
}

export async function updateCategory(id: string, formData: FormData): Promise<{ error: string | null }> {
  const ctx = await requireAdmin()
  if (ctx.error) return { error: ctx.error }
  if (ctx.role !== 'super_admin') return { error: 'Super admin only' }

  const parsed = CategorySchema.partial().safeParse({
    name: formData.get('name') ?? undefined,
    slug: formData.get('slug') ?? undefined,
    icon: formData.get('icon') ?? undefined,
    sort_order: formData.get('sort_order') ?? undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await ctx.db.from('categories').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/categories')
  return { error: null }
}

export async function toggleCategoryActive(id: string, active: boolean): Promise<{ error: string | null }> {
  const ctx = await requireAdmin()
  if (ctx.error) return { error: ctx.error }
  if (ctx.role !== 'super_admin') return { error: 'Super admin only' }

  const { error } = await ctx.db.from('categories').update({ active }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/categories')
  revalidatePath('/marketplace')
  return { error: null }
}

// ── Members ───────────────────────────────────────────────────

export async function setMemberStatus(
  userId: string,
  status: 'pending' | 'active' | 'suspended'
): Promise<{ error: string | null }> {
  const ctx = await requireAdmin()
  if (ctx.error) return { error: ctx.error }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'SUPABASE_SERVICE_ROLE_KEY not configured on the server' }
  }

  const { data, error } = await adminDb()
    .from('profiles')
    .update({ status })
    .eq('id', userId)
    .select('id')
  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: 'No profile updated — user not found' }
  revalidatePath('/admin/members')
  return { error: null }
}

export async function setMemberRole(
  userId: string,
  role: 'member' | 'chapter_admin' | 'super_admin'
): Promise<{ error: string | null }> {
  const ctx = await requireAdmin()
  if (ctx.error) return { error: ctx.error }
  if (ctx.role !== 'super_admin') return { error: 'Super admin only' }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'SUPABASE_SERVICE_ROLE_KEY not configured on the server' }
  }

  // Service-role write: profile RLS blocks super-admins from updating
  // other users' rows, and the user-scoped client silently no-ops
  // (0 rows affected, no error). Bypass RLS for this admin action.
  const { data, error } = await adminDb()
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select('id')
  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: 'No profile updated — user not found' }
  revalidatePath('/admin/members')
  return { error: null }
}

// ── Review moderation ────────────────────────────────────────

export async function unflagReview(id: string): Promise<{ error: string | null }> {
  const ctx = await requireAdmin()
  if (ctx.error) return { error: ctx.error }

  const { error } = await ctx.db.from('reviews').update({ flagged: false }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/reviews')
  return { error: null }
}

export async function deleteReview(id: string): Promise<{ error: string | null }> {
  const ctx = await requireAdmin()
  if (ctx.error) return { error: ctx.error }

  const { error } = await ctx.db.from('reviews').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/reviews')
  return { error: null }
}

// ── Listing moderation ───────────────────────────────────────

export async function setBusinessStatusAdmin(
  id: string,
  status: 'draft' | 'published' | 'paused'
): Promise<{ error: string | null }> {
  const ctx = await requireAdmin()
  if (ctx.error) return { error: ctx.error }

  const { error } = await ctx.db.from('businesses').update({ status }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/listings')
  revalidatePath('/marketplace')
  return { error: null }
}
