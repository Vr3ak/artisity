'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/tab-bar'
import { OnlineDot } from '@/components/online'
import { attachmentKind } from '@/components/chat-message'

export type InboxItem = {
  id: string
  lastMessageAt: string
  other: { id: string; name: string; avatar: string | null }
  last: { sender_id: string; body: string; attachment_type: string | null; deleted_at: string | null } | null
  unread: boolean
}

const ATTACHMENT_LABEL = { image: 'Sent a photo', video: 'Sent a video', voice: 'Voice message', file: 'Sent a file' }

function preview(item: InboxItem, userId: string) {
  const { last } = item
  if (!last) return 'No messages yet'
  const text = last.deleted_at
    ? 'Message deleted'
    : last.body || ATTACHMENT_LABEL[attachmentKind(last.attachment_type ?? '')]
  return last.sender_id === userId ? `You: ${text}` : text
}

// Time today, else "Nov 3"
function shortDate(iso: string) {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Inbox({ userId, items }: { userId: string; items: InboxItem[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState('')

  // New messages in any thread, and the viewer's own reads, re-sort the list and update previews/unread.
  // RLS limits postgres_changes to the viewer's conversations.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`inbox:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_reads', filter: `user_id=eq.${userId}` }, () =>
        router.refresh()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [router, userId])

  const q = query.trim().toLowerCase()
  const shown = q ? items.filter((i) => i.other.name.toLowerCase().includes(q)) : items

  return (
    <>
      <div className="flex flex-col gap-3 border-b p-4">
        <h1 className="text-xl font-bold">Messages</h1>
        {items.length > 0 && (
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages"
              aria-label="Search conversations by name"
              className="h-9 w-full rounded-full bg-secondary pl-9 pr-4 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
            />
          </label>
        )}
      </div>

      {items.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          No messages yet. Find an artist on{' '}
          <Link href="/artists" className="font-semibold text-primary-ink underline">
            Commission
          </Link>{' '}
          to start one.
        </p>
      ) : shown.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No conversations match “{query.trim()}”.</p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {shown.map((item) => {
            const active = pathname === `/messages/${item.id}`
            // The open thread is being read right now
            const unread = item.unread && !active
            return (
              <li key={item.id}>
                <Link
                  href={`/messages/${item.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-secondary focus-visible:bg-secondary',
                    active && 'bg-secondary'
                  )}
                >
                  <span className="relative shrink-0">
                    <span className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-secondary">
                      <Avatar url={item.other.avatar} className="size-12" />
                    </span>
                    <OnlineDot userId={item.other.id} className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className={cn('min-w-0 flex-1 truncate', unread ? 'font-bold' : 'font-semibold')}>
                        {item.other.name}
                      </span>
                      <time
                        dateTime={item.lastMessageAt}
                        suppressHydrationWarning
                        className="shrink-0 text-xs text-muted-foreground"
                      >
                        {shortDate(item.lastMessageAt)}
                      </time>
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate text-sm',
                          unread ? 'font-semibold text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {preview(item, userId)}
                      </span>
                      {unread && (
                        <span className="size-2.5 shrink-0 rounded-full bg-primary">
                          <span className="sr-only">Unread</span>
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

const WIDTH_KEY = 'inbox-width'
const MIN_W = 240

// Draggable divider between the conversation list and the chat (md and up). It sets --inbox-w on the
// shared parent, which the list's width reads; arrow keys nudge it. The width is remembered per browser.
export function InboxResizer() {
  const handle = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number | null>(null)

  const apply = (w: number, save = false) => {
    const box = handle.current?.parentElement
    if (!box) return
    const max = Math.min(560, box.clientWidth * 0.6)
    const clamped = Math.round(Math.min(max, Math.max(MIN_W, w)))
    box.style.setProperty('--inbox-w', `${clamped}px`)
    setWidth(clamped)
    if (save) {
      try {
        localStorage.setItem(WIDTH_KEY, String(clamped))
      } catch {}
    }
  }

  useEffect(() => {
    let saved: string | null = null
    try {
      saved = localStorage.getItem(WIDTH_KEY)
    } catch {}
    if (saved) apply(Number(saved))
  }, [])

  const listWidth = () => handle.current?.previousElementSibling?.getBoundingClientRect().width ?? MIN_W

  return (
    <div
      ref={handle}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize conversation list"
      aria-valuenow={width ?? undefined}
      aria-valuemin={MIN_W}
      tabIndex={0}
      onPointerDown={(e) => {
        e.preventDefault() // no text selection while dragging
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
        const left = e.currentTarget.parentElement!.getBoundingClientRect().left
        apply(e.clientX - left)
      }}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId)
        apply(listWidth(), true)
      }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 64 : 16
        if (e.key === 'ArrowLeft') apply(listWidth() - step, true)
        else if (e.key === 'ArrowRight') apply(listWidth() + step, true)
        else return
        e.preventDefault()
      }}
      className="relative z-10 hidden w-px shrink-0 cursor-col-resize touch-none bg-border transition-colors after:absolute after:inset-y-0 after:-left-1.5 after:-right-1.5 hover:bg-primary focus-visible:bg-primary focus-visible:outline-none active:bg-primary md:block"
    />
  )
}
