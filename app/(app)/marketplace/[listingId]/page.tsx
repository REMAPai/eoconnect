import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Globe, Phone, Mail, Star, Calendar, Users } from 'lucide-react'
import { startConversation } from '@/actions/messages'
import { ReviewForm } from '@/components/reviews/review-form'
import { ReplyForm } from '@/components/reviews/reply-form'
import { cn } from '@/lib/utils'

interface ListingDetailProps {
  params: Promise<{ listingId: string }>
}

export default async function ListingDetailPage({ params }: ListingDetailProps) {
  const { listingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [{ data: business }, { data: services }, { data: reviews }, { data: categories }] = await Promise.all([
    db.from('businesses').select('*, profiles!owner_id(full_name, avatar_url)').eq('id', listingId).eq('status', 'published').single(),
    db.from('services').select('*').eq('business_id', listingId).eq('status', 'published'),
    db.from('reviews').select('*, profiles!reviewer_id(full_name, avatar_url)').eq('business_id', listingId).eq('flagged', false).order('created_at', { ascending: false }),
    supabase.from('categories').select('id, name').eq('active', true),
  ])

  if (!business) notFound()

  // fire-and-forget analytics
  db.rpc('increment_listing_stat', { p_business_id: listingId, p_stat: 'views' })

  const reviewList = (reviews ?? []) as Array<{
    id: string
    reviewer_id: string
    rating: number
    body: string | null
    owner_reply: string | null
    profiles?: { full_name?: string }
  }>

  const avgRating = reviewList.length
    ? reviewList.reduce((sum, r) => sum + r.rating, 0) / reviewList.length
    : null

  const businessCategories = (categories as Array<{ id: string; name: string }> | null)
    ?.filter(c => business.category_ids?.includes(c.id)) ?? []

  const isOwner = user?.id === business.owner_id
  const myReview = user ? reviewList.find(r => r.reviewer_id === user.id) : null
  const portfolioUrls = (business.portfolio_urls ?? []) as string[]

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Cover + logo */}
      <div className="relative">
        {business.cover_url ? (
          <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={business.cover_url} alt={business.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-48 md:h-64 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
        <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-xl border-2 border-border bg-card overflow-hidden shadow-md">
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logo_url} alt="logo" className="w-full h-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-primary/20">
              <span className="text-primary font-bold text-xl">{business.name.charAt(0)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Business info + sidebar */}
      <div className="pt-10 flex flex-col md:flex-row md:items-start gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold">{business.name}</h1>
          {business.tagline && <p className="text-muted-foreground mt-1">{business.tagline}</p>}

          <div className="flex flex-wrap items-center gap-3 mt-3">
            {businessCategories.map(cat => (
              <Badge key={cat.id} variant="secondary">{cat.name}</Badge>
            ))}
            {(business.city || business.country) && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {[business.city, business.country].filter(Boolean).join(', ')}
              </span>
            )}
            {avgRating !== null && (
              <span className="flex items-center gap-1 text-sm">
                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                <span className="font-semibold">{avgRating.toFixed(1)}</span>
                <span className="text-muted-foreground">({reviewList.length} reviews)</span>
              </span>
            )}
          </div>

          {business.description && (
            <p className="mt-4 text-muted-foreground leading-relaxed">{business.description}</p>
          )}

          {business.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {business.tags.map((tag: string) => (
                <span key={tag} className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar CTA */}
        <div className="w-full md:w-72 flex-shrink-0 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            {!isOwner && (
              <form action={startConversation}>
                <input type="hidden" name="business_id" value={business.id} />
                <input type="hidden" name="owner_id" value={business.owner_id} />
                <button
                  type="submit"
                  className={cn(buttonVariants(), 'w-full bg-primary text-primary-foreground font-bold')}
                >
                  Send Inquiry
                </button>
              </form>
            )}

            {business.website && (
              <a
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: 'outline' }), 'w-full gap-2')}
              >
                <Globe className="h-4 w-4" /> Visit Website
              </a>
            )}

            <div className="pt-2 space-y-2 text-sm text-muted-foreground">
              {business.founded_year && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Founded {business.founded_year}</span>
                </div>
              )}
              {business.team_size && (
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  <span>{business.team_size} employees</span>
                </div>
              )}
              {business.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{business.phone}</span>
                </div>
              )}
              {business.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{business.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio */}
      {portfolioUrls.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Portfolio</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {portfolioUrls.map((url, i) => (
              <div key={i} className="relative h-40 rounded-xl overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Portfolio ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Services */}
      {services && services.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Services</h2>
          <div className="grid gap-4">
            {services.map((service: { id: string; title: string; description?: string; pricing_model: string; price_from?: number; price_to?: number }) => (
              <div key={service.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">{service.title}</h3>
                    {service.description && (
                      <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                    )}
                  </div>
                  {service.pricing_model !== 'contact' && service.price_from != null && (
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold">
                        ${service.price_from.toLocaleString()}
                        {service.price_to ? `–$${service.price_to.toLocaleString()}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{service.pricing_model}</p>
                    </div>
                  )}
                  {service.pricing_model === 'contact' && (
                    <Badge variant="outline">Contact for pricing</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section>
        <h2 className="text-xl font-bold mb-4">
          Reviews{reviewList.length ? ` (${reviewList.length})` : ''}
        </h2>

        {!isOwner && user && (
          <div className="mb-6">
            <ReviewForm businessId={business.id} existing={myReview ? { rating: myReview.rating, body: myReview.body } : null} />
          </div>
        )}

        {reviewList.length > 0 ? (
          <div className="space-y-4">
            {reviewList.map(review => (
              <div key={review.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {review.profiles?.full_name?.charAt(0) ?? 'M'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{review.profiles?.full_name ?? 'Member'}</p>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} className={`h-3 w-3 ${n <= review.rating ? 'fill-primary text-primary' : 'text-muted'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                {review.body && <p className="text-sm text-muted-foreground">{review.body}</p>}
                {review.owner_reply && (
                  <div className="mt-3 pl-4 border-l-2 border-primary/30">
                    <p className="text-xs font-semibold text-primary mb-1">Owner response</p>
                    <p className="text-sm text-muted-foreground">{review.owner_reply}</p>
                  </div>
                )}
                {isOwner && <ReplyForm reviewId={review.id} existing={review.owner_reply} />}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No reviews yet.</p>
        )}
      </section>
    </div>
  )
}
