import { useEffect, useRef, useState } from 'react'
import { CURRENCIES, EXPENSE_CATEGORIES } from '../lib/constants'
import { exportTransactionsJSON, exportCSV, exportDebtsCSV, exportBackup, parseImport } from '../lib/storage'
import { filterByMonth } from '../lib/stats'
import { monthLabel, currencySymbol } from '../lib/format'
import { staticRate } from '../lib/rates'
import { notifSupported, getPermission, requestPermission, sendTestNotification, isNative } from '../lib/notify'
import { IconDownload, IconUpload, IconTrash, IconBell, IconPlus, IconClose } from './icons'

function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function Toggle({ checked, onChange, label }) {
  return (
    <button className={'switch' + (checked ? ' on' : '')} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}>
      <span className="switch-knob" />
    </button>
  )
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

export default function Settings({
  settings, updateSettings, transactions, debts, settlements, months,
  replaceAll, replaceDebts, replaceSettlements, clearAll, notify,
}) {
  const fileRef = useRef(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [scope, setScope] = useState('all')
  const [perm, setPerm] = useState('default')
  const [prevCurrency, setPrevCurrency] = useState(settings.currency)
  const [showReconvert, setShowReconvert] = useState(false)
  const [newReminderLabel, setNewReminderLabel] = useState('')
  const [showCatBudgets, setShowCatBudgets] = useState(false)

  useEffect(() => {
    getPermission().then(setPerm)
  }, [])

  const stamp = new Date().toISOString().slice(0, 10)
  const reminders = settings.reminders

  const scopedTx = scope === 'all' ? transactions : filterByMonth(transactions, scope)
  const scopeName = scope === 'all' ? 'all' : scope

  function handleCurrencyChange(code) {
    if (code !== settings.currency) {
      updateSettings({ currency: code })
      setPrevCurrency(settings.currency)
      setShowReconvert(true)
    }
  }

  function handleReconvert() {
    const rate = staticRate(prevCurrency, settings.currency)
    const round = (v) => Math.round(v * 100) / 100
    replaceAll(transactions.map((t) => ({ ...t, amount: round(t.amount * rate) })))
    replaceDebts(debts.map((d) => ({ ...d, amount: round(d.amount * rate) })))
    replaceSettlements(settlements.map((s) => ({
      ...s,
      openingBalance: round(s.openingBalance * rate),
      income: round(s.income * rate),
      expense: round(s.expense * rate),
      carryForward: round(s.carryForward * rate),
    })))
    notify(`Amounts converted from ${prevCurrency} → ${settings.currency} (approx. rate)`)
    setShowReconvert(false)
  }

  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = parseImport(String(reader.result))
        replaceAll(parsed.transactions)
        if (parsed.debts) replaceDebts(parsed.debts)
        if (parsed.settlements) replaceSettlements(parsed.settlements)
        const extra = [parsed.debts && 'debts', parsed.settlements && 'settlements'].filter(Boolean)
        notify(`Imported ${parsed.transactions.length} transactions${extra.length ? ' + ' + extra.join(' & ') : ''}`)
      } catch {
        notify('Import failed — invalid file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function askPermission() {
    const result = await requestPermission()
    setPerm(result)
    if (result === 'granted') {
      notify('Notifications enabled')
      sendTestNotification()
    } else if (result === 'denied') {
      notify('Blocked — enable notifications in system settings')
    }
  }

  function setReminder(key, patch) {
    updateSettings({ reminders: { ...reminders, [key]: { ...reminders[key], ...patch } } })
  }

  function addCustomReminder() {
    const label = newReminderLabel.trim()
    if (!label) return
    const custom = [...(reminders.custom || []), { id: uid(), label, time: '09:00', enabled: true }]
    updateSettings({ reminders: { ...reminders, custom } })
    setNewReminderLabel('')
  }

  function updateCustomReminder(id, patch) {
    const custom = (reminders.custom || []).map((r) => r.id === id ? { ...r, ...patch } : r)
    updateSettings({ reminders: { ...reminders, custom } })
  }

  function removeCustomReminder(id) {
    const custom = (reminders.custom || []).filter((r) => r.id !== id)
    updateSettings({ reminders: { ...reminders, custom } })
  }

  function setCategoryBudget(catId, val) {
    const v = parseFloat(val)
    const next = { ...settings.categoryBudgets }
    if (!v || v <= 0) delete next[catId]
    else next[catId] = v
    updateSettings({ categoryBudgets: next })
  }

  const convertRate = showReconvert ? staticRate(prevCurrency, settings.currency) : null

  return (
    <div className="section">
      <div>
        <div className="eyebrow">Preferences</div>
        <h2 className="page-title">Settings</h2>
      </div>

      {/* Currency */}
      <div className="card card-pad">
        <div className="card-head"><span className="card-title">Currency</span></div>
        <div className="chips">
          {CURRENCIES.map((c) => (
            <button key={c.code} className={'chip' + (settings.currency === c.code ? ' active' : '')} onClick={() => handleCurrencyChange(c.code)}>
              <span style={{ fontWeight: 700 }}>{c.symbol}</span> {c.code}
            </button>
          ))}
        </div>
        {showReconvert && (
          <div className="reconvert-box">
            <p style={{ margin: '0 0 6px', fontSize: 12 }}>
              Currency changed to <strong>{settings.currency}</strong>. Reconvert all stored amounts?
            </p>
            <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--ink-faint)' }}>
              Rate: 1 {prevCurrency} ≈ {convertRate?.toFixed(4)} {settings.currency} (approximate)
            </p>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={handleReconvert}>Convert amounts</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowReconvert(false)}>Keep as-is</button>
            </div>
          </div>
        )}
      </div>

      {/* Monthly budget */}
      <div className="card card-pad">
        <div className="card-head"><span className="card-title">Monthly expense budget</span></div>
        <p className="muted" style={{ marginTop: 0, fontSize: 11.5 }}>Track total spending against a monthly target on the Dashboard. Set to 0 to disable.</p>
        <div className="amount-wrap" style={{ maxWidth: 220 }}>
          <span className="amount-cur" style={{ fontSize: 16 }}>{currencySymbol(settings.currency)}</span>
          <input
            className="input amount-input"
            type="number"
            min="0"
            placeholder="0"
            value={settings.monthlyBudget || ''}
            onChange={(e) => updateSettings({ monthlyBudget: Math.max(0, Number(e.target.value)) })}
            style={{ fontSize: 20, paddingLeft: 34 }}
          />
        </div>
      </div>

      {/* Category budgets */}
      <div className="card card-pad">
        <div className="card-head">
          <span className="card-title">Category budgets</span>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }} onClick={() => setShowCatBudgets((v) => !v)}>
            {showCatBudgets ? 'Hide' : 'Set limits'}
          </button>
        </div>
        <p className="muted" style={{ marginTop: 0, fontSize: 11.5 }}>
          Set per-category monthly spending limits. Alerts show on the Dashboard when you hit 80% or more.
        </p>
        {showCatBudgets && (
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {EXPENSE_CATEGORIES.map((cat) => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ fontSize: 16, width: 22, flexShrink: 0 }}>{cat.icon}</span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{cat.label}</span>
                <div style={{ position: 'relative', width: 130 }}>
                  <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--ink-faint)', fontWeight: 600 }}>
                    {currencySymbol(settings.currency)}
                  </span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    placeholder="No limit"
                    value={settings.categoryBudgets?.[cat.id] || ''}
                    onChange={(e) => setCategoryBudget(cat.id, e.target.value)}
                    style={{ paddingLeft: 20, fontSize: 12 }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto carry-forward */}
      <div className="card card-pad">
        <div className="card-head"><span className="card-title">Auto carry-forward</span></div>
        <div className="reminder-row" style={{ borderBottom: 'none', padding: 0 }}>
          <div>
            <div className="reminder-name">Auto-settle past months</div>
            <div className="reminder-sub">Automatically carry closing balance forward for unsettled past months.</div>
          </div>
          <Toggle
            checked={!!settings.autoCarryForward}
            onChange={(v) => updateSettings({ autoCarryForward: v })}
            label="Auto carry-forward"
          />
        </div>
      </div>

      {/* SMS / Notification detection */}
      <div className="card card-pad">
        <div className="card-head">
          <span className="card-title">SMS transaction detection</span>
          <Toggle
            checked={!!settings.smsDetection}
            onChange={(v) => updateSettings({ smsDetection: v })}
            label="SMS detection"
          />
        </div>
        <p className="muted" style={{ marginTop: 0, fontSize: 11.5 }}>
          When enabled, a bank-SMS parser runs on text you paste into the <strong>SMS Inbox</strong> button (bottom-right of screen).
          Detected transactions queue for your approval — nothing is added automatically.
        </p>
        {isNative() && (
          <p style={{ marginTop: 6, fontSize: 11, color: 'var(--brand-strong)', fontWeight: 600 }}>
            📱 On this device, Ledger can also read incoming bank SMS notifications automatically (requires SMS permission in system settings).
          </p>
        )}
      </div>

      {/* Reminders */}
      <div className="card card-pad">
        <div className="card-head"><span className="card-title">Reminders</span></div>
        {!notifSupported() ? (
          <p className="muted" style={{ marginTop: 0, fontSize: 11.5 }}>This browser doesn't support notifications.</p>
        ) : perm !== 'granted' ? (
          <div>
            <p className="muted" style={{ marginTop: 0, fontSize: 11.5 }}>
              Allow notifications to get nudges to log spending and chase pending settlements.
            </p>
            <button className="btn btn-primary btn-sm" onClick={askPermission} disabled={perm === 'denied'}>
              <IconBell /> {perm === 'denied' ? 'Blocked in browser' : 'Enable notifications'}
            </button>
          </div>
        ) : (
          <div className="reminder-list">
            {/* Fixed reminders */}
            <div className="reminder-row">
              <div>
                <div className="reminder-name">Daily log reminder</div>
                <div className="reminder-sub">Fires if no transactions recorded today</div>
              </div>
              <div className="reminder-ctl">
                <input className="input time" type="time" value={reminders.dailyLog.time}
                  onChange={(e) => setReminder('dailyLog', { time: e.target.value })} disabled={!reminders.dailyLog.enabled} />
                <Toggle checked={reminders.dailyLog.enabled} onChange={(v) => setReminder('dailyLog', { enabled: v })} label="Daily log reminder" />
              </div>
            </div>
            <div className="reminder-row">
              <div>
                <div className="reminder-name">Pending settlements</div>
                <div className="reminder-sub">Borrowed &amp; lent amounts still open</div>
              </div>
              <div className="reminder-ctl">
                <input className="input time" type="time" value={reminders.debts.time}
                  onChange={(e) => setReminder('debts', { time: e.target.value })} disabled={!reminders.debts.enabled} />
                <Toggle checked={reminders.debts.enabled} onChange={(v) => setReminder('debts', { enabled: v })} label="Debt reminder" />
              </div>
            </div>

            {/* Custom reminders */}
            {(reminders.custom || []).map((r) => (
              <div className="reminder-row" key={r.id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    className="input"
                    value={r.label}
                    onChange={(e) => updateCustomReminder(r.id, { label: e.target.value })}
                    style={{ fontSize: 12, padding: '5px 8px', marginBottom: 2 }}
                    placeholder="Reminder label"
                    maxLength={50}
                  />
                  <div className="reminder-sub">Custom reminder</div>
                </div>
                <div className="reminder-ctl" style={{ gap: 6 }}>
                  <input className="input time" type="time" value={r.time}
                    onChange={(e) => updateCustomReminder(r.id, { time: e.target.value })} disabled={!r.enabled} />
                  <Toggle checked={r.enabled} onChange={(v) => updateCustomReminder(r.id, { enabled: v })} label={r.label} />
                  <button className="tx-act" onClick={() => removeCustomReminder(r.id)} aria-label="Delete reminder">
                    <IconClose width={13} height={13} />
                  </button>
                </div>
              </div>
            ))}

            {/* Add custom reminder */}
            <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
              <input
                className="input"
                placeholder="New reminder label…"
                value={newReminderLabel}
                onChange={(e) => setNewReminderLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomReminder()}
                style={{ fontSize: 12 }}
                maxLength={50}
              />
              <button className="btn btn-sm" onClick={addCustomReminder} disabled={!newReminderLabel.trim()}>
                <IconPlus width={12} height={12} /> Add
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-sm" onClick={() => sendTestNotification()}>Send a test</button>
            </div>
            <p className="muted" style={{ fontSize: 11, margin: '10px 0 0' }}>
              {isNative()
                ? 'Reminders fire even when the app is closed.'
                : 'On web, reminders fire while the app is open or in background. Install the mobile app for always-on reminders.'}
            </p>
          </div>
        )}
      </div>

      {/* Export / data */}
      <div className="card card-pad">
        <div className="card-head"><span className="card-title">Export</span></div>
        <p className="muted" style={{ marginTop: 0, fontSize: 11.5 }}>Export transactions for all time or a single month.</p>
        <div className="field" style={{ maxWidth: 240, marginBottom: 10 }}>
          <label className="label">Scope</label>
          <select className="select" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">All time</option>
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => download(`ledger-${scopeName}-${stamp}.json`, exportTransactionsJSON(scopedTx, scopeName), 'application/json')}>
            <IconDownload /> JSON
          </button>
          <button className="btn" onClick={() => download(`ledger-${scopeName}-${stamp}.csv`, exportCSV(scopedTx), 'text/csv')}>
            <IconDownload /> CSV
          </button>
          <button className="btn" onClick={() => download(`ledger-debts-${stamp}.csv`, exportDebtsCSV(debts), 'text/csv')}>
            <IconDownload /> Debts CSV
          </button>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />

        <div className="card-head"><span className="card-title">Backup &amp; restore</span></div>
        <p className="muted" style={{ marginTop: 0, fontSize: 11.5 }}>
          Full backup includes transactions, debts, settlements and settings — restore on any device.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => download(`ledger-backup-${stamp}.json`, exportBackup({ transactions, debts, settlements, settings }), 'application/json')}>
            <IconDownload /> Full backup
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <IconUpload /> Import / restore
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />

        {!confirmClear ? (
          <button className="btn btn-danger" onClick={() => setConfirmClear(true)}><IconTrash /> Clear all data</button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Delete all transactions, debts &amp; settlements?</span>
            <button className="btn btn-danger" onClick={() => { clearAll(); setConfirmClear(false); notify('All data cleared') }}>Yes, delete</button>
            <button className="btn btn-ghost" onClick={() => setConfirmClear(false)}>Cancel</button>
          </div>
        )}
      </div>

      <div className="card card-pad">
        <div className="card-head">
          <span className="card-title">About Ledger</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: '999px', background: 'var(--brand-tint)', color: 'var(--brand-strong)' }}>v{__APP_VERSION__}</span>
        </div>

        <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.6, color: 'var(--ink)' }}>
          <strong>Ledger</strong> is a personal finance tracker — track income, expenses, borrowed &amp; lent money, savings goals, and monthly balance.
        </p>

        <div className="about-features">
          {[
            ['✈️', 'Fully offline', 'All data on-device. No internet, no account, no cloud.'],
            ['💱', 'Multi-currency', 'Log in any currency, auto-convert to your base.'],
            ['📊', 'Dashboard & insights', 'Spending breakdown, trends, and smart insights.'],
            ['🔁', 'Recurring transactions', 'Auto-add daily, weekly, or monthly repeating entries.'],
            ['🎯', 'Savings goals', 'Track progress toward financial targets.'],
            ['📲', 'SMS detection', 'Paste a bank SMS to auto-detect transactions.'],
            ['🔔', 'Reminders', 'Daily log nudges, debt follow-ups, and custom alerts.'],
            ['💾', 'Backup & restore', 'Export full backup as JSON; restore on any device.'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="about-feature-row">
              <span className="about-feature-icon">{icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--ink)' }}>{title}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 1 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />

        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-faint)' }}>
          © {new Date().getFullYear()}{' '}
          <a
            href="https://www.linkedin.com/in/ansarisabid/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}
          >
            Sabid Ansari
          </a>
          . All rights reserved.
        </p>
      </div>
    </div>
  )
}
