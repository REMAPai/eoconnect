import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Business } from '@/types/database'

interface ListingCardProps {
  business: Business & {
    avg_rating?: number
    review_count?: number
    category_names?: string[]
    is_sponsored?: boolean
  }
}

export function ListingCard({ business }: ListingCardProps) {
  return (
    <Link href={`/marketplace/${business.id}`}>
      <div className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary transition-all hover:shadow-lg">
        {business.cover_url ? (
          <div className="relative h-32 w-full">
            <Image src={business.cover_url} alt={business.name} fill className="object-cover" />
            {business.is_sponsored && (
              <span className="absolute top-2 right-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
                Featured
              </span>
            )}
          </div>
        ) : (
          <div className="h-32 w-full bg-muted flex items-center justify-center">
            {business.is_sponsored && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
                Featured
              </span>
            )}
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start gap-3 mb-3">
            {business.logo_url ? (
              <div className="relative h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 border border-border">
                <Image src={business.logo_url} alt={`${business.name} logo`} fill className="object-cover" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-sm">{business.name.charAt(0)}</span>
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">
                {business.name}
              </h3>
              {business.avg_rating !== undefined && business.review_count !== undefined && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  <span className="text-xs font-medium">{business.avg_rating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({business.review_count})</span>
                </div>
              )}
            </div>
          </div>

          {business.tagline && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{business.tagline}</p>
          )}

          <div className="flex flex-wrap gap-1 mb-3">
            {business.category_names?.slice(0, 2).map(name => (
              <Badge key={name} variant="secondary" className="text-xs">{name}</Badge>
            ))}
          </div>

          {(business.city || business.country) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{[business.city, business.country].filter(Boolean).join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
