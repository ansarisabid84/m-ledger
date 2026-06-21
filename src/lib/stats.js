import { monthKey, shortMonth } from './format'
import { CATEGORY_MAP, METHOD_MAP, CHART_COLORS } from './constants'

export function listMonths(transactions) {
  const set = new Set(transactions.map((t) => monthKey(t.date)))
  set.add(monthKey(new Date().toISOString().slice(0, 10)))
  return [...set].sort().reverse()
}

export function filterByMonth(transactions, mKey) {
  if (mKey === 'all') return transactions
  return transactions.filter((t) => monthKey(t.date) === mKey)
}

export function totals(transactions) {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (t.type === 'income') income += t.amount
    else expense += t.amount
  }
  return { income, expense, balance: income - expense, count: transactions.length }
}

// expense breakdown by category -> [{ key, name, value, color }]
export function byCategory(transactions, type = 'expense') {
  const map = new Map()
  for (const t of transactions) {
    if (t.type !== type) continue
    map.set(t.category, (map.get(t.category) || 0) + t.amount)
  }
  const rows = [...map.entries()]
    .map(([key, value]) => ({
      key,
      name: CATEGORY_MAP[key]?.label || key,
      icon: CATEGORY_MAP[key]?.icon || '•',
      value,
    }))
    .sort((a, b) => b.value - a.value)
  return rows.map((r, i) => ({ ...r, color: CHART_COLORS[i % CHART_COLORS.length] }))
}

// spending by payment method -> [{ key, name, value, icon }]
export function byMethod(transactions, type = 'expense') {
  const map = new Map()
  for (const t of transactions) {
    if (t.type !== type) continue
    map.set(t.method, (map.get(t.method) || 0) + t.amount)
  }
  return [...map.entries()]
    .map(([key, value]) => ({
      key,
      name: METHOD_MAP[key]?.label || key,
      icon: METHOD_MAP[key]?.icon || '•',
      value,
    }))
    .sort((a, b) => b.value - a.value)
}

// monthly income vs expense over the last N months -> [{ key, label, income, expense }]
export function monthlyTrend(transactions, months = 6) {
  const now = new Date()
  const keys = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const base = Object.fromEntries(keys.map((k) => [k, { key: k, label: shortMonth(k), income: 0, expense: 0 }]))
  for (const t of transactions) {
    const k = monthKey(t.date)
    if (base[k]) base[k][t.type] += t.amount
  }
  return keys.map((k) => base[k])
}

// daily net flow within a month -> [{ day, income, expense }]
export function dailyFlow(transactions) {
  const map = new Map()
  for (const t of transactions) {
    const day = t.date.slice(8, 10)
    if (!map.has(day)) map.set(day, { day, income: 0, expense: 0 })
    map.get(day)[t.type] += t.amount
  }
  return [...map.values()].sort((a, b) => Number(a.day) - Number(b.day))
}
