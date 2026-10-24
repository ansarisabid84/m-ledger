import { useMemo, useRef, useState } from 'react'
import { fmtMoney, maskMoney, AMOUNT_MASK, fmtDate, todayISO } from '../lib/format'
import { IconCheck, IconUndo, IconEdit, IconTrash, IconUsers, IconClose } from './icons'

export const debtPaid = (d) => (d.repayments || []).reduce((s, r) => s + r.amount, 0)
export const debtRemaining = (d) => Math.max(0, d.amount - debtPaid(d))

function PayModal({ debt, currency, onPay, onClose }) {
  const remaining = debtRemaining(debt)
  const [val, setVal] = useState('')
  const [err, setErr] = useState('')
  function submit(v) {
    const n = Math.round(Number(v) * 100) / 100
    if (!n || n <= 0) { setErr('Enter an amount greater than zero.'); return }
    if (n > remaining + 0.005) { setErr(`That is more than the ${fmtMoney(remaining, currency)} remaining.`); return }
    onPay(debt.id, n)
    onClose()
  }
  const lent = debt.kind === 'lent'
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 380 }}>
        <div className="modal-grab" />
        <div className="modal-head">
          <h3>{lent ? 'Payment received' : 'Payment made'}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>{debt.person} · {fmtMoney(remaining, currency)} remaining of {fmtMoney(debt.amount, currency)}</p>
        <div className="field" style={{ marginBottom: 12 }}>
          <input className="input num" autoFocus type="number" inputMode="decimal" min="0" step="0.01" placeholder="Amount" value={val}
            onChange={(e) => { setVal(e.target.value); setErr('') }} onKeyDown={(e) => e.key === 'Enter' && submit(val)} style={{ fontSize: 20, fontWeight: 700 }} />
          {err && <span style={{ color: 'var(--expense)', fontSize: 12 }}>{err}</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button className="btn" onClick={() => submit(remaining)}>Full amount</button>
          <button className="btn btn-primary" onClick={() => submit(val)}>Record</button>
        </div>
      </div>
    </div>
  )
}

function DebtCard({ d, currency, onToggle, onEdit, onDelete, onPay, hideAmounts }) {
  const paid = debtPaid(d)
  const remaining = debtRemaining(d)
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
        {paid > 0 && !settled && (
          <div style={{ marginTop: 6 }}>
            <div className="budget-bar-track" style={{ height: 6 }}>
              <div className="budget-bar-fill" style={{ width: `${Math.min(100, (paid / d.amount) * 100)}%`, background: tone }} />
            </div>
            <div className="debt-sub" style={{ marginTop: 3 }}>{maskMoney(paid, currency, hideAmounts)} {isLent ? 'received' : 'paid'} of {maskMoney(d.amount, currency, hideAmounts)}</div>
          </div>
        )}
      </div>
      <div className="debt-right">
        <div className="debt-amt num" style={{ color: settled ? 'var(--ink-faint)' : tone }}>
          {maskMoney(settled ? d.amount : remaining, currency, hideAmounts)}
        </div>
        <div className="debt-actions">
          {!settled && <button className="btn btn-sm" onClick={() => onPay(d)}>+ Payment</button>}
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

export default function Debts({ debts, currency, onAdd, onToggle, onEdit, onDelete, onRepay, hideAmounts }) {
  const [filter, setFilter] = useState('open') // open | borrowed | lent | settled
  const [paying, setPaying] = useState(null)

  const totals = useMemo(() => {
    const open = debts.filter((d) => d.status === 'open')
    return {
      iOwe: open.filter((d) => d.kind === 'borrowed').reduce((s, d) => s + debtRemaining(d), 0),
      owedToMe: open.filter((d) => d.kind === 'lent').reduce((s, d) => s + debtRemaining(d), 0),
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
          <h2 className="page-title" style={{ fontSize: 20 }}>Borrowed &amp; Lent</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onAdd}>Add record</button>
      </div>

      {/* Summary */}
      <div className="hero">
        <div className="hero-label">Net position</div>
        <div className="hero-balance" style={{ color: net >= 0 ? 'var(--income)' : 'var(--expense)' }}>
          {hideAmounts ? AMOUNT_MASK : (net < 0 ? '−' : '') + fmtMoney(Math.abs(net), currency)}
        </div>
        <div className="hero-meta">{net >= 0 ? 'In your favour' : "You owe more than you're owed"}</div>
        <div className="flow-legend" style={{ marginTop: 16 }}>
          <span><span className="dot" style={{ background: 'var(--income)' }} />Owed to you <b>{maskMoney(totals.owedToMe, currency, hideAmounts)}</b></span>
          <span><span className="dot" style={{ background: 'var(--expense)' }} />You owe <b>{maskMoney(totals.iOwe, currency, hideAmounts)}</b></span>
        </div>
      </div>

      <div className="card card-pad">
        <div className="debt-tabs" style={{ marginBottom: 14 }}>
          {FILTERS.map(([id, label]) => (
            <button key={id} className={'debt-tab' + (filter === id ? ' active' : '')} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="empty" style={{ padding: '32px 0' }}>
            <div className="empty-ico"><IconUsers width={28} height={28} /></div>
            <h3>{filter === 'settled' ? 'Nothing settled yet' : 'No records here'}</h3>
            <p style={{ marginBottom: 16 }}>Track money you lend out or borrow, and tick it off when it's squared up.</p>
            <button className="btn btn-primary" onClick={onAdd}>Add record</button>
          </div>
        ) : (
          <div className="debt-list">
            {shown.map((d) => (
              <DebtCard key={d.id} d={d} currency={currency} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onPay={setPaying} hideAmounts={hideAmounts} />
            ))}
          </div>
        )}
      </div>
      {paying && <PayModal debt={debts.find((x) => x.id === paying.id) || paying} currency={currency} onPay={onRepay} onClose={() => setPaying(null)} />}
    </div>
  )
}
