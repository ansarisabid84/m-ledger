import { CURRENCY_MAP } from './constants'

export function fmtMoney(amount, currencyCode = 'NPR', opts = {}) {
  const cur = CURRENCY_MAP[currencyCode] || CURRENCY_MAP.NPR
  try {
    const formatted = new Intl.NumberFormat(cur.locale, {
      style: 'currency',
      currency: cur.code,
      maximumFractionDigits: opts.decimals ?? 2,
      minimumFractionDigits: opts.decimals ?? 2,
    }).format(amount)
    // Replace INR symbol with NPR symbol when currency is NPR
    if (cur.code === 'NPR') return formatted.replace(/₹|INR\s*/g, `${cur.symbol}`)
    return formatted
  } catch {
    return `${cur.symbol}${amount.toFixed(2)}`
  }
}

export function fmtCompact(amount, currencyCode = 'NPR') {
  const cur = CURRENCY_MAP[currencyCode] || CURRENCY_MAP.NPR
  const abs = Math.abs(amount)
  let v = amount
  let suffix = ''
  if (abs >= 1e7) { v = amount / 1e7; suffix = 'Cr' }
  else if (abs >= 1e5) { v = amount / 1e5; suffix = 'L' }
  else if (abs >= 1e3) { v = amount / 1e3; suffix = 'K' }
  const num = suffix ? v.toFixed(v >= 100 ? 0 : 1) : Math.round(v).toString()
  return `${cur.symbol}${num}${suffix}`
}

export function currencySymbol(code = 'NPR') {
  return (CURRENCY_MAP[code] || CURRENCY_MAP.NPR).symbol
}

export function todayISO() {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export function monthKey(iso) {
  return iso.slice(0, 7) // YYYY-MM
}

export function monthLabel(key) {
  const [y, m] = key.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function shortMonth(key) {
  const [y, m] = key.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString(undefined, { month: 'short' })
}

export function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function relativeDay(iso) {
  const today = todayISO()
  if (iso === today) return 'Today'
  const d = new Date(iso + 'T12:00:00')
  const t = new Date(today + 'T12:00:00')
  const diff = Math.round((t - d) / 86400000)
  if (diff === 1) return 'Yesterday'
  if (diff > 1 && diff < 7) return `${diff} days ago`
  return fmtDate(iso)
}
