import { useMemo, useState } from 'react'
import { CATEGORY_MAP, METHOD_MAP, PAYMENT_METHODS, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../lib/constants'
import { fmtMoney, relativeDay, monthLabel } from '../lib/format'
import { filterByMonth, listMonths, totals } from '../lib/stats'
import MonthNav from './MonthNav'
import { IconSearch, IconEdit, IconTrash, IconList } from './icons'

function TxRow({ t, currency, onEdit, onDelete }) {
  const cat = CATEGORY_MAP[t.category] || { label: t.category, icon: '•' }
  const method = METHOD_MAP[t.method] || { label: t.method, icon: '•' }
  const isIncome = t.type === 'income'
  return (
    <div className="tx">
      <div className="tx-ico" style={{ background: isIncome ? 'var(--income-tint)' : 'var(--surface-2)' }}>{cat.icon}</div>
      <div className="tx-main">
        <div className="tx-cat">{cat.label}{t.note ? <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}> · {t.note}</span> : ''}</div>
        <div className="tx-sub">
          <span className="tx-method">{method.icon} {method.label}</span>
          <span>{relativeDay(t.date)}</span>
        </div>
      </div>
      <div className={'tx-amt ' + (isIncome ? 'pos' : 'neg')}>
        {isIncome ? '+' : '−'}{fmtMoney(t.amount, currency)}
      </div>
      <div className="tx-actions">
        <button className="tx-act" onClick={() => onEdit(t)} aria-label="Edit"><IconEdit /></button>
        <button className="tx-act" onClick={() => onDelete(t)} aria-label="Delete"><IconTrash /></button>
      </div>
    </div>
  )
}

export default function TransactionList({ transactions, currency, month, onMonthChange, onEdit, onDelete, onAdd }) {
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const [method, setMethod] = useState('all')
  const [category, setCategory] = useState('all')

  const months = useMemo(() => listMonths(transactions), [transactions])
  const inScope = useMemo(() => filterByMonth(transactions, month), [transactions, month])
  const scopeTotals = useMemo(() => totals(inScope), [inScope])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return inScope.filter((t) => {
      if (type !== 'all' && t.type !== type) return false
      if (method !== 'all' && t.method !== method) return false
      if (category !== 'all' && t.category !== category) return false
      if (term) {
        const cat = (CATEGORY_MAP[t.category]?.label || '').toLowerCase()
        const hay = `${cat} ${t.note || ''}`.toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [inScope, q, type, method, category])

  const groups = useMemo(() => {
    const map = new Map()
    for (const t of filtered) {
      if (!map.has(t.date)) map.set(t.date, [])
      map.get(t.date).push(t)
    }
    return [...map.entries()]
  }, [filtered])

  const catOptions = type === 'income' ? INCOME_CATEGORIES : type === 'expense' ? EXPENSE_CATEGORIES : [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

  return (
    <div className="section">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">{month === 'all' ? 'All transactions' : monthLabel(month)}</div>
          <h2 className="page-title">History</h2>
        </div>
        <MonthNav months={months} value={month} onChange={onMonthChange} />
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-top">Income</div>
          <div className="stat-val num pos">{fmtMoney(scopeTotals.income, currency)}</div>
        </div>
        <div className="stat">
          <div className="stat-top">Expenses</div>
          <div className="stat-val num neg">{fmtMoney(scopeTotals.expense, currency)}</div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="filters" style={{ marginBottom: 12 }}>
          <div className="search">
            <IconSearch />
            <input className="input" placeholder="Search notes or categories" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select" style={{ width: 'auto' }} value={type} onChange={(e) => { setType(e.target.value); setCategory('all') }}>
            <option value="all">All types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <select className="select" style={{ width: 'auto' }} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="all">All methods</option>
            {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <select className="select" style={{ width: 'auto' }} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {catOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-ico"><IconList width={28} height={28} /></div>
            <h3>{inScope.length === 0 ? 'No transactions in this period' : 'No matches'}</h3>
            <p style={{ marginBottom: 16 }}>
              {inScope.length === 0 ? 'Add a transaction or pick another month.' : 'Try clearing the filters above.'}
            </p>
            {inScope.length === 0 && <button className="btn btn-primary" onClick={onAdd}>Add transaction</button>}
          </div>
        ) : (
          <div>
            {groups.map(([date, items]) => {
              const dayTotal = items.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)
              return (
                <div key={date} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '14px 4px 4px', borderBottom: '1px solid var(--border)' }}>
                    <span className="eyebrow">{relativeDay(date)}</span>
                    <span className="num" style={{ fontSize: 12.5, fontWeight: 600, color: dayTotal >= 0 ? 'var(--income)' : 'var(--ink-soft)' }}>
                      {dayTotal >= 0 ? '+' : '−'}{fmtMoney(Math.abs(dayTotal), currency)}
                    </span>
                  </div>
                  <div className="tx-list">
                    {items.map((t) => (
                      <TxRow key={t.id} t={t} currency={currency} onEdit={onEdit} onDelete={onDelete} />
                    ))}
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
