'use client'

import { useRouter, usePathname } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Business {
  id: string
  name: string
  status: string
}

interface BusinessSwitcherProps {
  businesses: Business[]
  currentId: string
}

/**
 * Header dropdown for owners with multiple businesses. Picking one
 * sets ?business=<id> so the dashboard scopes its analytics to that
 * business. Driven by the URL so it survives full-page refresh,
 * deep-linking, and back/forward navigation.
 */
export function BusinessSwitcher({ businesses, currentId }: BusinessSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()

  const current = businesses.find(b => b.id === currentId) ?? businesses[0]

  const switchTo = (id: string) => {
    const params = new URLSearchParams()
    params.set('business', id)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group inline-flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        aria-label="Switch business"
      >
        <h1 className="text-2xl font-bold truncate group-hover:text-primary transition-colors">
          {current?.name ?? 'Untitled'}
        </h1>
        <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Switch Business
        </div>
        {businesses.map(b => {
          const isActive = b.id === currentId
          return (
            <DropdownMenuItem
              key={b.id}
              className="cursor-pointer"
              onClick={() => switchTo(b.id)}
            >
              <div className="flex items-center gap-2 w-full">
                <Check
                  className={cn(
                    'h-4 w-4',
                    isActive ? 'text-primary' : 'text-transparent'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn('truncate text-sm', isActive && 'font-semibold')}>
                    {b.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground capitalize">{b.status}</p>
                </div>
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
