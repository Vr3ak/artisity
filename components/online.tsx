'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// "Active now", after LinkedIn: a signed-in tab with the site open counts as online. Every tab joins
// the private Presence channel `online` (policies in supabase/schemas/realtime.sql), keyed by user id.
// ponytail: online/offline only; store a last_seen_at if "Active 2h ago" is wanted
let online = new Set<string>()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

// Mounted once, in TopNav, for signed-in users
export function Presence({ userId }: { userId: string }) {
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('online', { config: { private: true, presence: { key: userId } } })
    channel
      .on('presence', { event: 'sync' }, () => {
        online = new Set(Object.keys(channel.presenceState()))
        emit()
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') channel.track({})
      })
    return () => {
      supabase.removeChannel(channel)
      online = new Set()
      emit()
    }
  }, [userId])
  return null
}

export function useOnline(userId: string) {
  return useSyncExternalStore(subscribe, () => online.has(userId), () => false)
}

// Green dot for an avatar's corner; the avatar's wrapper must be `relative`
export function OnlineDot({ userId, className }: { userId: string; className?: string }) {
  if (!useOnline(userId)) return null
  return (
    <span
      role="img"
      aria-label="Active now"
      className={cn('absolute bottom-0 right-0 size-3 rounded-full bg-online ring-2 ring-background', className)}
    />
  )
}

export function OnlineLabel({ userId }: { userId: string }) {
  if (!useOnline(userId)) return null
  return <span className="block text-xs text-muted-foreground">Active now</span>
}
