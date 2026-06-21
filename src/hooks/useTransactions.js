import { useCallback, useEffect, useState } from 'react'
import {
  saveTransactions,
  makeTransaction,
  seedIfEmpty,
} from '../lib/storage'

export function useTransactions() {
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    const { transactions } = seedIfEmpty()
    setTransactions(transactions)
  }, [])

  const persist = useCallback((next) => {
    const sorted = [...next].sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt
    )
    setTransactions(sorted)
    saveTransactions(sorted)
  }, [])

  const addTransaction = useCallback(
    (data) => {
      persist([makeTransaction(data), ...transactions])
    },
    [transactions, persist]
  )

  const updateTransaction = useCallback(
    (id, data) => {
      persist(
        transactions.map((t) =>
          t.id === id ? { ...t, ...data, amount: Number(data.amount) } : t
        )
      )
    },
    [transactions, persist]
  )

  const deleteTransaction = useCallback(
    (id) => {
      persist(transactions.filter((t) => t.id !== id))
    },
    [transactions, persist]
  )

  const replaceAll = useCallback(
    (list) => {
      persist(list)
    },
    [persist]
  )

  const clearAll = useCallback(() => {
    persist([])
  }, [persist])

  return {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    replaceAll,
    clearAll,
  }
}
