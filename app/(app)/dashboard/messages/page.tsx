import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConversationList } from '@/components/messages/conversation-list'
import { MessageThread } from '@/components/messages/message-thread'
import { Inbox } from 'lucide-react'

interface MessagesPageProps {
  searchParams: Promise<{ conversation?: string }>
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const { conversation: activeId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: conversations } = await db
    .from('conversations')
    .select('id, participant_ids, listing_id, last_message_at, created_at')
    .contains('participant_ids', [user.id])
    .order('last_message_at', { ascending: false })

  const convList = (conversations ?? []) as Array<{
    id: string
    participant_ids: string[]
    listing_id: string | null
    last_message_at: string
    created_at: string
  }>

  const otherIds = [...new Set(convList.flatMap(c => c.participant_ids).filter(id => id !== user.id))]
  const businessIds = [...new Set(convList.map(c => c.listing_id).filter((x): x is string => !!x))]

  const [{ data: profiles }, { data: businesses }, { data: lastMsgs }] = await Promise.all([
    otherIds.length
      ? db.from('profiles').select('id, full_name, avatar_url').in('id', otherIds)
      : Promise.resolve({ data: [] }),
    businessIds.length
      ? db.from('businesses').select('id, name, logo_url').in('id', businessIds)
      : Promise.resolve({ data: [] }),
    convList.length
      ? db.from('messages').select('conversation_id, body, created_at, read_at, sender_id')
          .in('conversation_id', convList.map(c => c.id))
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  const profileMap = new Map((profiles ?? []).map((p: { id: string; full_name: string; avatar_url: string | null }) => [p.id, p]))
  const bizMap = new Map((businesses ?? []).map((b: { id: string; name: string; logo_url: string | null }) => [b.id, b]))
  const lastMsgMap = new Map<string, { body: string; created_at: string; read_at: string | null; sender_id: string }>()
  for (const m of (lastMsgs ?? [])) {
    if (!lastMsgMap.has(m.conversation_id)) lastMsgMap.set(m.conversation_id, m)
  }

  const enriched = convList.map(c => {
    const otherId = c.participant_ids.find(id => id !== user.id)
    const otherProfile = otherId ? profileMap.get(otherId) : undefined
    const business = c.listing_id ? bizMap.get(c.listing_id) : undefined
    const lastMsg = lastMsgMap.get(c.id)
    return {
      id: c.id,
      otherName: otherProfile?.full_name ?? 'Unknown',
      otherAvatar: otherProfile?.avatar_url ?? null,
      businessName: business?.name ?? null,
      businessLogo: business?.logo_url ?? null,
      lastMessageBody: lastMsg?.body ?? null,
      lastMessageAt: c.last_message_at,
      unread: lastMsg ? lastMsg.sender_id !== user.id && !lastMsg.read_at : false,
    }
  })

  // Active conversation
  let activeMessages: Array<{ id: string; sender_id: string; body: string; created_at: string }> = []
  let activeMeta: typeof enriched[0] | null = null
  if (activeId && convList.find(c => c.id === activeId)) {
    activeMeta = enriched.find(c => c.id === activeId) ?? null
    const { data: msgs } = await db
      .from('messages')
      .select('id, sender_id, body, created_at')
      .eq('conversation_id', activeId)
      .order('created_at', { ascending: true })
    activeMessages = (msgs ?? []) as typeof activeMessages

    // mark as read
    await db.from('messages').update({ read_at: new Date().toISOString() })
      .eq('conversation_id', activeId).neq('sender_id', user.id).is('read_at', null)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-12rem)]">
      <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="font-bold text-lg">Messages</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{enriched.length} conversation{enriched.length !== 1 ? 's' : ''}</p>
        </div>
        <ConversationList conversations={enriched} activeId={activeId ?? null} />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        {activeId && activeMeta ? (
          <MessageThread
            conversationId={activeId}
            currentUserId={user.id}
            otherName={activeMeta.otherName}
            otherAvatar={activeMeta.otherAvatar}
            businessName={activeMeta.businessName}
            initialMessages={activeMessages}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="font-semibold">Select a conversation</p>
            <p className="text-sm text-muted-foreground mt-1">
              {enriched.length === 0
                ? 'Start by browsing the marketplace and sending an inquiry.'
                : 'Pick a conversation from the list to start chatting.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
