'use client'

import { useEffect, useState } from 'react'
import { Bell, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export function MessageIndicator({ initialCount, userId }: { initialCount: number; userId: string }) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('messages-badge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new as { sender_id: string; conversation_id: string }
          if (m.sender_id !== userId) setCount(c => c + 1)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return (
    <Link href="/dashboard/messages" onClick={() => setCount(0)} className="relative">
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <MessageSquare className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Button>
    </Link>
  )
}

export function NotificationBell() {
  return (
    <Button variant="ghost" size="icon" className="h-9 w-9">
      <Bell className="h-4 w-4" />
    </Button>
  )
}
