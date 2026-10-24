// Dashboard widget registry. The user's layout is stored in settings.dashboard.widgets
// as an ordered [{ id, visible }] list; anything missing (e.g. a widget added in a later
// version) is appended so upgrades never hide new widgets silently or crash on old data.

export const WIDGETS = [
  { id: 'hero',       label: 'Balance / spending summary', icon: '💳', needsIncome: false },
  { id: 'stats',      label: 'Quick stats',                icon: '📊', needsIncome: false },
  { id: 'daily',      label: 'Daily allowance & forecast', icon: '🧮', needsIncome: false },
  { id: 'budget',     label: 'Monthly budget',             icon: '🎯', needsIncome: false },
  { id: 'catBudgets', label: 'Category budget alerts',     icon: '🚨', needsIncome: false },
  { id: 'week',       label: 'Last 7 days',                icon: '📆', needsIncome: false },
  { id: 'upcoming',   label: 'Upcoming recurring bills',   icon: '🔁', needsIncome: false },
  { id: 'settlement', label: 'Month settlement',           icon: '🔒', needsIncome: true },
  { id: 'categories', label: 'Spending by category',       icon: '🍩', needsIncome: false },
  { id: 'methods',    label: 'Payment methods',            icon: '💳', needsIncome: false },
  { id: 'trend',      label: '6-month trend',              icon: '📈', needsIncome: false },
  { id: 'insights',   label: 'Spending insights',          icon: '💡', needsIncome: false },
  { id: 'recent',     label: 'Recent activity',            icon: '🕒', needsIncome: false },
]

// New widgets start hidden for existing users with a saved layout so nothing jumps around.
const OFF_BY_DEFAULT = new Set([])

export const WIDGET_MAP = Object.fromEntries(WIDGETS.map((w) => [w.id, w]))

export function defaultLayout() {
  return WIDGETS.map((w) => ({ id: w.id, visible: !OFF_BY_DEFAULT.has(w.id) }))
}

export function resolveLayout(saved) {
  if (!Array.isArray(saved) || !saved.length) return defaultLayout()
  const seen = new Set()
  const out = []
  for (const item of saved) {
    if (item && WIDGET_MAP[item.id] && !seen.has(item.id)) {
      seen.add(item.id)
      out.push({ id: item.id, visible: item.visible !== false })
    }
  }
  for (const w of WIDGETS) if (!seen.has(w.id)) out.push({ id: w.id, visible: true })
  return out
}
