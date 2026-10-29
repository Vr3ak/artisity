import { useCallback, useRef } from 'react'

export function useChatScroll() {
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current
    if (!container) return
    container.scrollTo({ top: container.scrollHeight, behavior })
  }, [])

  // Within ~one bubble of the bottom counts as "reading the latest"
  const isNearBottom = useCallback(() => {
    const c = containerRef.current
    return !c || c.scrollHeight - c.scrollTop - c.clientHeight < 120
  }, [])

  return { containerRef, scrollToBottom, isNearBottom }
}
