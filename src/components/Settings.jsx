import { useEffect, useRef, useState } from 'react'
import { CURRENCIES } from '../lib/constants'
import { exportTransactionsJSON, exportCSV, exportDebtsCSV, exportBackup, parseImport } from '../lib/storage'
import { filterByMonth } from '../lib/stats'
import { monthLabel } from '../lib/format'
import { notifSupported, getPermission, requestPermission, sendTestNotification, isNative } from '../lib/notify'
import { IconDownload, IconUpload, IconTrash, IconBell } from './icons'

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

export default function Settings({
  settings, updateSettings, transactions, debts, settlements, months,
  replaceAll, replaceDebts, replaceSettlements, clearAll, notify,
}) {
  const fileRef = useRef(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [scope, setScope] = useState('all')
  const [perm, setPerm] = useState('default')

  useEffect(() => {
    getPermission().then(setPerm)
  }, [])

  const stamp = new Date().toISOString().slice(0, 10)
  const reminders = settings.reminders

  const scopedTx = scope === 'all' ? transactions : filterByMonth(transactions, scope)
  const scopeName = scope === 'all' ? 'all' : scope

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
            <button key={c.code} className={'chip' + (settings.currency === c.code ? ' active' : '')} onClick={() => updateSettings({ currency: c.code })}>
              <span style={{ fontWeight: 700 }}>{c.symbol}</span> {c.code}
            </button>
          ))}
        </div>
      </div>

      {/* Reminders */}
      <div className="card card-pad">
        <div className="card-head"><span className="card-title">Reminders</span></div>
        {!notifSupported() ? (
          <p className="muted" style={{ marginTop: 0, fontSize: 13.5 }}>This browser doesn’t support notifications.</p>
        ) : perm !== 'granted' ? (
          <div>
            <p className="muted" style={{ marginTop: 0, fontSize: 13.5 }}>
              Allow notifications to get a nudge to log spending and to chase pending settlements.
            </p>
            <button className="btn btn-primary btn-sm" onClick={askPermission} disabled={perm === 'denied'}>
              <IconBell /> {perm === 'denied' ? 'Blocked in browser' : 'Enable notifications'}
            </button>
          </div>
        ) : (
          <div className="reminder-list">
            <div className="reminder-row">
              <div>
                <div className="reminder-name">Daily log reminder</div>
                <div className="reminder-sub">If you haven’t logged anything by this time</div>
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
            <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
              <button className="btn btn-sm" onClick={() => sendTestNotification()}>
                Send a test
              </button>
            </div>
            <p className="muted" style={{ fontSize: 12, margin: '12px 0 0' }}>
              {isNative()
                ? 'Reminders are delivered by your device and fire even when the app is closed.'
                : 'On the web, reminders fire while the app is open or running in the background. Install the mobile app for reminders that fire even when it\u2019s closed.'}
            </p>
          </div>
        )}
      </div>

      {/* Export / data */}
      <div className="card card-pad">
        <div className="card-head"><span className="card-title">Export</span></div>
        <p className="muted" style={{ marginTop: 0, fontSize: 13.5 }}>Export transactions for all time or a single month.</p>
        <div className="field" style={{ maxWidth: 260, marginBottom: 12 }}>
          <label className="label">Scope</label>
          <select className="select" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">All time</option>
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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

        <div style={{ height: 1, background: 'var(--border)', margin: '18px 0' }} />

        <div className="card-head"><span className="card-title">Backup &amp; restore</span></div>
        <p className="muted" style={{ marginTop: 0, fontSize: 13.5 }}>
          A full backup includes transactions, debts, settlements and settings — use it to move everything to another device.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => download(`ledger-backup-${stamp}.json`, exportBackup({ transactions, debts, settlements, settings }), 'application/json')}>
            <IconDownload /> Full backup
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <IconUpload /> Import / restore
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '18px 0' }} />

        {!confirmClear ? (
          <button className="btn btn-danger" onClick={() => setConfirmClear(true)}><IconTrash /> Clear all data</button>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Delete all transactions, debts &amp; settlements?</span>
            <button className="btn btn-danger" onClick={() => { clearAll(); setConfirmClear(false); notify('All data cleared') }}>Yes, delete</button>
            <button className="btn btn-ghost" onClick={() => setConfirmClear(false)}>Cancel</button>
          </div>
        )}
      </div>

      <div className="card card-pad">
        <div className="card-head"><span className="card-title">About</span></div>
        <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
          Ledger is an installable finance tracker. Add it to your home screen from your browser menu to use it like a native app — it works offline.
        </p>
      </div>
    </div>
  )
}
