'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { Settings, User } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { MessageIndicator, NotificationBell } from './notification-indicator'
import { Button, buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { signOut } from '@/actions/auth'
import type { Profile } from '@/types/database'
import { cn } from '@/lib/utils'

interface NavbarProps {
  profile: Profile | null
  unreadMessages?: number
  adsEnabled?: boolean
}

const baseLinks = [
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/dashboard', label: 'Business Dashboard' },
  { href: '/dashboard/messages', label: 'Messages' },
] as const

export function Navbar({ profile, unreadMessages = 0, adsEnabled = false }: NavbarProps) {
  const navLinks = adsEnabled
    ? [...baseLinks, { href: '/dashboard/ads', label: 'Ads' }]
    : baseLinks
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6 flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/marketplace" className="text-xl font-extrabold tracking-tight">
            Member<span className="text-primary">Market</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  (link.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(link.href))
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {profile && <MessageIndicator initialCount={unreadMessages} userId={profile.id} />}
          <NotificationBell />
          <ThemeToggle />
          <Link
            href="/dashboard/listings/new"
            className={cn(buttonVariants({ size: 'sm' }), 'bg-primary text-primary-foreground font-bold ml-2')}
          >
            Post Service
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="ml-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {profile?.full_name?.charAt(0).toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">{profile?.eo_chapter}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href="/dashboard/account" className="flex items-center w-full">
                  <User className="mr-2 h-4 w-4" />My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/dashboard/business/edit" className="flex items-center w-full">
                  <Settings className="mr-2 h-4 w-4" />My Businesses
                </Link>
              </DropdownMenuItem>
              {profile?.role && ['chapter_admin', 'super_admin'].includes(profile.role) && (
                <DropdownMenuItem>
                  <Link href="/admin" className="flex items-center w-full">Admin Panel</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={() => startTransition(() => { signOut() })}
                disabled={isPending}
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
