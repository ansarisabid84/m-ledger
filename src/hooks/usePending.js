import { useCallback, useEffect, useState } from 'react'
import { loadPending, savePending, makePending } from '../lib/storage'

export function usePending() {
  const [pending, setPending] = useState([])

  useEffect(() => {
    setPending(loadPending())
  }, [])

  const persist = useCallback((next) => {
    setPending(next)
    savePending(next)
  }, [])

  const addPending = useCallback((data) => {
    const item = makePending(data)
    persist([item, ...pending])
    return item
  }, [pending, persist])

  const removePending = useCallback((id) => {
    persist(pending.filter((p) => p.id !== id))
  }, [pending, persist])

  const clearPending = useCallback(() => {
    persist([])
  }, [persist])

  return { pending, addPending, removePending, clearPending }
}
