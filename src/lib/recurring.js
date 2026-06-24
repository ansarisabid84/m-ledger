import { todayISO } from './format'

export function nextDueDate(frequency, fromDate) {
  const d = new Date(fromDate + 'T12:00:00')
  if (frequency === 'daily') d.setDate(d.getDate() + 1)
  else if (frequency === 'weekly') d.setDate(d.getDate() + 7)
  else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1)
  else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

// Returns { toAdd: Transaction[], updatedSource: Transaction[] }
// toAdd:         new transaction objects to insert
// updatedSource: source recurring transactions with updated nextDate
export function processDueRecurring(transactions) {
  const today = todayISO()
  const toAdd = []
  const updatedSource = []

  for (const t of transactions) {
    if (!t.recurring?.enabled) continue
    const start = t.recurring.nextDate || nextDueDate(t.recurring.frequency, t.date)
    let next = start
    let lastNext = next

    while (next <= today) {
      toAdd.push({
        type: t.type,
        amount: t.amount,
        category: t.category,
        method: t.method,
        date: next,
        note: t.note,
        recurring: null,
        _fromRecurring: t.id,
      })
      lastNext = nextDueDate(t.recurring.frequency, next)
      next = lastNext
    }

    if (lastNext !== start) {
      updatedSource.push({ id: t.id, nextDate: lastNext })
    }
  }

  return { toAdd, updatedSource }
}
