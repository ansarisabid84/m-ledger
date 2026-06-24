import { useCallback, useEffect, useState } from 'react'
import { loadGoals, saveGoals, makeGoal } from '../lib/storage'

export function useGoals() {
  const [goals, setGoals] = useState([])

  useEffect(() => {
    setGoals(loadGoals())
  }, [])

  const persist = useCallback((next) => {
    setGoals(next)
    saveGoals(next)
  }, [])

  const addGoal = useCallback((data) => {
    persist([makeGoal(data), ...goals])
  }, [goals, persist])

  const updateGoal = useCallback((id, patch) => {
    persist(goals.map((g) => g.id === id ? { ...g, ...patch } : g))
  }, [goals, persist])

  const contributeToGoal = useCallback((id, amount) => {
    persist(goals.map((g) => g.id === id
      ? { ...g, savedAmount: Math.min(g.targetAmount, g.savedAmount + Number(amount)) }
      : g
    ))
  }, [goals, persist])

  const deleteGoal = useCallback((id) => {
    persist(goals.filter((g) => g.id !== id))
  }, [goals, persist])

  return { goals, addGoal, updateGoal, contributeToGoal, deleteGoal }
}
