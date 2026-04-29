'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface MessagesNavLinkProps {
  initialUnread: number
  userId: string | null
  /** Tailwind classes used by the parent nav for active vs idle states. */
  baseClass: string
  activeClass: string
  idleClass: string
}

/**
 * Messages nav link with a live unread badge.
 *
 * Subscribes to inserts on the `messages` table and bumps the count when a
 * new message arrives addressed to the current user. Resets to 0 the moment
 * the user clicks the link (since they're about to mark them read).
 *
 * Lives in its own client component so the rest of the navbar (server-friendly
 * branding/logo/etc.) doesn't have to opt into realtime.
 */
export function MessagesNavLink({
  initialUnread, userId, baseClass, activeClass, idleClass,
}: MessagesNavLinkProps) {
  const pathname = usePathname()
  const [count, setCount] = useState(initialUnread)
  const isActive = pathname.startsWith('/dashboard/messages')

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`messages-nav-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new as { sender_id: string }
          // Only count messages from someone OTHER than us. We don't filter on
          // conversation here — the realtime channel doesn't know our list of
          // conversations, but Supabase RLS already restricts what we can see.
          if (m.sender_id !== userId) {
            setCount(c => c + 1)
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Reset count when navigating into the messages page — the page itself
  // marks them read, so the badge should clear.
  useEffect(() => {
    if (isActive && count > 0) setCount(0)
  }, [isActive, count])

  return (
    <Link
      href="/dashboard/messages"
      onClick={() => setCount(0)}
      className={cn(baseClass, isActive ? activeClass : idleClass)}
    >
      Messages
      {count > 0 && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
