'use client'

import { ArrowUp, Check, Loader2, Mic, Paperclip, Pencil, Trash2, X } from 'lucide-react'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { ChatMessageItem, TypingBubble, attachmentKind, formatBytes } from '@/components/chat-message'
import { useChatScroll } from '@/hooks/use-chat-scroll'
import { MAX_ATTACHMENT_BYTES, type ChatMessage } from '@/lib/chat'
import { useRealtimeChat } from '@/hooks/use-realtime-chat'

interface RealtimeChatProps {
  conversationId: string
  userId: string
  partnerName: string
  messages?: ChatMessage[]
}

const MAX_RECORDING_S = 300
// Safari records mp4; Chrome and Firefox record webm/opus
const RECORDER_TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm']

const iconButton =
  'flex size-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  })
}

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback)

/**
 * Realtime chat for one conversation: text, attachments, voice notes, edit/delete, typing indicator
 * @param conversationId - public.conversations id
 * @param userId - the viewer's id, to align their own messages
 * @param partnerName - the other participant's display name
 * @param messages - messages already loaded from the database
 */
export const RealtimeChat = ({ conversationId, userId, partnerName, messages: initialMessages = [] }: RealtimeChatProps) => {
  const { containerRef, scrollToBottom, isNearBottom } = useChatScroll()
  const { messages, isConnected, partnerTyping, setTyping, sendMessage, editMessage, deleteMessage } = useRealtimeChat({
    conversationId,
    userId,
    initialMessages,
  })

  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [editing, setEditing] = useState<ChatMessage | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ChatMessage | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recordingFor, setRecordingFor] = useState<number | null>(null) // seconds elapsed, null when idle

  const textarea = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const recorder = useRef<{ rec: MediaRecorder; cancelled: boolean } | null>(null)
  const stick = useRef(true) // follow new messages only while the viewer is at the bottom
  const firstScroll = useRef(true)

  const last = messages.at(-1)
  useEffect(() => {
    if (firstScroll.current || stick.current || last?.sender_id === userId) {
      scrollToBottom(firstScroll.current ? 'instant' : 'smooth')
      firstScroll.current = false
    }
  }, [messages.length, partnerTyping, last?.sender_id, userId, scrollToBottom])

  const onMediaLoad = useCallback(() => {
    if (stick.current) scrollToBottom('instant')
  }, [scrollToBottom])

  const send = useCallback(
    async (payload: { body: string; file?: File }) => {
      setSending(true)
      setError(null)
      try {
        await sendMessage(payload)
        return true
      } catch (err) {
        setError(errorText(err, 'Message not sent. Try again.'))
        return false
      } finally {
        setSending(false)
      }
    },
    [sendMessage]
  )

  const cancelEdit = () => {
    setEditing(null)
    setText('')
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const body = text.trim()
    if (sending) return

    if (editing) {
      // Clearing a text-only message would empty it; that's what Delete is for
      if (body === editing.body || (!body && !editing.attachment_path)) return cancelEdit()
      setSending(true)
      try {
        await editMessage(editing.id, body)
        cancelEdit()
      } catch (err) {
        setError(errorText(err, 'Edit not saved. Try again.'))
      } finally {
        setSending(false)
      }
      return
    }

    if (!body && !file) return
    const ok = await send({ body, file: file ?? undefined })
    if (ok) {
      setText('')
      setFile(null)
      textarea.current?.focus()
    }
  }

  const pickFile = (picked: File | undefined) => {
    if (!picked) return
    if (picked.size > MAX_ATTACHMENT_BYTES) return setError(`Files can be up to ${formatBytes(MAX_ATTACHMENT_BYTES)}.`)
    setError(null)
    setFile(picked)
    textarea.current?.focus()
  }

  const startRecording = async () => {
    setError(null)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return setError('Microphone access is blocked. Allow it in your browser settings to send voice messages.')
    }
    const mimeType = RECORDER_TYPES.find((t) => MediaRecorder.isTypeSupported(t))
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    const chunks: Blob[] = []
    const state = { rec, cancelled: false }
    rec.ondataavailable = (e) => chunks.push(e.data)
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      recorder.current = null
      setRecordingFor(null)
      if (state.cancelled || chunks.length === 0) return
      const type = rec.mimeType.split(';')[0] || 'audio/webm'
      const ext = type.includes('mp4') ? 'm4a' : 'webm'
      send({ body: '', file: new File(chunks, `Voice message.${ext}`, { type }) })
    }
    recorder.current = state
    rec.start()
    setRecordingFor(0)
  }

  const stopRecording = (cancel: boolean) => {
    if (!recorder.current) return
    recorder.current.cancelled = cancel
    recorder.current.rec.stop()
  }

  // Recording clock; stops itself at the cap
  useEffect(() => {
    if (recordingFor === null) return
    if (recordingFor >= MAX_RECORDING_S) return stopRecording(false)
    const t = setTimeout(() => setRecordingFor((s) => (s === null ? null : s + 1)), 1000)
    return () => clearTimeout(t)
  }, [recordingFor])

  // Leaving the page mid-recording discards it and frees the mic
  useEffect(() => () => stopRecording(true), [])

  const canSend = editing ? true : !!text.trim() || !!file

  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground">
      <div
        ref={containerRef}
        onScroll={() => (stick.current = isNearBottom())}
        className="flex-1 overflow-y-auto px-4 pb-4"
        role="log"
        aria-label={`Messages with ${partnerName}`}
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="font-semibold">No messages yet</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Say hi to {partnerName}. Share what you have in mind, your budget and when you need it.
            </p>
          </div>
        )}
        {messages.map((message, i) => {
          const prev = messages[i - 1]
          const next = messages[i + 1]
          const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(message.created_at).toDateString()
          // A sender's run breaks on a new day or after a 5-minute gap
          const joins = (a?: ChatMessage, b?: ChatMessage) =>
            !!a &&
            !!b &&
            a.sender_id === b.sender_id &&
            new Date(a.created_at).toDateString() === new Date(b.created_at).toDateString() &&
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime() < 5 * 60_000
          return (
            <Fragment key={message.id}>
              {newDay && (
                <p className="sticky top-0 z-[1] mx-auto mt-4 w-fit rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                  {dayLabel(message.created_at)}
                </p>
              )}
              <ChatMessageItem
                message={message}
                isOwnMessage={message.sender_id === userId}
                isFirstInGroup={!joins(prev, message)}
                isLastInGroup={!joins(message, next)}
                onEdit={(m) => {
                  setEditing(m)
                  setFile(null)
                  setText(m.body)
                  requestAnimationFrame(() => textarea.current?.focus())
                }}
                onDelete={setConfirmDelete}
                onMediaLoad={onMediaLoad}
              />
            </Fragment>
          )
        })}
        {partnerTyping && <TypingBubble name={partnerName} />}
      </div>

      <div className="border-t border-border px-3 pb-3 pt-2">
        {error && (
          <p role="alert" className="px-2 pb-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {editing && (
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-secondary px-3 py-2 text-sm">
            <Pencil className="size-4 shrink-0 text-primary-ink" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Editing message</span>
              <span className="block truncate text-muted-foreground">{editing.body}</span>
            </span>
            <button type="button" onClick={cancelEdit} aria-label="Cancel editing" className={cn(iconButton, 'size-8 hover:bg-accent')}>
              <X className="size-4" />
            </button>
          </div>
        )}
        {file && (
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-secondary px-3 py-2 text-sm">
            <Paperclip className="size-4 shrink-0 text-primary-ink" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{file.name}</span>
              <span className="block text-muted-foreground">
                {{ image: 'Image', video: 'Video', voice: 'Audio', file: 'File' }[attachmentKind(file.type)]} · {formatBytes(file.size)}
              </span>
            </span>
            <button type="button" onClick={() => setFile(null)} aria-label="Remove attachment" className={cn(iconButton, 'size-8 hover:bg-accent')}>
              <X className="size-4" />
            </button>
          </div>
        )}

        {recordingFor !== null ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => stopRecording(true)} aria-label="Discard recording" className={cn(iconButton, 'text-destructive hover:bg-secondary')}>
              <Trash2 className="size-5" />
            </button>
            <div className="flex h-10 flex-1 items-center gap-2.5 rounded-full bg-secondary px-4 text-sm" role="status">
              <span className="size-2.5 animate-pulse rounded-full bg-destructive motion-reduce:animate-none" aria-hidden />
              <span className="font-semibold tabular-nums">
                {Math.floor(recordingFor / 60)}:{String(recordingFor % 60).padStart(2, '0')}
              </span>
              <span className="truncate text-muted-foreground">Recording…</span>
            </div>
            <button type="button" onClick={() => stopRecording(false)} aria-label="Send voice message" className={cn(iconButton, 'bg-primary text-primary-foreground hover:bg-primary/90')}>
              <ArrowUp className="size-5" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            {!editing && (
              <>
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={sending}
                  aria-label="Attach a photo, video or file"
                  className={cn(iconButton, 'text-muted-foreground hover:bg-secondary hover:text-foreground')}
                >
                  <Paperclip className="size-5" />
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  hidden
                  onChange={(e) => {
                    pickFile(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </>
            )}
            <textarea
              ref={textarea}
              rows={1}
              maxLength={2000}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setTyping(!!e.target.value.trim())
              }}
              onBlur={() => setTyping(false)}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter breaks the line; isComposing keeps Khmer/IME input intact
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  handleSubmit()
                }
                if (e.key === 'Escape' && editing) cancelEdit()
              }}
              placeholder={!isConnected ? 'Connecting…' : file ? 'Add a caption' : 'Message'}
              aria-label="Message"
              className="max-h-36 min-h-10 flex-1 resize-none rounded-[1.25rem] bg-secondary px-4 py-2 text-base leading-6 [field-sizing:content] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm md:leading-6"
            />
            {canSend || sending ? (
              <button
                type="submit"
                disabled={sending}
                aria-label={editing ? 'Save edit' : 'Send'}
                className={cn(iconButton, 'bg-primary text-primary-foreground hover:bg-primary/90')}
              >
                {sending ? <Loader2 className="size-5 animate-spin" /> : editing ? <Check className="size-5" /> : <ArrowUp className="size-5" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                aria-label="Record a voice message"
                className={cn(iconButton, 'bg-secondary hover:bg-accent')}
              >
                <Mic className="size-5" />
              </button>
            )}
          </form>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDelete
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => {
            const target = confirmDelete
            setConfirmDelete(null)
            if (editing?.id === target.id) cancelEdit()
            try {
              await deleteMessage(target)
            } catch (err) {
              setError(errorText(err, 'Message not deleted. Try again.'))
            }
          }}
        />
      )}
    </div>
  )
}

function ConfirmDelete({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => dialog.current?.showModal(), [])
  return (
    <dialog
      ref={dialog}
      aria-labelledby="delete-message-title"
      onClose={onCancel}
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      className="fixed inset-0 m-0 size-full max-h-none max-w-none flex-col border-0 bg-scrim p-4 text-foreground animate-in fade-in-0 backdrop:bg-transparent open:flex motion-reduce:animate-none"
    >
      <div className="m-auto flex w-full max-w-sm flex-col gap-2 rounded-3xl bg-nav p-6 shadow-float">
        <h2 id="delete-message-title" className="text-lg font-bold">
          Delete message?
        </h2>
        <p className="text-sm text-muted-foreground">It will be removed for both of you. This can&apos;t be undone.</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" autoFocus onClick={() => dialog.current?.close()} className="h-10 rounded-full px-4 text-sm font-semibold hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="h-10 rounded-full bg-destructive px-4 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-nav">
            Delete
          </button>
        </div>
      </div>
    </dialog>
  )
}
