import { useEffect, useRef, useState } from 'react'
import { categoriesFor, PAYMENT_METHODS } from '../lib/constants'
import { todayISO, currencySymbol } from '../lib/format'
import { IconClose } from './icons'

export default function TransactionForm({ initial, currency, onSave, onClose }) {
  const editing = Boolean(initial)
  const [type, setType] = useState(initial?.type || 'expense')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [category, setCategory] = useState(initial?.category || 'food')
  const [method, setMethod] = useState(initial?.method || 'upi')
  const [date, setDate] = useState(initial?.date || todayISO())
  const [note, setNote] = useState(initial?.note || '')
  const [error, setError] = useState('')
  const amountRef = useRef(null)

  // keep category valid when switching type
  useEffect(() => {
    const valid = categoriesFor(type).some((c) => c.id === category)
    if (!valid) setCategory(categoriesFor(type)[0].id)
  }, [type]) // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 120)
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey) }
  }, [onClose])

  function submit() {
    const val = parseFloat(amount)
    if (!val || val <= 0) {
      setError('Enter an amount greater than zero.')
      amountRef.current?.focus()
      return
    }
    onSave({ type, amount: val, category, method, date, note })
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={editing ? 'Edit transaction' : 'Add transaction'}>
        <div className="modal-grab" />
        <div className="modal-head">
          <h3 style={{ fontSize: 18 }}>{editing ? 'Edit transaction' : 'Add transaction'}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>

        <div className="field" style={{ marginBottom: 18 }}>
          <div className="seg seg-type" role="tablist" style={{ width: '100%' }}>
            <button
              role="tab"
              className={type === 'expense' ? 'active expense' : ''}
              style={{ flex: 1 }}
              onClick={() => setType('expense')}
            >Expense</button>
            <button
              role="tab"
              className={type === 'income' ? 'active income' : ''}
              style={{ flex: 1 }}
              onClick={() => setType('income')}
            >Income</button>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label className="label">Amount</label>
          <div className="amount-wrap">
            <span className="amount-cur">{currencySymbol(currency)}</span>
            <input
              ref={amountRef}
              className="input amount-input num"
              inputMode="decimal"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              style={{ color: type === 'income' ? 'var(--income)' : 'var(--expense)' }}
            />
          </div>
          {error && <span style={{ color: 'var(--expense)', fontSize: 13 }}>{error}</span>}
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label className="label">Category</label>
          <div className="chips">
            {categoriesFor(type).map((c) => (
              <button
                key={c.id}
                className={'chip' + (category === c.id ? ' active' : '')}
                onClick={() => setCategory(c.id)}
                type="button"
              >
                <span>{c.icon}</span> {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label className="label">Payment method</label>
          <div className="chips">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.id}
                className={'chip' + (method === m.id ? ' active' : '')}
                onClick={() => setMethod(m.id)}
                type="button"
              >
                <span>{m.icon}</span> {m.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
          <div className="field">
            <label className="label">Date</label>
            <input className="input" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Note <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>(optional)</span></label>
            <input className="input" type="text" placeholder="e.g. Lunch" value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} />
          </div>
        </div>

        <button className="btn btn-primary btn-block" onClick={submit}>
          {editing ? 'Save changes' : 'Add transaction'}
        </button>
      </div>
    </div>
  )
}
