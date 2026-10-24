import { useMemo, useRef, useState } from 'react'
import { CATEGORY_MAP, METHOD_MAP, PAYMENT_METHODS, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../lib/constants'
import { fmtMoney, maskMoney, AMOUNT_MASK, fmtDate, relativeDay, monthLabel, todayISO } from '../lib/format'
import { filterByMonth, listMonths, totals } from '../lib/stats'
import MonthPager from './MonthPager'
import { useSwipe } from '../hooks/useSwipe'
import { IconSearch, IconEdit, IconTrash, IconList, IconClose } from './icons'

// ─── Detail modal ────────────────────────────────────────────────────────────

function DetailRow({ label, value }) {
  return (
    <div className="tx-detail-row">
      <span className="tx-detail-label">{label}</span>
      <span className="tx-detail-value">{value}</span>
    </div>
  )
}

function TransactionDetail({ t, currency, onEdit, onDelete, onClose, hideAmounts }) {
  const cat = CATEGORY_MAP[t.category] || { label: t.category, icon: '•' }
  const method = METHOD_MAP[t.method] || { label: t.method, icon: '•' }
  const isIncome = t.type === 'income'

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Transaction details">
        <div className="modal-grab" />
        <div className="modal-head">
          <h3 style={{ fontSize: 18 }}>Transaction details</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>

        {/* Amount hero */}
        <div style={{ textAlign: 'center', padding: '8px 0 22px' }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18, margin: '0 auto 14px',
            background: isIncome ? 'var(--income-tint)' : 'var(--surface-2)',
            display: 'grid', placeItems: 'center', fontSize: 28,
          }}>
            {cat.icon}
          </div>
          <div className="num" style={{
            fontWeight: 700, fontSize: 34, letterSpacing: '-0.025em',
            color: isIncome ? 'var(--income)' : 'var(--expense)',
          }}>
            {hideAmounts ? AMOUNT_MASK : (isIncome ? '+' : '−') + fmtMoney(t.amount, currency)}
          </div>
          <span style={{
            display: 'inline-block', marginTop: 8, fontSize: 12, fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '3px 10px', borderRadius: '999px',
            background: isIncome ? 'var(--income-tint)' : 'var(--expense-tint)',
            color: isIncome ? 'var(--income)' : 'var(--expense)',
          }}>
            {isIncome ? 'Income' : 'Expense'}
          </span>
        </div>

        {/* Details */}
        <div className="tx-detail-table">
          <DetailRow label="Category" value={`${cat.icon} ${cat.label}`} />
          <DetailRow label="Method" value={`${method.icon} ${method.label}`} />
          <DetailRow label="Date" value={fmtDate(t.date)} />
          {t.note ? <DetailRow label="Note" value={t.note} /> : null}
        </div>

        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
          <button className="btn" style={{ justifyContent: 'center' }} onClick={() => { onEdit(t); onClose() }}>
            <IconEdit width={16} height={16} /> Edit
          </button>
          <button className="btn btn-danger" style={{ justifyContent: 'center' }} onClick={() => { onDelete(t); onClose() }}>
            <IconTrash width={16} height={16} /> Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function TxRow({ t, currency, onView, onEdit, onDelete, hideAmounts }) {
  const cat = CATEGORY_MAP[t.category] || { label: t.category, icon: '•' }
  const method = METHOD_MAP[t.method] || { label: t.method, icon: '•' }
  const isIncome = t.type === 'income'
  return (
    <div className="tx">
      <div
        className="tx-ico"
        style={{ background: isIncome ? 'var(--income-tint)' : 'var(--surface-2)', cursor: 'pointer' }}
        onClick={() => onView(t)}
      >
        {cat.icon}
      </div>
      <div className="tx-main" style={{ cursor: 'pointer' }} onClick={() => onView(t)}>
        <div className="tx-cat">
          {cat.label}
          {t.note ? <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}> · {t.note}</span> : ''}
        </div>
        <div className="tx-sub">
          <span className="tx-method">{method.icon} {method.label}</span>
          <span>{relativeDay(t.date)}</span>
          {(t.recurring?.enabled || t._fromRecurring) && <span className="tx-recurring">↻ recurring</span>}
        </div>
      </div>
      <div className={'tx-amt ' + (isIncome ? 'pos' : 'neg')} style={{ cursor: 'pointer' }} onClick={() => onView(t)}>
        {hideAmounts ? AMOUNT_MASK : (isIncome ? '+' : '−') + fmtMoney(t.amount, currency)}
      </div>
      <div className="tx-actions">
        <button className="tx-act" onClick={() => onEdit(t)} aria-label="Edit"><IconEdit /></button>
        <button className="tx-act" onClick={() => onDelete(t)} aria-label="Delete"><IconTrash /></button>
      </div>
    </div>
  )
}

// ─── Swipe-to-reveal actions (touch) ─────────────────────────────────────────

const ACTION_W = 136

function SwipeRow({ children, onEdit, onDelete }) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const st = useRef({ x: 0, y: 0, base: 0, locked: null })

  function start(e) {
    const t = e.touches[0]
    st.current = { x: t.clientX, y: t.clientY, base: dx, locked: null }
  }
  function move(e) {
    const t = e.touches[0]
    const mx = t.clientX - st.current.x
    const my = t.clientY - st.current.y
    if (st.current.locked == null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) st.current.locked = Math.abs(mx) > Math.abs(my) * 1.5 ? 'h' : 'v'
    if (st.current.locked !== 'h') return
    setDragging(true)
    setDx(Math.max(-ACTION_W, Math.min(0, st.current.base + mx)))
  }
  function end() {
    setDragging(false)
    if (st.current.locked === 'h') setDx((v) => (v < -ACTION_W / 2.5 ? -ACTION_W : 0))
  }

  return (
    <div className="swipe-row" data-noswipe>
      <div className="swipe-row-actions" style={{ visibility: dx < 0 ? 'visible' : 'hidden' }}>
        <button className="sw-edit" onClick={() => { setDx(0); onEdit() }}><IconEdit width={16} height={16} />Edit</button>
        <button className="sw-del" onClick={() => { setDx(0); onDelete() }}><IconTrash width={16} height={16} />Delete</button>
      </div>
      <div
        className={'swipe-row-body' + (dragging ? ' dragging' : '')}
        style={{ transform: `translateX(${dx}px)`, background: dx ? 'var(--surface-solid)' : 'transparent' }}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end} onTouchCancel={end}
      >
        {children}
      </div>
    </div>
  )
}

// ─── Spending calendar (heat map) ────────────────────────────────────────────

function HeatCalendar({ month, transactions, selected, onSelect, currency, hideAmounts }) {
  const [y, m] = month.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7 // Monday-first
  const perDay = useMemo(() => {
    const map = {}
    for (const t of transactions) if (t.type === 'expense') map[t.date] = (map[t.date] || 0) + t.amount
    return map
  }, [transactions])
  const max = Math.max(1, ...Object.values(perDay))
  const today = todayISO()
  const cells = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${String(d).padStart(2, '0')}`)

  return (
    <div>
      <div className="heat" style={{ marginBottom: 6 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="heat-head">{d}</div>)}
      </div>
      <div className="heat">
        {cells.map((iso, i) => {
          if (!iso) return <div key={i} className="heat-cell blank" />
          const v = perDay[iso] || 0
          const a = v ? 0.18 + 0.62 * (v / max) : 0
          return (
            <button
              key={iso}
              className={'heat-cell' + (iso === today ? ' today' : '') + (selected === iso ? ' sel' : '')}
              style={v ? { background: `color-mix(in srgb, var(--expense) ${Math.round(a * 100)}%, transparent)` } : undefined}
              onClick={() => onSelect(selected === iso ? null : iso)}
              title={v && !hideAmounts ? fmtMoney(v, currency) : ''}
              aria-label={`${iso}${v ? ' spent ' + (hideAmounts ? '' : fmtMoney(v, currency)) : ''}`}
            >
              {Number(iso.slice(8))}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── List ────────────────────────────────────────────────────────────────────

export default function TransactionList({ transactions, trackIncome = true, currency, month, onMonthChange, onEdit, onDelete, onAdd, hideAmounts }) {
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const [method, setMethod] = useState('all')
  const [category, setCategory] = useState('all')
  const [viewing, setViewing] = useState(null)
  const [showCal, setShowCal] = useState(false)
  const [day, setDay] = useState(null)

  const months = useMemo(() => listMonths(transactions), [transactions])
  const inScope = useMemo(() => filterByMonth(transactions, month), [transactions, month])
  const scopeTotals = useMemo(() => totals(inScope), [inScope])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return inScope.filter((t) => {
      if (type !== 'all' && t.type !== type) return false
      if (method !== 'all' && t.method !== method) return false
      if (category !== 'all' && t.category !== category) return false
      if (day && t.date !== day) return false
      if (term) {
        const cat = (CATEGORY_MAP[t.category]?.label || '').toLowerCase()
        const hay = `${cat} ${t.note || ''}`.toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [inScope, q, type, method, category, day])

  const groups = useMemo(() => {
    const map = new Map()
    for (const t of filtered) {
      if (!map.has(t.date)) map.set(t.date, [])
      map.get(t.date).push(t)
    }
    return [...map.entries()]
  }, [filtered])

  const catOptions = !trackIncome ? EXPENSE_CATEGORIES : type === 'income' ? INCOME_CATEGORIES : type === 'expense' ? EXPENSE_CATEGORIES : [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

  const mIdx = months.indexOf(month)
  const swipe = useSwipe({
    onLeft: () => { if (month !== 'all' && mIdx > 0) { onMonthChange(months[mIdx - 1]); setDay(null) } },
    onRight: () => { if (month !== 'all' && mIdx < months.length - 1) { onMonthChange(months[mIdx + 1]); setDay(null) } },
  })
  const hasFilter = q || type !== 'all' || method !== 'all' || category !== 'all' || day

  return (
    <div className="section" {...swipe}>
      <div>
        <div className="eyebrow">{month === 'all' ? 'All transactions' : monthLabel(month)}</div>
        <h2 className="page-title">History</h2>
      </div>
      <MonthPager months={months} value={month} onChange={(m) => { onMonthChange(m); setDay(null) }} />

      <div className="stat-grid">
        {trackIncome && (
          <div className="stat">
            <div className="stat-top">Income</div>
            <div className="stat-val num pos">{maskMoney(scopeTotals.income, currency, hideAmounts)}</div>
          </div>
        )}
        <div className="stat">
          <div className="stat-top">Expenses</div>
          <div className="stat-val num neg">{maskMoney(scopeTotals.expense, currency, hideAmounts)}</div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="filter-stack" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="search" style={{ flex: 1 }}>
              <IconSearch />
              <input className="input" placeholder="Search notes or categories…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {month !== 'all' && (
              <button className={'icon-btn' + (showCal ? ' active' : '')} style={{ width: 46, height: 'auto', color: showCal ? 'var(--brand)' : undefined }} onClick={() => setShowCal((v) => !v)} aria-label="Toggle spending calendar" title="Spending calendar">
                <span style={{ fontSize: 18 }}>🗓️</span>
              </button>
            )}
          </div>
          {showCal && month !== 'all' && (
            <div data-noswipe style={{ padding: '4px 0 2px' }}>
              <HeatCalendar month={month} transactions={inScope} selected={day} onSelect={setDay} currency={currency} hideAmounts={hideAmounts} />
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 8, textAlign: 'center' }}>Darker = more spent. Tap a day to filter.</div>
            </div>
          )}
          <div className="filter-row">
            {trackIncome && (
              <select className="select filter-select" value={type} onChange={(e) => { setType(e.target.value); setCategory('all') }}>
                <option value="all">All types</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            )}
            <select className="select filter-select" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="all">All methods</option>
              {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <select className="select filter-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All categories</option>
              {catOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-ico"><IconList width={28} height={28} /></div>
            <h3>{inScope.length === 0 ? 'No transactions in this period' : 'No matches'}</h3>
            <p style={{ marginBottom: 16 }}>
              {inScope.length === 0 ? 'Add a transaction or pick another month.' : 'Try clearing the filters above.'}
            </p>
            {inScope.length === 0 && <button className="btn btn-primary" onClick={() => onAdd()}>{trackIncome ? 'Add transaction' : 'Add expense'}</button>}
            {inScope.length > 0 && hasFilter && <button className="btn" onClick={() => { setQ(''); setType('all'); setMethod('all'); setCategory('all'); setDay(null) }}>Clear filters</button>}
          </div>
        ) : (
          <div>
            {groups.map(([date, items]) => {
              const dayTotal = items.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)
              const dayColor = !trackIncome ? 'var(--ink-soft)' : dayTotal >= 0 ? 'var(--income)' : 'var(--ink-soft)'
              return (
                <div key={date} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '14px 4px 4px', borderBottom: '1px solid var(--border)' }}>
                    <span className="eyebrow">{relativeDay(date)}</span>
                    <span className="num" style={{ fontSize: 12.5, fontWeight: 600, color: dayColor }}>
                      {hideAmounts ? AMOUNT_MASK : (dayTotal >= 0 ? '+' : '−') + fmtMoney(Math.abs(dayTotal), currency)}
                    </span>
                  </div>
                  <div className="tx-list">
                    {items.map((t) => (
                      <SwipeRow key={t.id} onEdit={() => onEdit(t)} onDelete={() => onDelete(t)}>
                        <TxRow t={t} currency={currency} onView={setViewing} onEdit={onEdit} onDelete={onDelete} hideAmounts={hideAmounts} />
                      </SwipeRow>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {viewing && (
        <TransactionDetail
          t={viewing}
          currency={currency}
          onEdit={(t) => { onEdit(t); setViewing(null) }}
          onDelete={(t) => { onDelete(t); setViewing(null) }}
          onClose={() => setViewing(null)}
          hideAmounts={hideAmounts}
        />
      )}
    </div>
  )
}
