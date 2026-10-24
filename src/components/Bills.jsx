import { useMemo } from 'react'
import { CATEGORY_MAP } from '../lib/constants'
import { fmtMoney, maskMoney, fmtDate, todayISO } from '../lib/format'
import { nextDueDate } from '../lib/recurring'
import { IconRepeat, IconEdit, IconTrash } from './icons'

const PER_MONTH = { daily: 30, weekly: 52 / 12, monthly: 1, yearly: 1 / 12 }

// Recurring bills & subscriptions: see everything that repeats, pause it, resume it or stop it.
export default function Bills({ transactions, currency, onEdit, onUpdate, onAdd, hideAmounts }) {
  const bills = useMemo(
    () => transactions
      .filter((t) => t.recurring && t.type === 'expense')
      .sort((a, b) => Number(!!b.recurring.enabled) - Number(!!a.recurring.enabled) || (a.recurring.nextDate || '').localeCompare(b.recurring.nextDate || '')),
    [transactions]
  )
  const monthly = useMemo(
    () => bills.filter((b) => b.recurring.enabled).reduce((s, b) => s + b.amount * (PER_MONTH[b.recurring.frequency] || 1), 0),
    [bills]
  )
  const today = todayISO()

  function pause(b) { onUpdate(b.id, { amount: b.amount, recurring: { ...b.recurring, enabled: false } }) }
  function resume(b) {
    // jump to the next upcoming date — don't back-fill the time it was paused
    let next = b.recurring.nextDate || nextDueDate(b.recurring.frequency, b.date)
    let guard = 0
    while (next < today && guard++ < 1000) next = nextDueDate(b.recurring.frequency, next)
    onUpdate(b.id, { amount: b.amount, recurring: { ...b.recurring, enabled: true, nextDate: next } })
  }
  function stop(b) { onUpdate(b.id, { amount: b.amount, recurring: null }) }

  return (
    <div className="section">
      <div className="hero">
        <div className="hero-label">Committed every month (approx.)</div>
        <div className="hero-balance">{maskMoney(monthly, currency, hideAmounts)}</div>
        <div className="hero-meta">{bills.filter((b) => b.recurring.enabled).length} active · {bills.filter((b) => !b.recurring.enabled).length} paused</div>
      </div>

      <div className="card card-pad">
        {bills.length === 0 ? (
          <div className="empty" style={{ padding: '26px 8px' }}>
            <div className="empty-ico"><IconRepeat width={26} height={26} /></div>
            <h3>No recurring bills yet</h3>
            <p style={{ marginBottom: 14 }}>Rent, subscriptions, EMIs — turn on &ldquo;Recurring&rdquo; when adding an expense and it will auto-log and show up here.</p>
            <button className="btn btn-primary" onClick={() => onAdd()}>Add an expense</button>
          </div>
        ) : (
          <div className="tx-list">
            {bills.map((b) => {
              const cat = CATEGORY_MAP[b.category] || { label: b.category, icon: '•' }
              const active = b.recurring.enabled
              const due = b.recurring.nextDate
              const days = due ? Math.round((new Date(due + 'T12:00:00') - new Date(today + 'T12:00:00')) / 86400000) : null
              return (
                <div key={b.id} className="tx" style={{ opacity: active ? 1 : 0.6, flexWrap: 'wrap' }}>
                  <div className="tx-ico">{cat.icon}</div>
                  <div className="tx-main">
                    <div className="tx-cat">{b.note || cat.label}</div>
                    <div className="tx-sub">
                      <span className="tx-recurring">{b.recurring.frequency}</span>
                      {active && due ? <span>{days <= 0 ? 'due today' : days === 1 ? 'tomorrow' : `in ${days} days`} · {fmtDate(due)}</span> : <span>Paused</span>}
                    </div>
                  </div>
                  <div className="tx-amt neg">{hideAmounts ? '***' : fmtMoney(b.amount, currency)}</div>
                  <div style={{ display: 'flex', gap: 6, width: '100%', paddingLeft: 54 }}>
                    <button className="btn btn-sm" onClick={() => (active ? pause(b) : resume(b))}>{active ? 'Pause' : 'Resume'}</button>
                    <button className="btn btn-sm" onClick={() => onEdit(b)}><IconEdit width={13} height={13} /> Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => stop(b)}><IconTrash width={13} height={13} /> Stop</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
