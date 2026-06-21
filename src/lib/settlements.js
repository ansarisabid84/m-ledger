// Month settlement = closing a month and carrying its balance into the next.
// opening(month) = carryForward of the most recent settled month *before* it.

export function settlementFor(month, settlements) {
  return settlements.find((s) => s.month === month) || null
}

export function openingBalance(month, settlements) {
  if (month === 'all') return 0
  const prior = settlements
    .filter((s) => s.month < month)
    .sort((a, b) => (a.month < b.month ? 1 : -1))
  return prior.length ? prior[0].carryForward : 0
}

export function prevMonthKey(month) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function nextMonthKey(month) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function currentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Build/update a settlement record for a month.
export function buildSettlement(month, opening, income, expense) {
  return {
    month,
    openingBalance: opening,
    income,
    expense,
    carryForward: opening + income - expense,
    settledAt: new Date().toISOString(),
  }
}
