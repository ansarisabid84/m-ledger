import { useState } from 'react'
import { fmtMoney, todayISO } from '../lib/format'
import { IconClose, IconEdit, IconTrash, IconTarget, IconPlus, IconCheck } from './icons'

const GOAL_ICONS = ['🎯', '✈️', '🏠', '🚗', '📱', '💍', '📚', '🏋️', '💻', '🎓', '🏖️', '💰', '🛍️', '🎁', '🏥']
const GOAL_COLORS = ['#5b6cf0', '#0e9f6e', '#e0a93b', '#e5594e', '#9b5bd6', '#3fa9d6', '#6fb23f', '#e07b3b']

function GoalForm({ initial, currency, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || '')
  const [targetAmount, setTargetAmount] = useState(initial ? String(initial.targetAmount) : '')
  const [icon, setIcon] = useState(initial?.icon || '🎯')
  const [color, setColor] = useState(initial?.color || '#5b6cf0')
  const [deadline, setDeadline] = useState(initial?.deadline || '')
  const [error, setError] = useState('')

  function submit() {
    if (!name.trim()) { setError('Enter a goal name.'); return }
    const amt = parseFloat(targetAmount)
    if (!amt || amt <= 0) { setError('Enter a valid target amount.'); return }
    onSave({ name, targetAmount: amt, icon, color, deadline: deadline || null })
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-grab" />
        <div className="modal-head">
          <h3 style={{ fontSize: 15 }}>{initial ? 'Edit goal' : 'New savings goal'}</h3>
          <button className="icon-btn" onClick={onClose}><IconClose /></button>
        </div>

        {/* Icon picker */}
        <div className="field" style={{ marginBottom: 12 }}>
          <label className="label">Icon</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {GOAL_ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                style={{
                  width: 36, height: 36, borderRadius: 9, border: '2px solid',
                  borderColor: icon === ic ? color : 'var(--border)',
                  background: icon === ic ? color + '22' : 'var(--surface-2)',
                  fontSize: 18, cursor: 'pointer',
                }}
              >{ic}</button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div className="field" style={{ marginBottom: 12 }}>
          <label className="label">Color</label>
          <div style={{ display: 'flex', gap: 7 }}>
            {GOAL_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 26, height: 26, borderRadius: '50%', background: c, border: '2px solid',
                  borderColor: color === c ? 'var(--ink)' : 'transparent', cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>

        <div className="field" style={{ marginBottom: 10 }}>
          <label className="label">Goal name</label>
          <input className="input" placeholder="e.g. Vacation fund" value={name} onChange={(e) => { setName(e.target.value); setError('') }} maxLength={50} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div className="field">
            <label className="label">Target ({fmtMoney(0, currency).replace(/[\d,.]+/, '').trim()})</label>
            <input className="input" type="number" min="1" step="any" placeholder="50000" value={targetAmount} onChange={(e) => { setTargetAmount(e.target.value); setError('') }} />
          </div>
          <div className="field">
            <label className="label">Deadline <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>(optional)</span></label>
            <input className="input" type="date" min={todayISO()} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>

        {error && <p style={{ color: 'var(--expense)', fontSize: 11, margin: '0 0 8px' }}>{error}</p>}
        <button className="btn btn-primary btn-block" onClick={submit}>{initial ? 'Save changes' : 'Create goal'}</button>
      </div>
    </div>
  )
}

function ContributeModal({ goal, currency, onContribute, onClose }) {
  const [amount, setAmount] = useState('')
  const remaining = goal.targetAmount - goal.savedAmount

  function submit() {
    const val = parseFloat(amount)
    if (!val || val <= 0) return
    onContribute(goal.id, Math.min(val, remaining))
    onClose()
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 380 }}>
        <div className="modal-grab" />
        <div className="modal-head">
          <h3 style={{ fontSize: 15 }}>Add to — {goal.icon} {goal.name}</h3>
          <button className="icon-btn" onClick={onClose}><IconClose /></button>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--ink-soft)' }}>
          Remaining: {fmtMoney(remaining, currency)}
        </p>
        <div className="field" style={{ marginBottom: 14 }}>
          <label className="label">Amount to add</label>
          <input
            className="input"
            type="number"
            min="1"
            step="any"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        <button className="btn btn-primary btn-block" onClick={submit}>
          <IconCheck width={14} height={14} /> Add savings
        </button>
      </div>
    </div>
  )
}

export default function Goals({ goals, currency, onAdd, onUpdate, onContribute, onDelete }) {
  const [form, setForm] = useState({ open: false, editing: null })
  const [contributing, setContributing] = useState(null)

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0)
  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0)

  return (
    <div className="section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div className="eyebrow">Financial targets</div>
          <h2 className="page-title">Savings Goals</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setForm({ open: true, editing: null })}>
          <IconPlus width={13} height={13} /> New goal
        </button>
      </div>

      {goals.length > 0 && (
        <div className="hero">
          <div className="hero-label">Total progress</div>
          <div className="hero-balance" style={{ color: 'var(--brand)' }}>
            {fmtMoney(totalSaved, currency)}
          </div>
          <div className="hero-meta">of {fmtMoney(totalTarget, currency)} across {goals.length} goal{goals.length > 1 ? 's' : ''}</div>
          <div className="flow" style={{ marginTop: 12 }}>
            <div className="flow-in" style={{ width: `${totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0}%` }} />
          </div>
          <div className="flow-legend">
            <span><span className="dot" style={{ background: 'var(--income)' }} />Saved <b>{fmtMoney(totalSaved, currency)}</b></span>
            <span><span className="dot" style={{ background: 'var(--surface-3)' }} />Remaining <b>{fmtMoney(Math.max(0, totalTarget - totalSaved), currency)}</b></span>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="card card-pad">
          <div className="empty" style={{ padding: '28px 10px' }}>
            <div className="empty-ico"><IconTarget /></div>
            <h3>No goals yet</h3>
            <p style={{ marginBottom: 12 }}>Set a savings target and track your progress toward it.</p>
            <button className="btn btn-primary btn-sm" onClick={() => setForm({ open: true, editing: null })}>
              <IconPlus width={13} height={13} /> Create first goal
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {goals.map((g) => {
            const pct = g.targetAmount > 0 ? Math.min((g.savedAmount / g.targetAmount) * 100, 100) : 0
            const done = pct >= 100
            const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline) - new Date()) / 86400000) : null

            return (
              <div key={g.id} className="card card-pad">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                    background: g.color + '22', display: 'grid', placeItems: 'center', fontSize: 20,
                  }}>{g.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{g.name}</span>
                      {done && <span className="debt-tag settled"><IconCheck width={10} height={10} /> Done</span>}
                      {!done && daysLeft !== null && (
                        <span className="debt-tag" style={{
                          background: daysLeft < 0 ? 'var(--expense-tint)' : 'var(--surface-2)',
                          color: daysLeft < 0 ? 'var(--expense)' : 'var(--ink-soft)',
                        }}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                        </span>
                      )}
                    </div>
                    <div style={{ margin: '6px 0 4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-soft)', marginBottom: 4 }}>
                        <span>{fmtMoney(g.savedAmount, currency)} saved</span>
                        <span>{Math.round(pct)}% · {fmtMoney(g.targetAmount, currency)}</span>
                      </div>
                      <div className="budget-bar-track">
                        <div className="budget-bar-fill" style={{ width: `${pct}%`, background: done ? 'var(--income)' : g.color }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                    {!done && (
                      <button className="btn btn-sm" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setContributing(g)}>
                        + Add
                      </button>
                    )}
                    <button className="tx-act" onClick={() => setForm({ open: true, editing: g })}><IconEdit /></button>
                    <button className="tx-act" onClick={() => onDelete(g.id)}><IconTrash /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {form.open && (
        <GoalForm
          initial={form.editing}
          currency={currency}
          onSave={(data) => {
            form.editing ? onUpdate(form.editing.id, data) : onAdd(data)
            setForm({ open: false, editing: null })
          }}
          onClose={() => setForm({ open: false, editing: null })}
        />
      )}
      {contributing && (
        <ContributeModal
          goal={contributing}
          currency={currency}
          onContribute={onContribute}
          onClose={() => setContributing(null)}
        />
      )}
    </div>
  )
}
