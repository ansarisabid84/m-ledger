import { useEffect, useRef, useState } from 'react'
import { categoriesFor, PAYMENT_METHODS, CURRENCIES } from '../lib/constants'
import { todayISO, currencySymbol } from '../lib/format'
import { fetchRates, toBase, staticRate, RATE_CURRENCIES } from '../lib/rates'
import { IconClose } from './icons'

export default function TransactionForm({ initial, currency, onSave, onClose }) {
  const editing = Boolean(initial)
  const [type, setType] = useState(initial?.type || 'expense')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [fromCurrency, setFromCurrency] = useState(currency)
  const [rates, setRates] = useState(null)
  const [category, setCategory] = useState(initial?.category || 'food')
  const [method, setMethod] = useState(initial?.method || 'upi')
  const [date, setDate] = useState(initial?.date || todayISO())
  const [note, setNote] = useState(initial?.note || '')
  const [error, setError] = useState('')
  const amountRef = useRef(null)

  useEffect(() => {
    fetchRates(currency).then(setRates)
  }, [currency])

  // Keep fromCurrency in sync if base currency changes externally
  useEffect(() => { setFromCurrency(currency) }, [currency])

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

  const rawVal = parseFloat(amount)
  const needsConversion = fromCurrency !== currency && !isNaN(rawVal) && rawVal > 0
  const convertedVal = needsConversion ? toBase(rawVal, fromCurrency, currency, rates) : rawVal
  const displayRate = needsConversion ? (rates ? (1 / (rates[fromCurrency] || 1)) : staticRate(fromCurrency, currency)) : null

  function submit() {
    const val = parseFloat(amount)
    if (!val || val <= 0) {
      setError('Enter an amount greater than zero.')
      amountRef.current?.focus()
      return
    }
    const finalAmount = needsConversion ? toBase(val, fromCurrency, currency, rates) : val
    onSave({ type, amount: Math.round(finalAmount * 100) / 100, category, method, date, note })
  }

  const supportedCurrencies = CURRENCIES.filter((c) => RATE_CURRENCIES.includes(c.code))

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
            <button role="tab" className={type === 'expense' ? 'active expense' : ''} style={{ flex: 1 }} onClick={() => setType('expense')}>Expense</button>
            <button role="tab" className={type === 'income' ? 'active income' : ''} style={{ flex: 1 }} onClick={() => setType('income')}>Income</button>
          </div>
        </div>

        <div className="field" style={{ marginBottom: needsConversion ? 8 : 16 }}>
          <label className="label">Amount</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            <div className="amount-wrap" style={{ flex: 1 }}>
              <span className="amount-cur">{currencySymbol(fromCurrency)}</span>
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
            <select
              className="select"
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              style={{ width: 'auto', flexShrink: 0, fontSize: 14, fontWeight: 600 }}
            >
              {supportedCurrencies.map((c) => (
                <option key={c.code} value={c.code}>{c.code}</option>
              ))}
            </select>
          </div>
          {needsConversion && (
            <div className="convert-preview">
              <span>≈ {currencySymbol(currency)}{Math.round(convertedVal).toLocaleString()} {currency}</span>
              {displayRate && (
                <span className="convert-rate">1 {fromCurrency} = {displayRate.toFixed(3)} {currency}</span>
              )}
            </div>
          )}
          {error && <span style={{ color: 'var(--expense)', fontSize: 13 }}>{error}</span>}
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label className="label">Category</label>
          <div className="chips">
            {categoriesFor(type).map((c) => (
              <button key={c.id} className={'chip' + (category === c.id ? ' active' : '')} onClick={() => setCategory(c.id)} type="button">
                <span>{c.icon}</span> {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label className="label">Payment method</label>
          <div className="chips">
            {PAYMENT_METHODS.map((m) => (
              <button key={m.id} className={'chip' + (method === m.id ? ' active' : '')} onClick={() => setMethod(m.id)} type="button">
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
