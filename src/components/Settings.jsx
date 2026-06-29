import { useEffect, useRef, useState } from 'react'
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth'
import PinGateModal from './PinGate'
import { CURRENCIES, EXPENSE_CATEGORIES } from '../lib/constants'
import { COUNTRIES, resolveClock } from '../lib/calendar'
import { exportTransactionsJSON, exportCSV, exportDebtsCSV, exportBackup, parseImport } from '../lib/storage'
import { filterByMonth } from '../lib/stats'
import { monthLabel, currencySymbol } from '../lib/format'
import { staticRate } from '../lib/rates'
import { notifSupported, getPermission, requestPermission, sendTestNotification, isNative } from '../lib/notify'
import { IconDownload, IconUpload, IconTrash, IconBell, IconPlus, IconClose, IconLock } from './icons'

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

function PinSetup({ onDone, onCancel }) {
  const [stage, setStage] = useState('enter') // 'enter' | 'confirm'
  const [input, setInput] = useState('')
  const [first, setFirst] = useState('')
  const [error, setError] = useState('')

  function handleDigit(d) {
    const next = input + d
    if (next.length > 4) return
    setInput(next); setError('')
    if (next.length === 4) {
      if (stage === 'enter') { setFirst(next); setInput(''); setStage('confirm') }
      else if (next === first) { onDone(next) }
      else { setError('PINs do not match — try again.'); setInput(''); setStage('enter'); setFirst('') }
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 10, textAlign: 'center' }}>
        {stage === 'enter' ? 'Enter new PIN (4 digits)' : 'Confirm your PIN'}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: i < input.length ? 'var(--brand)' : 'var(--border)', transition: 'background 0.15s' }} />
        ))}
      </div>
      {error && <div style={{ fontSize: 11, color: 'var(--expense)', textAlign: 'center', marginBottom: 8 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 220, margin: '0 auto' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((k, i) => (
          <button key={i}
            onClick={() => { if (k === '') return; if (k === '⌫') { setInput((v) => v.slice(0, -1)); return }; handleDigit(String(k)) }}
            style={{ height: 44, borderRadius: 10, border: '1px solid var(--border)', background: k === '' ? 'transparent' : 'var(--surface)', fontSize: k === '⌫' ? 16 : 18, fontWeight: 600, cursor: k === '' ? 'default' : 'pointer', color: 'var(--ink)' }}
          >{k}</button>
        ))}
      </div>
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

function AddReminderModal({ onAdd, onClose }) {
  const [label, setLabel] = useState('')
  const [time, setTime] = useState('09:00')
  const overlayRef = useRef(null)

  function submit() {
    if (!label.trim()) return
    onAdd(label, time)
  }

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onMouseDown={(e) => e.target === overlayRef.current && onClose()}
      style={{ zIndex: 300 }}
    >
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 340 }}>
        <div className="modal-grab" />
        <div className="modal-head">
          <h3 style={{ fontSize: 15 }}>New reminder</h3>
          <button className="icon-btn" onClick={onClose}><IconClose /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="label" style={{ marginBottom: 4, display: 'block' }}>Label</label>
            <input
              className="input"
              placeholder="e.g. Check weekly budget"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              maxLength={50}
              autoFocus
            />
          </div>
          <div>
            <label className="label" style={{ marginBottom: 4, display: 'block' }}>Time</label>
            <input className="input time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={!label.trim()}>Add</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Live-ticking Clock & Calendar section — needs its own component to drive the interval
function ClockCalendarSection({ settings, updateSettings }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const resolved = resolveClock(settings)
  const selectedCountry = COUNTRIES.find((c) => c.code === resolved.countryCode) || COUNTRIES[0]

  return (
    <div className="card card-pad">
      <div className="card-head"><span className="card-title">Clock &amp; Calendar</span></div>
      <p className="muted" style={{ marginTop: 0, fontSize: 11.5 }}>
        Choose which country and timezone to show on the Dashboard clock. Countries with multiple timezones let you pick a specific region.
      </p>

      <label className="label" style={{ marginBottom: 6, display: 'block' }}>Country</label>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 20, pointerEvents: 'none', lineHeight: 1 }}>
          {selectedCountry.flag}
        </span>
        <select
          className="select"
          value={resolved.countryCode}
          onChange={(e) => {
            const c = COUNTRIES.find((x) => x.code === e.target.value)
            if (c) updateSettings({ clockCountry: c.code, clockTimezone: c.timezones[0].tz })
          }}
          style={{ paddingLeft: 38, fontSize: 13, fontWeight: 600 }}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </div>

      {selectedCountry.timezones.length > 1 && (
        <>
          <label className="label" style={{ marginBottom: 6, display: 'block' }}>Timezone — {selectedCountry.flag} {selectedCountry.name}</label>
          <div className="chips" style={{ marginBottom: 14 }}>
            {selectedCountry.timezones.map((t) => (
              <button
                key={t.tz}
                className={'chip' + (resolved.tz === t.tz ? ' active' : '')}
                onClick={() => updateSettings({ clockTimezone: t.tz })}
              >
                <span style={{ fontWeight: 700 }}>{t.label}</span>
                <span style={{ fontSize: 10, marginLeft: 3 }}>{t.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <label className="label" style={{ marginBottom: 6, display: 'block' }}>Time format</label>
      <div className="seg" style={{ width: '100%', maxWidth: 200 }}>
        <button className={settings.clockFormat !== '12h' ? 'active' : ''} style={{ flex: 1 }} onClick={() => updateSettings({ clockFormat: '24h' })}>24h</button>
        <button className={settings.clockFormat === '12h' ? 'active' : ''} style={{ flex: 1 }} onClick={() => updateSettings({ clockFormat: '12h' })}>12h</button>
      </div>

      <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 22 }}>{selectedCountry.flag}</span>
        <div>
          <div style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600 }}>Preview · live</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {(() => {
              try {
                return now.toLocaleTimeString('en-US', {
                  timeZone: resolved.tz,
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                  hour12: settings.clockFormat === '12h',
                })
              } catch { return '—' }
            })()}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 1 }}>
            {(() => {
              try {
                return now.toLocaleDateString('en-US', {
                  timeZone: resolved.tz,
                  weekday: 'short', month: 'short', day: 'numeric',
                })
              } catch { return '' }
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

function AppLockSection({ lock, updateSettings, notify }) {
  const [showPinSetup, setShowPinSetup] = useState(false)
  const lockType = lock.lockType || 'device'

  function enable(type) {
    if (type === 'device') {
      updateSettings({ appLock: { ...lock, enabled: true, lockType: 'device' } })
      notify('App lock enabled — uses your device lock')
    } else {
      setShowPinSetup(true)
    }
  }

  function pinDone(pin) {
    updateSettings({ appLock: { enabled: true, lockType: 'pin', pin } })
    setShowPinSetup(false)
    notify('Custom PIN set')
  }

  function switchType(type) {
    if (type === lockType) return
    if (type === 'pin') { setShowPinSetup(true) }
    else { updateSettings({ appLock: { ...lock, lockType: 'device', pin: null } }); notify('Switched to device lock') }
  }

  function disable() {
    updateSettings({ appLock: { enabled: false, lockType: 'device', pin: null } })
    notify('App lock disabled')
  }

  return (
    <div className="card card-pad">
      <div className="card-head">
        <span className="card-title">App Lock</span>
        {lock.enabled && (
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'var(--income-tint)', color: 'var(--income)', fontWeight: 700 }}>Active</span>
        )}
      </div>
      <p className="muted" style={{ marginTop: 0, fontSize: 11.5 }}>
        Lock the app when it goes to background. Re-opens with your device lock or a custom PIN.
      </p>

      {!lock.enabled && !showPinSetup && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {[
              { type: 'device', icon: '📱', title: 'Device lock', desc: 'Use your phone\'s Face ID, fingerprint, or passcode. Recommended.' },
              { type: 'pin', icon: '🔢', title: 'Custom PIN', desc: 'Set your own 4-digit PIN inside the app.' },
            ].map(({ type, icon, title, desc }) => (
              <button
                key={type}
                onClick={() => enable(type)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                  borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{title}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {showPinSetup && (
        <PinSetup onDone={pinDone} onCancel={() => setShowPinSetup(false)} />
      )}

      {lock.enabled && !showPinSetup && (
        <>
          {/* Mode switcher */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 6 }}>Lock method</div>
            <div className="seg" style={{ width: '100%' }}>
              <button className={lockType === 'device' ? 'active' : ''} style={{ flex: 1 }} onClick={() => switchType('device')}>
                📱 Device lock
              </button>
              <button className={lockType === 'pin' ? 'active' : ''} style={{ flex: 1 }} onClick={() => switchType('pin')}>
                🔢 Custom PIN
              </button>
            </div>
          </div>
          {lockType === 'pin' && (
            <>
              <button className="btn btn-sm" style={{ marginBottom: 10 }} onClick={() => setShowPinSetup(true)}>Change PIN</button>

              {/* PIN hint toggle */}
              <div style={{ marginBottom: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: lock.pinHintEnabled ? 8 : 0 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>PIN hint</div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 1 }}>Show a hint on the lock screen if you forget your PIN</div>
                  </div>
                  <span
                    title="When enabled, shows a text hint and partially reveals 2 digits of your PIN after 3 wrong attempts. Never stores your PIN in plain sight."
                    style={{ fontSize: 14, cursor: 'help', color: 'var(--ink-faint)' }}
                  >ℹ️</span>
                  <Toggle
                    checked={!!lock.pinHintEnabled}
                    onChange={(v) => updateSettings({ appLock: { ...lock, pinHintEnabled: v } })}
                    label="PIN hint"
                  />
                </div>
                {lock.pinHintEnabled && (
                  <input
                    className="input"
                    placeholder="e.g. My birth year, favourite number…"
                    value={lock.pinHint || ''}
                    onChange={(e) => updateSettings({ appLock: { ...lock, pinHint: e.target.value } })}
                    maxLength={60}
                    style={{ fontSize: 12 }}
                  />
                )}
              </div>
            </>
          )}
          <button className="btn btn-danger btn-sm" onClick={disable}>Disable lock</button>
        </>
      )}
    </div>
  )
}

export default function Settings({
  settings, updateSettings, transactions, debts, settlements, months,
  replaceAll, replaceDebts, replaceSettlements, clearAll, notify,
}) {
  const fileRef = useRef(null)
  const [showClearModal, setShowClearModal] = useState(false)
  const [pendingAction, setPendingAction] = useState(null) // { fn } — stored when PIN gate is open
  const [showAllFeatures, setShowAllFeatures] = useState(false)
  const [showAllReminders, setShowAllReminders] = useState(false)
  const [showAddReminder, setShowAddReminder] = useState(false)
  const [scope, setScope] = useState('all')
  const [perm, setPerm] = useState('default')
  const [prevCurrency, setPrevCurrency] = useState(settings.currency)
  const [showReconvert, setShowReconvert] = useState(false)
  const [showCatBudgets, setShowCatBudgets] = useState(false)

  useEffect(() => {
    getPermission().then(setPerm)
  }, [])

  const stamp = new Date().toISOString().slice(0, 10)
  const reminders = settings.reminders

  const scopedTx = scope === 'all' ? transactions : filterByMonth(transactions, scope)
  const scopeName = scope === 'all' ? 'all' : scope

  async function guardAction(fn) {
    const lock = settings.appLock
    if (!lock?.enabled) { fn(); return }
    if (lock.lockType === 'pin' && lock.pin) {
      setPendingAction({ fn })
      return
    }
    // device lock — trigger native biometric/passcode prompt
    if (!isNative()) { fn(); return } // web has no real device lock
    try {
      await BiometricAuth.authenticate({
        reason: 'Authenticate to continue',
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Use Passcode',
        androidTitle: 'Authentication Required',
        androidSubtitle: 'Confirm your identity to proceed',
      })
      fn()
    } catch (err) {
      const code = err?.code || ''
      if (code !== 'userCancel' && code !== 'systemCancel') {
        notify('Authentication failed')
      }
    }
  }

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

  function addCustomReminder(label, time = '09:00') {
    const l = label.trim()
    if (!l) return
    const custom = [...(reminders.custom || []), { id: uid(), label: l, time, enabled: true }]
    updateSettings({ reminders: { ...reminders, custom } })
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

      {/* Clock & Calendar */}
      <ClockCalendarSection settings={settings} updateSettings={updateSettings} />

      {/* App Lock */}
      <AppLockSection lock={settings.appLock || { enabled: false, pin: null }} updateSettings={updateSettings} notify={notify} />

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
        <div className="card-head">
          <span className="card-title">Reminders</span>
          {perm === 'granted' && (
            <button
              className="icon-btn"
              style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--brand)', color: '#fff', display: 'grid', placeItems: 'center' }}
              onClick={() => setShowAddReminder(true)}
              aria-label="Add reminder"
              title="Add reminder"
            >
              <IconPlus width={14} height={14} />
            </button>
          )}
        </div>
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
            {/* Fixed reminders — always shown */}
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

            {/* Custom reminders — collapse after 5 */}
            {(() => {
              const custom = reminders.custom || []
              const LIMIT = 5
              const visible = showAllReminders ? custom : custom.slice(0, LIMIT)
              return (
                <>
                  {visible.map((r) => (
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
                  {custom.length > LIMIT && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: 4, fontSize: 11 }}
                      onClick={() => setShowAllReminders((v) => !v)}
                    >
                      {showAllReminders ? 'Show less ↑' : `Show ${custom.length - LIMIT} more ↓`}
                    </button>
                  )}
                </>
              )
            })()}

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

      {/* Add reminder popup */}
      {showAddReminder && (
        <AddReminderModal
          onAdd={(label, time) => { addCustomReminder(label, time); setShowAddReminder(false) }}
          onClose={() => setShowAddReminder(false)}
        />
      )}

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
          <button className="btn" onClick={() => guardAction(() => download(`ledger-${scopeName}-${stamp}.json`, exportTransactionsJSON(scopedTx, scopeName), 'application/json'))}>
            <IconDownload /> JSON
          </button>
          <button className="btn" onClick={() => guardAction(() => download(`ledger-${scopeName}-${stamp}.csv`, exportCSV(scopedTx), 'text/csv'))}>
            <IconDownload /> CSV
          </button>
          <button className="btn" onClick={() => guardAction(() => download(`ledger-debts-${stamp}.csv`, exportDebtsCSV(debts), 'text/csv'))}>
            <IconDownload /> Debts CSV
          </button>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />

        <div className="card-head"><span className="card-title">Backup &amp; restore</span></div>
        <p className="muted" style={{ marginTop: 0, fontSize: 11.5 }}>
          Full backup includes transactions, debts, settlements and settings — restore on any device.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => guardAction(() => download(`ledger-backup-${stamp}.json`, exportBackup({ transactions, debts, settlements, settings }), 'application/json'))}>
            <IconDownload /> Full backup
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <IconUpload /> Import / restore
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />

        <button className="btn btn-danger" onClick={() => guardAction(() => setShowClearModal(true))}><IconTrash /> Clear all data</button>

        {showClearModal && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', padding: 24 }}
            onMouseDown={(e) => e.target === e.currentTarget && setShowClearModal(false)}
          >
            <div style={{ background: 'var(--surface)', borderRadius: 18, padding: '28px 24px', maxWidth: 320, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700 }}>Delete all data?</h3>
              <p style={{ margin: '0 0 22px', fontSize: 13, color: 'var(--ink-faint)', lineHeight: 1.55 }}>
                This will permanently delete all transactions, debts, settlements, and goals. <strong>This cannot be undone.</strong>
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowClearModal(false)}>Cancel</button>
                <button
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                  onClick={() => { clearAll(); setShowClearModal(false); notify('All data cleared') }}
                >
                  Delete all
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {pendingAction && (
        <PinGateModal
          storedPin={settings.appLock?.pin}
          onSuccess={() => { const { fn } = pendingAction; setPendingAction(null); fn() }}
          onCancel={() => setPendingAction(null)}
        />
      )}

      <div className="card card-pad">
        <div className="card-head">
          <span className="card-title">About Ledger</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: '999px', background: 'var(--brand-tint)', color: 'var(--brand-strong)' }}>v{__APP_VERSION__}</span>
        </div>

        <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.6, color: 'var(--ink)' }}>
          <strong>Ledger</strong> is a privacy-first personal finance tracker — built to stay fully offline, on your device. Track income, expenses, debts, goals, and monthly balance with zero accounts or cloud sync.
        </p>

        {(() => {
          const ALL_FEATURES = [
            ['✈️', 'Fully offline', 'All data lives on your device — no internet, no account, no cloud required.'],
            ['📊', 'Dashboard & insights', 'Spending breakdown by category, income vs expense trends, and smart monthly insights.'],
            ['🔒', 'App lock', 'Face ID, fingerprint, or custom PIN — re-locks when the app goes to background.'],
            ['👁️', 'Amount privacy', 'One-tap toggle to mask all amounts — requires auth to reveal when app lock is on.'],
            ['💾', 'Backup & restore', 'Export a full JSON backup of all data; restore on any device instantly.'],
            ['💱', 'Multi-currency', 'Log in any currency with live exchange rates; auto-convert to your base currency.'],
            ['🌍', 'World clock & calendar', '35+ countries with correct timezones; Nepal shows Bikram Sambat dates.'],
            ['🔁', 'Recurring transactions', 'Auto-add daily, weekly, monthly, or yearly repeating entries.'],
            ['🎯', 'Savings goals', 'Set a target, contribute over time, and track progress visually.'],
            ['📲', 'SMS detection', 'Paste a bank SMS to auto-detect and pre-fill a transaction.'],
            ['🔔', 'Reminders', 'Daily log nudges, debt follow-ups, and unlimited custom scheduled alerts.'],
          ]
          const visible = showAllFeatures ? ALL_FEATURES : ALL_FEATURES.slice(0, 5)
          return (
            <>
              <div className="about-features">
                {visible.map(([icon, title, desc]) => (
                  <div key={title} className="about-feature-row">
                    <span className="about-feature-icon">{icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--ink)' }}>{title}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 1 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 8, fontSize: 11 }}
                onClick={() => setShowAllFeatures((v) => !v)}
              >
                {showAllFeatures ? 'Show less ↑' : `Show ${ALL_FEATURES.length - 5} more features ↓`}
              </button>
            </>
          )
        })()}

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
