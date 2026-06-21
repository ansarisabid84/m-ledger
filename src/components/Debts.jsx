import { useMemo, useState } from 'react'
import { fmtMoney, fmtDate, todayISO } from '../lib/format'
import { IconCheck, IconUndo, IconEdit, IconTrash, IconUsers } from './icons'

function DebtCard({ d, currency, onToggle, onEdit, onDelete }) {
  const isLent = d.kind === 'lent'
  const settled = d.status === 'settled'
  const overdue = !settled && d.dueDate && d.dueDate < todayISO()
  const tone = isLent ? 'var(--income)' : 'var(--expense)'

  return (
    <div className="debt" style={{ opacity: settled ? 0.62 : 1 }}>
      <div className="debt-avatar" style={{ background: isLent ? 'var(--income-tint)' : 'var(--expense-tint)', color: tone }}>
        {(d.person || '?').slice(0, 1).toUpperCase()}
      </div>
      <div className="debt-main">
        <div className="debt-name">
          {d.person || 'Unknown'}
          {settled && <span className="debt-tag settled">Settled</span>}
          {overdue && <span className="debt-tag overdue">Overdue</span>}
        </div>
        <div className="debt-sub">
          {isLent ? 'Owes you' : 'You owe'}
          {d.note ? ` · ${d.note}` : ''}
          {d.dueDate && !settled ? ` · due ${fmtDate(d.dueDate)}` : ''}
          {settled && d.settledDate ? ` · on ${fmtDate(d.settledDate)}` : ''}
        </div>
      </div>
      <div className="debt-right">
        <div className="debt-amt num" style={{ color: settled ? 'var(--ink-faint)' : tone }}>
          {fmtMoney(d.amount, currency)}
        </div>
        <div className="debt-actions">
          <button className="btn btn-sm" onClick={() => onToggle(d.id)} title={settled ? 'Reopen' : isLent ? 'Mark received' : 'Mark paid'}>
            {settled ? <><IconUndo /> Reopen</> : <><IconCheck /> {isLent ? 'Received' : 'Mark paid'}</>}
          </button>
          <button className="tx-act" onClick={() => onEdit(d)} aria-label="Edit"><IconEdit /></button>
          <button className="tx-act" onClick={() => onDelete(d)} aria-label="Delete"><IconTrash /></button>
        </div>
      </div>
    </div>
  )
}

export default function Debts({ debts, currency, onAdd, onToggle, onEdit, onDelete }) {
  const [filter, setFilter] = useState('open') // open | borrowed | lent | settled

  const totals = useMemo(() => {
    const open = debts.filter((d) => d.status === 'open')
    return {
      iOwe: open.filter((d) => d.kind === 'borrowed').reduce((s, d) => s + d.amount, 0),
      owedToMe: open.filter((d) => d.kind === 'lent').reduce((s, d) => s + d.amount, 0),
    }
  }, [debts])
  const net = totals.owedToMe - totals.iOwe

  const shown = useMemo(() => {
    if (filter === 'open') return debts.filter((d) => d.status === 'open')
    if (filter === 'settled') return debts.filter((d) => d.status === 'settled')
    return debts.filter((d) => d.kind === filter)
  }, [debts, filter])

  const FILTERS = [
    ['open', 'Open'],
    ['lent', 'Lent'],
    ['borrowed', 'Borrowed'],
    ['settled', 'Settled'],
  ]

  return (
    <div className="section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="eyebrow">Separate from monthly totals</div>
          <h2 className="page-title">Borrowed &amp; Lent</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onAdd}>Add record</button>
      </div>

      {/* Summary */}
      <div className="hero">
        <div className="hero-label">Net position</div>
        <div className="hero-balance" style={{ color: net >= 0 ? 'var(--income)' : 'var(--expense)' }}>
          {net < 0 ? '−' : ''}{fmtMoney(Math.abs(net), currency)}
        </div>
        <div className="hero-meta">{net >= 0 ? 'In your favour' : 'You owe more than you’re owed'}</div>
        <div className="flow-legend" style={{ marginTop: 16 }}>
          <span><span className="dot" style={{ background: 'var(--income)' }} />Owed to you <b>{fmtMoney(totals.owedToMe, currency)}</b></span>
          <span><span className="dot" style={{ background: 'var(--expense)' }} />You owe <b>{fmtMoney(totals.iOwe, currency)}</b></span>
        </div>
      </div>

      <div className="card card-pad">
        <div className="seg" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
          {FILTERS.map(([id, label]) => (
            <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="empty" style={{ padding: '32px 0' }}>
            <div className="empty-ico"><IconUsers width={28} height={28} /></div>
            <h3>{filter === 'settled' ? 'Nothing settled yet' : 'No records here'}</h3>
            <p style={{ marginBottom: 16 }}>Track money you lend out or borrow, and tick it off when it’s squared up.</p>
            <button className="btn btn-primary" onClick={onAdd}>Add record</button>
          </div>
        ) : (
          <div className="debt-list">
            {shown.map((d) => (
              <DebtCard key={d.id} d={d} currency={currency} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
