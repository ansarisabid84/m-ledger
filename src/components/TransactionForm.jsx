import { useEffect, useMemo, useRef, useState } from 'react'
import { categoriesFor, PAYMENT_METHODS, CURRENCIES, CATEGORY_MAP } from '../lib/constants'
import { todayISO, currencySymbol } from '../lib/format'
import { fetchRates, toBase, staticRate, RATE_CURRENCIES } from '../lib/rates'
import { nextDueDate } from '../lib/recurring'
import { IconClose, IconRepeat } from './icons'

const FREQUENCIES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
]

export default function TransactionForm({ initial, currency, onSave, onClose, trackIncome = true, history = [] }) {
  const editing = Boolean(initial?.id) // prefilled (e.g. from SMS) forms have no id and are new entries
  const [type, setType] = useState(trackIncome ? (initial?.type || 'expense') : (initial?.type === 'income' && initial?.id ? 'income' : 'expense'))
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [fromCurrency, setFromCurrency] = useState(currency)
  const [rates, setRates] = useState(null)
  const [category, setCategory] = useState(initial?.category || 'food')
  const [method, setMethod] = useState(initial?.method || 'upi')
  const [date, setDate] = useState(initial?.date || todayISO())
  const [note, setNote] = useState(initial?.note || '')
  const [error, setError] = useState('')
  const [recurringEnabled, setRecurringEnabled] = useState(initial?.recurring?.enabled || false)
  const [frequency, setFrequency] = useState(initial?.recurring?.frequency || 'monthly')
  const amountRef = useRef(null)

  // Most frequent recent expenses -> one-tap "quick add" chips
  const suggestions = useMemo(() => {
    if (editing) return []
    const map = new Map()
    for (const t of history.slice(0, 300)) {
      if (t.type !== 'expense' || t._fromRecurring) continue
      const key = `${t.category}|${t.method}|${t.amount}|${(t.note || '').toLowerCase()}`
      const e = map.get(key)
      if (e) e.n++
      else map.set(key, { n: 1, t })
    }
    return [...map.values()].filter((e) => e.n >= 2).sort((a, b) => b.n - a.n).slice(0, 5).map((e) => e.t)
  }, [history, editing])

  function applySuggestion(t) {
    setType('expense')
    setAmount(String(t.amount))
    setCategory(t.category)
    setMethod(t.method)
    setNote(t.note || '')
    setError('')
  }

  useEffect(() => {
    fetchRates(currency).then(setRates)
  }, [currency])

  useEffect(() => { setFromCurrency(currency) }, [currency])

  useEffect(() => {
    const valid = categoriesFor(type).some((c) => c.id === category)
    if (!valid) setCategory(categoriesFor(type)[0].id)
  }, [type]) // eslint-disable-line

  // onClose is a new function every parent render — keep it in a ref so this effect
  // runs once (otherwise the amount field steals focus back whenever the app re-renders).
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 120)
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current()
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey) }
  }, [])

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
    const recurringData = recurringEnabled
      ? { enabled: true, frequency, nextDate: nextDueDate(frequency, date) }
      : null
    onSave({ type, amount: Math.round(finalAmount * 100) / 100, category, method, date, note, recurring: recurringData })
  }

  const supportedCurrencies = CURRENCIES.filter((c) => RATE_CURRENCIES.includes(c.code))

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={editing ? 'Edit transaction' : 'Add transaction'}>
        <div className="modal-grab" />
        <div className="modal-head">
          <h3 style={{ fontSize: 16 }}>{editing ? 'Edit transaction' : trackIncome ? 'Add transaction' : 'Add expense'}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>

        {(trackIncome || type === 'income') && (
          <div className="field" style={{ marginBottom: 14 }}>
            <div className="seg seg-type" role="tablist" style={{ width: '100%' }}>
              <button role="tab" className={type === 'expense' ? 'active expense' : ''} style={{ flex: 1 }} onClick={() => setType('expense')}>Expense</button>
              <button role="tab" className={type === 'income' ? 'active income' : ''} style={{ flex: 1 }} onClick={() => setType('income')}>Income</button>
            </div>
          </div>
        )}

        {suggestions.length > 0 && !amount && (
          <div className="field" style={{ marginBottom: 12 }}>
            <label className="label">Quick add</label>
            <div className="chips">
              {suggestions.map((t) => (
                <button key={t.id} type="button" className="chip" onClick={() => applySuggestion(t)}>
                  <span>{CATEGORY_MAP[t.category]?.icon || '•'}</span> {t.note || CATEGORY_MAP[t.category]?.label} · {t.amount}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field" style={{ marginBottom: needsConversion ? 6 : 13 }}>
          <label className="label">Amount</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
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
              style={{ width: 'auto', flexShrink: 0, fontSize: 12, fontWeight: 600 }}
            >
              {supportedCurrencies.map((c) => (
                <option key={c.code} value={c.code}>{c.code}</option>
              ))}
            </select>
          </div>
          {needsConversion && (
            <div className="convert-preview">
              <span>≈ {currencySymbol(currency)}{Math.round(convertedVal).toLocaleString()} {currency}</span>
              {displayRate && <span className="convert-rate">1 {fromCurrency} = {displayRate.toFixed(3)} {currency}</span>}
            </div>
          )}
          {error && <span style={{ color: 'var(--expense)', fontSize: 11 }}>{error}</span>}
        </div>

        <div className="field" style={{ marginBottom: 13 }}>
          <label className="label">Category</label>
          <div className="chips">
            {categoriesFor(type).map((c) => (
              <button key={c.id} className={'chip' + (category === c.id ? ' active' : '')} onClick={() => setCategory(c.id)} type="button">
                <span>{c.icon}</span> {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field" style={{ marginBottom: 13 }}>
          <label className="label">Payment method</label>
          <div className="chips">
            {PAYMENT_METHODS.map((m) => (
              <button key={m.id} className={'chip' + (method === m.id ? ' active' : '')} onClick={() => setMethod(m.id)} type="button">
                <span>{m.icon}</span> {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field" style={{ marginBottom: 10 }}>
          <label className="label">Date</label>
          <input
            className="input"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            style={{ fontSize: 16 }}
          />
        </div>

        <div className="field" style={{ marginBottom: 13 }}>
          <label className="label">Note <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>(optional)</span></label>
          <input
            className="input"
            type="text"
            placeholder="e.g. Lunch with team"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={80}
            style={{ fontSize: 16 }}
            onBlur={() => {
              // iOS: reset viewport after keyboard dismisses to prevent stuck-zoomed layout
              if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                setTimeout(() => window.scrollTo(0, 0), 50)
              }
            }}
          />
        </div>

        {/* Recurring */}
        <div className="field" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 11px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <IconRepeat width={14} height={14} style={{ color: 'var(--ink-soft)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>Recurring transaction</span>
            </div>
            <button
              className={'switch' + (recurringEnabled ? ' on' : '')}
              role="switch"
              aria-checked={recurringEnabled}
              onClick={() => setRecurringEnabled((v) => !v)}
            >
              <span className="switch-knob" />
            </button>
          </div>
          {recurringEnabled && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {FREQUENCIES.map((f) => (
                <button
                  key={f.id}
                  className={'chip' + (frequency === f.id ? ' active' : '')}
                  onClick={() => setFrequency(f.id)}
                  type="button"
                  style={{ fontSize: 11 }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
          {recurringEnabled && (
            <p style={{ margin: '5px 0 0', fontSize: 10.5, color: 'var(--ink-faint)' }}>
              Next entry will auto-appear on {nextDueDate(frequency, date)}.
            </p>
          )}
        </div>

        <button className="btn btn-primary btn-block" onClick={submit}>
          {editing ? 'Save changes' : trackIncome ? 'Add transaction' : 'Add expense'}
        </button>
      </div>
    </div>
  )
}
