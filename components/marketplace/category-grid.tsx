import Link from 'next/link'
import type { Category } from '@/types/database'

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {categories.map(cat => (
        <Link
          key={cat.id}
          href={`/marketplace/search?category=${cat.slug}`}
          className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl hover:border-primary hover:bg-card/80 transition-all group text-center"
        >
          <span className="text-2xl">{cat.icon}</span>
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground leading-tight">
            {cat.name}
          </span>
        </Link>
      ))}
    </div>
  )
}
