'use client'

import { Download, FileText, MoreHorizontal, Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { ATTACHMENT_BUCKET, type ChatMessage } from '@/lib/chat'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Kind = 'image' | 'video' | 'voice' | 'file'

// HEIC and friends don't render in <img>, so they show as files
export function attachmentKind(type: string): Kind {
  if (/^image\/(png|jpe?g|webp|gif|avif)$/.test(type)) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('audio/')) return 'voice'
  return 'file'
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const formatClock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

// The bucket is private, so files are read through short-lived signed URLs.
// ponytail: one request per attachment, cached per page load; batch with createSignedUrls if threads get media-heavy
const SIGNED_TTL_S = 3600
const signed = new Map<string, { url: Promise<string | null>; at: number }>()

function useAttachmentUrl(path: string, download?: string) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const key = `${path}|${download ?? ''}`
    let hit = signed.get(key)
    if (!hit || Date.now() - hit.at > (SIGNED_TTL_S - 300) * 1000) {
      hit = {
        at: Date.now(),
        url: createClient()
          .storage.from(ATTACHMENT_BUCKET)
          .createSignedUrl(path, SIGNED_TTL_S, download ? { download } : undefined)
          .then(({ data }) => data?.signedUrl ?? null),
      }
      signed.set(key, hit)
    }
    let live = true
    hit.url.then((u) => live && setUrl(u))
    return () => {
      live = false
    }
  }, [path, download])
  return url
}

function VoicePlayer({ path, own }: { path: string; own: boolean }) {
  const url = useAttachmentUrl(path)
  const audio = useRef<HTMLAudioElement>(null)
  const fixing = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)

  return (
    <div className="flex w-64 max-w-full items-center gap-3 px-3 pt-2.5">
      <button
        type="button"
        disabled={!url}
        onClick={() => (audio.current?.paused ? audio.current.play() : audio.current?.pause())}
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          own ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'
        )}
      >
        {playing ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
      </button>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.01}
        value={time}
        disabled={!duration}
        onChange={(e) => {
          if (audio.current) audio.current.currentTime = Number(e.target.value)
        }}
        aria-label="Voice message position"
        className={cn('h-1 min-w-0 flex-1 cursor-pointer', own ? 'accent-primary-foreground' : 'accent-primary-ink')}
      />
      <span className="w-9 shrink-0 text-right text-xs tabular-nums">
        {formatClock(playing || time > 0 ? time : duration)}
      </span>
      {url && (
        <audio
          ref={audio}
          src={url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setTime(0)}
          // Recorder webm has no duration header; seeking past the end makes the browser compute it
          onLoadedMetadata={(e) => {
            const a = e.currentTarget
            if (Number.isFinite(a.duration)) setDuration(a.duration)
            else {
              fixing.current = true
              a.currentTime = 1e101
            }
          }}
          onDurationChange={(e) => {
            const a = e.currentTarget
            if (!Number.isFinite(a.duration)) return
            setDuration(a.duration)
            if (fixing.current) {
              fixing.current = false
              a.currentTime = 0
            }
          }}
          onTimeUpdate={(e) => !fixing.current && setTime(e.currentTarget.currentTime)}
        />
      )}
    </div>
  )
}

function Attachment({
  message,
  own,
  onMediaLoad,
}: {
  message: ChatMessage
  own: boolean
  onMediaLoad: () => void
}) {
  const path = message.attachment_path!
  const kind = attachmentKind(message.attachment_type ?? '')
  const name = message.attachment_name ?? 'File'
  const url = useAttachmentUrl(path, kind === 'file' ? name : undefined)

  if (kind === 'voice') return <VoicePlayer path={path} own={own} />

  if (kind === 'file')
    return (
      <a
        href={url ?? undefined}
        aria-disabled={!url}
        className="m-1 flex w-64 max-w-[calc(100%-0.5rem)] items-center gap-3 rounded-xl bg-background/15 p-2.5 transition-colors hover:bg-background/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg',
            own ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'
          )}
        >
          <FileText className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{name}</span>
          {message.attachment_size != null && (
            <span className="block text-xs tabular-nums opacity-75">{formatBytes(message.attachment_size)}</span>
          )}
        </span>
        <Download className="size-4 shrink-0 opacity-75" aria-hidden />
        <span className="sr-only">Download</span>
      </a>
    )

  // Image and video sit inset in the bubble; a placeholder holds space until the URL is signed
  if (!url) return <div className="m-1 aspect-[4/3] w-64 max-w-[calc(100%-0.5rem)] animate-pulse rounded-xl bg-background/20" />
  return kind === 'image' ? (
    <a href={url} target="_blank" rel="noreferrer" className="block rounded-2xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={name}
        onLoad={onMediaLoad}
        className="max-h-80 w-full min-w-40 rounded-xl object-cover"
      />
    </a>
  ) : (
    <div className="p-1">
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        onLoadedMetadata={onMediaLoad}
        className="max-h-80 w-full min-w-40 rounded-xl bg-nav"
      />
    </div>
  )
}

interface ChatMessageItemProps {
  message: ChatMessage
  isOwnMessage: boolean
  // Consecutive messages from one sender share flattened inner corners
  isFirstInGroup: boolean
  isLastInGroup: boolean
  onEdit: (message: ChatMessage) => void
  onDelete: (message: ChatMessage) => void
  onMediaLoad: () => void
}

export const ChatMessageItem = ({
  message,
  isOwnMessage: own,
  isFirstInGroup,
  isLastInGroup,
  onEdit,
  onDelete,
  onMediaLoad,
}: ChatMessageItemProps) => {
  const deleted = !!message.deleted_at
  // Edit hands focus to the composer, so the menu must not pull it back to its trigger
  const editChosen = useRef(false)
  const corners = own
    ? cn(!isFirstInGroup && 'rounded-tr-md', !isLastInGroup && 'rounded-br-md')
    : cn(!isFirstInGroup && 'rounded-tl-md', !isLastInGroup && 'rounded-bl-md')
  const meta = (
    <span className="block px-3 pb-1.5 pt-0.5 text-right text-[11px] tabular-nums opacity-70">
      {message.edited_at && 'Edited · '}
      <time dateTime={message.created_at}>{timeOf(message.created_at)}</time>
    </span>
  )

  return (
    <div className={cn('group flex items-center gap-1', own ? 'flex-row-reverse' : 'flex-row', isFirstInGroup ? 'mt-3' : 'mt-0.5')}>
      {deleted ? (
        <div className={cn('rounded-2xl border border-dashed border-input text-muted-foreground', corners)}>
          <p className="px-3 pt-2 text-sm italic">Message deleted</p>
          {meta}
        </div>
      ) : (
        <div
          className={cn(
            'max-w-[min(80%,28rem)] overflow-hidden rounded-2xl',
            own ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
            corners
          )}
        >
          {message.attachment_path && <Attachment message={message} own={own} onMediaLoad={onMediaLoad} />}
          {message.body && <p className="whitespace-pre-wrap break-words px-3 pt-2 text-sm">{message.body}</p>}
          {meta}
        </div>
      )}

      {own && !deleted && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Message actions"
              // Revealed on hover for mice; always there (quietly) on touch screens
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-secondary focus-visible:opacity-100 group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:opacity-100 [@media(hover:none)]:opacity-60"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-40"
            onCloseAutoFocus={(e) => {
              if (editChosen.current) e.preventDefault()
              editChosen.current = false
            }}
          >
            {message.body && (
              <DropdownMenuItem
                onSelect={() => {
                  editChosen.current = true
                  onEdit(message)
                }}
              >
                <Pencil />
                Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => onDelete(message)} className="text-destructive focus:text-destructive">
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export function TypingBubble({ name }: { name: string }) {
  return (
    <div className="mt-3 flex">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-secondary px-4 py-3.5" aria-hidden>
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            style={{ animationDelay: `${delay}ms` }}
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground motion-reduce:animate-none"
          />
        ))}
      </div>
      <span className="sr-only">{name} is typing</span>
    </div>
  )
}
