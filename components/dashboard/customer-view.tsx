import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MessageCircle, ShoppingBag } from 'lucide-react'

interface CustomerConversation {
  id: string
  listing_id: string | null
  last_message_at: string
  businessName?: string
}

interface CustomerViewProps {
  conversations: CustomerConversation[]
}

export function CustomerView({ conversations }: CustomerViewProps) {
  if (conversations.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-10 text-center flex flex-col items-center gap-4">
        <ShoppingBag className="w-10 h-10 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-semibold">No conversations yet</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Browse EO member services and start a conversation.
          </p>
        </div>
        <Link
          href="/marketplace"
          className={cn(buttonVariants(), 'mt-2')}
        >
          Start browsing EO member services
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Your Conversations</h2>
      <div className="flex flex-col gap-3">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className="flex items-center justify-between gap-4 bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <MessageCircle className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {conv.businessName ?? 'Unknown listing'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <Link
              href={`/dashboard/messages?conversation=${conv.id}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}
            >
              View
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
