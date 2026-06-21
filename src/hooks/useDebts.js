import { useCallback, useEffect, useState } from 'react'
import {
  loadDebts, saveDebts, makeDebt,
  loadSettlements, saveSettlements, seedIfEmpty,
} from '../lib/storage'

function sortDebts(list) {
  return [...list].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1
    return a.date < b.date ? 1 : -1
  })
}

export function useDebts() {
  const [debts, setDebts] = useState([])

  useEffect(() => {
    const { debts } = seedIfEmpty()
    setDebts(sortDebts(debts))
  }, [])

  const persist = useCallback((next) => {
    const sorted = sortDebts(next)
    setDebts(sorted)
    saveDebts(sorted)
  }, [])

  const addDebt = useCallback((data) => {
    setDebts((cur) => {
      const next = sortDebts([makeDebt(data), ...cur])
      saveDebts(next)
      return next
    })
  }, [])

  const updateDebt = useCallback((id, patch) => {
    setDebts((cur) => {
      const next = sortDebts(cur.map((d) => (d.id === id ? { ...d, ...patch } : d)))
      saveDebts(next)
      return next
    })
  }, [])

  const toggleSettled = useCallback((id) => {
    setDebts((cur) => {
      const next = sortDebts(
        cur.map((d) =>
          d.id === id
            ? d.status === 'open'
              ? { ...d, status: 'settled', settledDate: new Date().toISOString().slice(0, 10) }
              : { ...d, status: 'open', settledDate: null }
            : d
        )
      )
      saveDebts(next)
      return next
    })
  }, [])

  const deleteDebt = useCallback((id) => {
    setDebts((cur) => {
      const next = cur.filter((d) => d.id !== id)
      saveDebts(next)
      return next
    })
  }, [])

  const replaceDebts = useCallback((list) => persist(list), [persist])

  return { debts, addDebt, updateDebt, toggleSettled, deleteDebt, replaceDebts }
}

export function useSettlements() {
  const [settlements, setSettlements] = useState(() => loadSettlements())

  const upsertSettlement = useCallback((record) => {
    setSettlements((cur) => {
      const next = [...cur.filter((s) => s.month !== record.month), record].sort((a, b) =>
        a.month < b.month ? -1 : 1
      )
      saveSettlements(next)
      return next
    })
  }, [])

  const removeSettlement = useCallback((month) => {
    setSettlements((cur) => {
      const next = cur.filter((s) => s.month !== month)
      saveSettlements(next)
      return next
    })
  }, [])

  const replaceSettlements = useCallback((list) => {
    const next = [...list].sort((a, b) => (a.month < b.month ? -1 : 1))
    setSettlements(next)
    saveSettlements(next)
  }, [])

  return { settlements, upsertSettlement, removeSettlement, replaceSettlements }
}
