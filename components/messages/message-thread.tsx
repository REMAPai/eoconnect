'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { sendMessage } from '@/actions/messages'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  sender_id: string
  body: string
  created_at: string
}

interface MessageThreadProps {
  conversationId: string
  currentUserId: string
  otherName: string
  otherAvatar: string | null
  businessName: string | null
  initialMessages: Message[]
}

export function MessageThread({
  conversationId,
  currentUserId,
  otherName,
  otherAvatar,
  businessName,
  initialMessages,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [body, setBody] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset state when active conversation changes
  useEffect(() => {
    setMessages(initialMessages)
  }, [conversationId, initialMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as Message
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setError(null)
    setBody('')
    const fd = new FormData()
    fd.set('conversation_id', conversationId)
    fd.set('body', text)
    startTransition(async () => {
      const result = await sendMessage(fd)
      if (result.error) {
        setError(result.error)
        setBody(text)
      }
    })
  }

  return (
    <>
      <div className="p-4 border-b border-border flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={otherAvatar ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
            {otherName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-sm">{otherName}</p>
          {businessName && <p className="text-xs text-muted-foreground">re: {businessName}</p>}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            No messages yet. Say hello!
          </p>
        ) : (
          messages.map(m => {
            const isMine = m.sender_id === currentUserId
            return (
              <div key={m.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-2 text-sm break-words',
                    isMine ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className={cn('text-[10px] mt-1', isMine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                    {format(new Date(m.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-destructive bg-destructive/10 border-t border-destructive/20">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-3 border-t border-border flex gap-2">
        <Input
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Type a message…"
          disabled={isPending}
          className="flex-1"
        />
        <Button type="submit" disabled={isPending || !body.trim()} size="icon" className="bg-primary text-primary-foreground">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </>
  )
}
