import { useRef } from 'react'

// Horizontal swipe detection for touch screens. Returns handlers to spread onto an element.
// Only fires when the gesture is clearly horizontal (so vertical scrolling is untouched) and
// ignores gestures that start on form fields or elements marked data-noswipe.
export function useSwipe({ onLeft, onRight, threshold = 60 }) {
  const start = useRef(null)
  const cbs = useRef({})
  cbs.current = { onLeft, onRight }

  return {
    onTouchStart(e) {
      const t = e.touches[0]
      const blocked = e.target.closest?.('input,select,textarea,[data-noswipe]')
      start.current = blocked ? null : { x: t.clientX, y: t.clientY, time: Date.now() }
    },
    onTouchEnd(e) {
      const s = start.current
      start.current = null
      if (!s) return
      const t = e.changedTouches[0]
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.8) return
      if (Date.now() - s.time > 700) return
      if (dx < 0) cbs.current.onLeft?.()
      else cbs.current.onRight?.()
    },
    onTouchCancel() { start.current = null },
  }
}
