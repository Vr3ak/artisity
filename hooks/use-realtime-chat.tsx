'use client'

import type { RealtimeChannel } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import { ATTACHMENT_BUCKET, MESSAGE_COLUMNS, type ChatMessage } from '@/lib/chat'

export type { ChatMessage }

// Hide the partner's typing bubble if their "stopped" event never arrives
const TYPING_TIMEOUT_MS = 4000
const TYPING_THROTTLE_MS = 2000

interface UseRealtimeChatProps {
  conversationId: string
  userId: string
  initialMessages: ChatMessage[]
  // conversation_reads.last_read_id of the other participant, if they've opened the thread
  initialPartnerReadId?: number | null
}

// Messages persist in public.messages; postgres_changes pushes inserts and updates (edits,
// soft deletes) the viewer may select (RLS). Typing goes over broadcast on the same channel.
// Read receipts: while the thread is open and the tab visible, the viewer's conversation_reads row
// follows the newest message; postgres_changes on that table brings the partner's.
export function useRealtimeChat({ conversationId, userId, initialMessages, initialPartnerReadId = null }: UseRealtimeChatProps) {
  const [supabase] = useState(createClient)
  const [messages, setMessages] = useState(initialMessages)
  const [isConnected, setIsConnected] = useState(false)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [partnerReadId, setPartnerReadId] = useState(initialPartnerReadId)
  const channel = useRef<RealtimeChannel | null>(null)
  const lastTypingSent = useRef(0)

  // Realtime echoes our own writes too, so every write lands here keyed by id
  const upsert = useCallback((message: ChatMessage) => {
    setMessages((current) => {
      const i = current.findIndex((m) => m.id === message.id)
      if (i === -1) return [...current, message].sort((a, b) => a.id - b.id)
      const next = current.slice()
      next[i] = message
      return next
    })
  }, [])

  useEffect(() => {
    let typingTimer: ReturnType<typeof setTimeout> | undefined
    const filter = `conversation_id=eq.${conversationId}`
    const ch = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter }, (payload) => {
        const message = payload.new as ChatMessage
        upsert(message)
        if (message.sender_id !== userId) setPartnerTyping(false)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter }, (payload) =>
        upsert(payload.new as ChatMessage)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_reads', filter }, (payload) => {
        const read = payload.new as { user_id?: string; last_read_id?: number }
        if (read.user_id && read.user_id !== userId && read.last_read_id) setPartnerReadId(read.last_read_id)
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        clearTimeout(typingTimer)
        setPartnerTyping(!!payload.typing)
        if (payload.typing) typingTimer = setTimeout(() => setPartnerTyping(false), TYPING_TIMEOUT_MS)
      })
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'))
    channel.current = ch

    return () => {
      clearTimeout(typingTimer)
      channel.current = null
      supabase.removeChannel(ch)
    }
  }, [conversationId, supabase, upsert, userId])

  // Mark read up to the newest message when it arrives or the tab comes back into view.
  // The trigger ignores backward moves, so a stale write from another tab is harmless.
  const lastId = messages.at(-1)?.id
  const markedRead = useRef(0)
  useEffect(() => {
    const mark = async () => {
      if (!lastId || lastId <= markedRead.current || document.visibilityState !== 'visible') return
      markedRead.current = lastId
      const { error } = await supabase
        .from('conversation_reads')
        .upsert({ conversation_id: conversationId, last_read_id: lastId }, { onConflict: 'conversation_id,user_id' })
      if (error) markedRead.current = 0 // retry on the next message or visibility change
    }
    mark()
    document.addEventListener('visibilitychange', mark)
    return () => document.removeEventListener('visibilitychange', mark)
  }, [conversationId, lastId, supabase])

  // Throttled "typing" pings while the composer has text; one "stopped" when it clears or sends
  const setTyping = useCallback((typing: boolean) => {
    const now = Date.now()
    if (typing && now - lastTypingSent.current < TYPING_THROTTLE_MS) return
    if (!typing && lastTypingSent.current === 0) return
    lastTypingSent.current = typing ? now : 0
    channel.current?.send({ type: 'broadcast', event: 'typing', payload: { typing } })
  }, [])

  const sendMessage = useCallback(
    async ({ body, file }: { body: string; file?: File }) => {
      setTyping(false)
      let attachment = {}
      const path = file && `${conversationId}/${userId}/${crypto.randomUUID()}`
      if (file && path) {
        const type = file.type || 'application/octet-stream'
        const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, file, { contentType: type })
        if (error) throw error
        attachment = { attachment_path: path, attachment_type: type, attachment_name: file.name, attachment_size: file.size }
      }
      const { data, error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, body, ...attachment })
        .select(MESSAGE_COLUMNS)
        .single()
      if (error) {
        if (path) await supabase.storage.from(ATTACHMENT_BUCKET).remove([path])
        throw error
      }
      upsert(data)
    },
    [conversationId, setTyping, supabase, upsert, userId]
  )

  const editMessage = useCallback(
    async (id: number, body: string) => {
      setTyping(false)
      const { data, error } = await supabase.from('messages').update({ body }).eq('id', id).select(MESSAGE_COLUMNS).single()
      if (error) throw error
      upsert(data)
    },
    [setTyping, supabase, upsert]
  )

  // The guard trigger wipes the row's content; the file goes after it
  const deleteMessage = useCallback(
    async (message: ChatMessage) => {
      const { data, error } = await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', message.id)
        .select(MESSAGE_COLUMNS)
        .single()
      if (error) throw error
      upsert(data)
      // ponytail: best effort; a failed remove leaves an orphan file nobody can reach from the thread
      if (message.attachment_path) await supabase.storage.from(ATTACHMENT_BUCKET).remove([message.attachment_path])
    },
    [supabase, upsert]
  )

  return { messages, isConnected, partnerTyping, partnerReadId, setTyping, sendMessage, editMessage, deleteMessage }
}
