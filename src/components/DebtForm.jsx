import { useEffect, useRef, useState } from 'react'
import { todayISO, currencySymbol } from '../lib/format'
import { IconClose } from './icons'

export default function DebtForm({ initial, currency, onSave, onClose }) {
  const editing = Boolean(initial)
  const [kind, setKind] = useState(initial?.kind || 'lent')
  const [person, setPerson] = useState(initial?.person || '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [date, setDate] = useState(initial?.date || todayISO())
  const [dueDate, setDueDate] = useState(initial?.dueDate || '')
  const [note, setNote] = useState(initial?.note || '')
  const [error, setError] = useState('')
  const personRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => personRef.current?.focus(), 120)
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey) }
  }, [onClose])

  function submit() {
    const val = parseFloat(amount)
    if (!person.trim()) { setError('Enter a name.'); personRef.current?.focus(); return }
    if (!val || val <= 0) { setError('Enter an amount greater than zero.'); return }
    onSave({ kind, person, amount: val, date, dueDate: dueDate || null, note })
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={editing ? 'Edit record' : 'Add record'}>
        <div className="modal-grab" />
        <div className="modal-head">
          <h3 style={{ fontSize: 18 }}>{editing ? 'Edit record' : 'Borrowed / Lent'}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <div className="seg seg-type" style={{ width: '100%' }}>
            <button className={kind === 'lent' ? 'active income' : ''} style={{ flex: 1 }} onClick={() => setKind('lent')}>
              I lent (owed to me)
            </button>
            <button className={kind === 'borrowed' ? 'active expense' : ''} style={{ flex: 1 }} onClick={() => setKind('borrowed')}>
              I borrowed (I owe)
            </button>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label className="label">{kind === 'lent' ? 'Who owes you?' : 'Who did you borrow from?'}</label>
          <input ref={personRef} className="input" placeholder="Name" value={person}
            onChange={(e) => { setPerson(e.target.value); setError('') }} maxLength={40} />
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label className="label">Amount</label>
          <div className="amount-wrap">
            <span className="amount-cur">{currencySymbol(currency)}</span>
            <input
              className="input amount-input num"
              inputMode="decimal" type="number" min="0" step="0.01" placeholder="0"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              style={{ color: kind === 'lent' ? 'var(--income)' : 'var(--expense)' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div className="field">
            <label className="label">Date</label>
            <input className="input" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Due date <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>(optional)</span></label>
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div className="field" style={{ marginBottom: 18 }}>
          <label className="label">Note <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>(optional)</span></label>
          <input className="input" placeholder="What was it for?" value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} />
        </div>

        {error && <div style={{ color: 'var(--expense)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <button className="btn btn-primary btn-block" onClick={submit}>
          {editing ? 'Save changes' : 'Add record'}
        </button>
      </div>
    </div>
  )
}
