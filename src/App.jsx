import { useEffect, useMemo, useRef, useState } from 'react'
import { useTransactions } from './hooks/useTransactions'
import { useDebts, useSettlements } from './hooks/useDebts'
import { useTheme, useSettings } from './hooks/useTheme'
import { useReminders } from './hooks/useReminders'
import { useGoals } from './hooks/useGoals'
import { usePending } from './hooks/usePending'
import Dashboard from './components/Dashboard'
import TransactionList from './components/TransactionList'
import TransactionForm from './components/TransactionForm'
import Debts from './components/Debts'
import DebtForm from './components/DebtForm'
import Goals from './components/Goals'
import Settings from './components/Settings'
import PendingInbox from './components/PendingInbox'
import AppLock from './components/AppLock'
import PinGate from './components/PinGate'
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth'
import { listMonths, filterByMonth, totals } from './lib/stats'
import { buildSettlement, settlementFor, openingBalance } from './lib/settlements'
import { monthKey, todayISO } from './lib/format'
import { resolveClock } from './lib/calendar'
import { isNative, nativeSyncReminders, nativeWriteBackup } from './lib/native'
import { isSeedBannerVisible, markDataModified, makeTransaction, exportBackup } from './lib/storage'
import { processDueRecurring } from './lib/recurring'
import {
  IconHome, IconList, IconChart, IconSettings, IconPlus, IconSun, IconMoon, IconSystem, IconUsers, IconTarget, IconEye, IconEyeOff,
} from './components/icons'

const TABS = [
  { id: 'dashboard', label: 'Home', icon: IconHome },
  { id: 'transactions', label: 'History', icon: IconList },
  { id: 'goals', label: 'Goals', icon: IconTarget },
  { id: 'debts', label: 'Debts', icon: IconUsers },
  { id: 'settings', label: 'Settings', icon: IconSettings },
]

export default function App() {
  const tx = useTransactions()
  const dbt = useDebts()
  const stl = useSettlements()
  const { theme, mode, cycle } = useTheme()
  const { settings, update } = useSettings()
  const goals = useGoals()
  const pending = usePending()

  const [tab, setTab] = useState('dashboard')
  const [month, setMonth] = useState(() => monthKey(todayISO()))
  const [txForm, setTxForm] = useState({ open: false, editing: null })
  const [debtForm, setDebtForm] = useState({ open: false, editing: null })
  const [toast, setToast] = useState('')
  const [undoTx, setUndoTx] = useState(null)
  const [showBanner, setShowBanner] = useState(() => isSeedBannerVisible())
  const [hideAmounts, setHideAmounts] = useState(() => settings.hideAmounts ?? false)
  const [showRevealPinGate, setShowRevealPinGate] = useState(false)
  const [locked, setLocked] = useState(() => {
    const al = settings.appLock
    if (!al?.enabled) return false
    if (al.lockType === 'pin') return !!al.pin
    return true // device lock always starts locked
  })
  const hiddenAtRef = useRef(null)

  useReminders({ settings, transactions: tx.transactions, debts: dbt.debts, currency: settings.currency })

  useEffect(() => {
    if (isNative()) nativeSyncReminders(settings)
  }, [settings])

  // Re-lock after app is hidden for >60 seconds
  useEffect(() => {
    function onVisChange() {
      const lock = settings.appLock
      if (!lock?.enabled) return
      if (lock.lockType === 'pin' && !lock.pin) return
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now()
      } else {
        if (hiddenAtRef.current && Date.now() - hiddenAtRef.current > 60_000) {
          setLocked(true)
        }
        hiddenAtRef.current = null
      }
    }
    document.addEventListener('visibilitychange', onVisChange)
    return () => document.removeEventListener('visibilitychange', onVisChange)
  }, [settings.appLock])

  // Auto-backup — checks on start, on returning to the foreground and every few minutes.
  // Everything it needs is read from a ref: the effect is only re-created when the schedule
  // changes, so reading props/state directly would back up stale (start-of-session) data.
  const backupDataRef = useRef(null)
  backupDataRef.current = { transactions: tx.transactions, debts: dbt.debts, settlements: stl.settlements, settings, goals: goals.goals }
  const backupRunning = useRef(false)
  const backupErrorShown = useRef(false)
  useEffect(() => {
    if (!isNative()) return
    async function checkBackup() {
      if (document.visibilityState !== 'visible' || backupRunning.current) return
      const cur = backupDataRef.current
      const ab = cur.settings.autoBackup
      if (!ab?.enabled || !ab?.intervalHours) return
      // don't back up before the stored data has finished loading (would overwrite a good backup with an empty one)
      if (!cur.transactions.length && !cur.debts.length && !cur.goals.length) return
      const intervalMs = ab.intervalHours * 60 * 60 * 1000
      if (ab.lastBackupAt && Date.now() - ab.lastBackupAt < intervalMs) return
      backupRunning.current = true
      try {
        const res = await nativeWriteBackup(exportBackup(cur), ab.folderName || 'Ledger')
        if (res.ok) {
          update({ autoBackup: { ...backupDataRef.current.settings.autoBackup, lastBackupAt: Date.now() } })
          backupErrorShown.current = false
          notify('Auto-backup saved')
        } else if (!backupErrorShown.current) {
          backupErrorShown.current = true
          notify('Auto-backup failed — open Settings to check')
        }
      } finally {
        backupRunning.current = false
      }
    }
    checkBackup()
    const timer = setInterval(checkBackup, 5 * 60 * 1000)
    document.addEventListener('visibilitychange', checkBackup)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', checkBackup) }
  }, [settings.autoBackup?.enabled, settings.autoBackup?.intervalHours, settings.autoBackup?.folderName, tx.transactions.length > 0]) // eslint-disable-line

  // Auto carry-forward
  useEffect(() => {
    if (!settings.trackIncome || !settings.autoCarryForward || !tx.transactions.length) return
    const currentMonth = monthKey(todayISO())
    const unsettled = listMonths(tx.transactions).filter(
      (m) => m < currentMonth && !settlementFor(m, stl.settlements)
    )
    if (!unsettled.length) return
    const sorted = [...unsettled].sort()
    let all = [...stl.settlements]
    for (const m of sorted) {
      const mt = totals(filterByMonth(tx.transactions, m))
      const open = openingBalance(m, all)
      all = [...all.filter((s) => s.month !== m), buildSettlement(m, open, mt.income, mt.expense)]
    }
    stl.replaceSettlements(all)
    notify(`Auto-settled ${sorted.length} past month${sorted.length > 1 ? 's' : ''}`)
  }, [settings.autoCarryForward, tx.transactions.length, stl.settlements.length]) // eslint-disable-line

  // Process due recurring transactions once, as soon as stored data has loaded
  // (transactions are empty on the very first render, so this can't run on mount).
  const recurringDone = useRef(false)
  useEffect(() => {
    if (recurringDone.current || !tx.transactions.length) return
    recurringDone.current = true
    const { toAdd, updatedSource } = processDueRecurring(tx.transactions)
    if (!toAdd.length && !updatedSource.length) return

    let updated = [...tx.transactions]

    // Update nextDate on source recurring transactions
    if (updatedSource.length) {
      updated = updated.map((t) => {
        const u = updatedSource.find((s) => s.id === t.id)
        return u ? { ...t, recurring: { ...t.recurring, nextDate: u.nextDate } } : t
      })
    }

    // Add due transactions (skip duplicates by _fromRecurring + date)
    const existingKeys = new Set(updated.map((t) => `${t._fromRecurring || ''}:${t.date}`))
    const newOnes = toAdd
      .filter((d) => !existingKeys.has(`${d._fromRecurring}:${d.date}`))
      .map((d) => makeTransaction(d))

    if (newOnes.length) {
      tx.replaceAll([...newOnes, ...updated])
      notify(`${newOnes.length} recurring transaction${newOnes.length > 1 ? 's' : ''} added`)
    } else if (updatedSource.length) {
      tx.replaceAll(updated)
    }
  }, [tx.transactions]) // eslint-disable-line

  const trackIncome = settings.trackIncome !== false
  // Expense-only mode hides income rows everywhere without deleting them.
  const viewTx = useMemo(
    () => (trackIncome ? tx.transactions : tx.transactions.filter((t) => t.type !== 'income')),
    [tx.transactions, trackIncome]
  )
  const months = useMemo(() => listMonths(viewTx), [viewTx])
  const visiblePending = useMemo(
    () => (trackIncome ? pending.pending : pending.pending.filter((p) => p.type !== 'income')),
    [pending.pending, trackIncome]
  )

  // Apply the visual style (classic / liquid glass) app-wide
  useEffect(() => {
    document.documentElement.setAttribute('data-style', settings.dashboard?.style === 'classic' ? 'classic' : 'glass')
  }, [settings.dashboard?.style])

  function doReveal() {
    setHideAmounts(false)
    update({ hideAmounts: false })
  }

  async function toggleHideAmounts() {
    if (!hideAmounts) {
      // Hiding — no auth needed
      setHideAmounts(true)
      update({ hideAmounts: true })
      return
    }
    // Revealing — require auth if app lock is enabled
    const lock = settings.appLock
    if (!lock?.enabled) { doReveal(); return }
    if (lock.lockType === 'pin' && lock.pin) {
      setShowRevealPinGate(true)
      return
    }
    // Device lock
    if (!isNative()) { doReveal(); return }
    try {
      await BiometricAuth.authenticate({
        reason: 'Authenticate to show amounts',
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Use Passcode',
        androidTitle: 'Show Amounts',
        androidSubtitle: 'Confirm your identity to reveal amounts',
      })
      doReveal()
    } catch {
      // User cancelled or auth failed — stay hidden
    }
  }

  function notify(msg) { setUndoTx(null); setToast(msg) }
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => { setToast(''); setUndoTx(null) }, undoTx ? 5500 : 2200)
    return () => clearTimeout(t)
  }, [toast, undoTx])

  function touched() {
    if (showBanner) { markDataModified(); setShowBanner(false) }
  }

  // Transaction modal
  function openAddTx(prefill) { setTxForm({ open: true, editing: null, prefill: prefill || null }) }
  function openEditTx(t) { setTxForm({ open: true, editing: t, prefill: null }) }
  function saveTx(data) {
    touched()
    if (txForm.editing) { tx.updateTransaction(txForm.editing.id, data); notify('Transaction updated') }
    else { tx.addTransaction(data); notify('Transaction added') }
    setTxForm({ open: false, editing: null, prefill: null })
  }
  function deleteTx(t) {
    touched()
    tx.deleteTransaction(t.id)
    setToast('Transaction deleted')
    setUndoTx(t)
  }
  function restoreTx() {
    if (!undoTx) return
    tx.replaceAll([undoTx, ...tx.transactions])
    setUndoTx(null)
    setToast('Transaction restored')
  }

  // Debt modal
  function openAddDebt() { setDebtForm({ open: true, editing: null }) }
  function openEditDebt(d) { setDebtForm({ open: true, editing: d }) }
  function saveDebt(data) {
    touched()
    if (debtForm.editing) { dbt.updateDebt(debtForm.editing.id, data); notify('Record updated') }
    else { dbt.addDebt(data); notify('Record added') }
    setDebtForm({ open: false, editing: null })
  }
  function deleteDebt(d) { touched(); dbt.deleteDebt(d.id); notify('Record deleted') }
  function toggleDebt(id) { dbt.toggleSettled(id); notify('Updated') }

  function fabAdd() {
    if (tab === 'debts') openAddDebt()
    else openAddTx()
  }

  function settleMonth(m, opening, income, expense) {
    stl.upsertSettlement(buildSettlement(m, opening, income, expense))
    notify('Month settled')
  }
  function unsettleMonth(m) { stl.removeSettlement(m); notify('Settlement undone') }

  function clearEverything() {
    tx.clearAll()
    dbt.replaceDebts([])
    stl.replaceSettlements([])
    goals.replaceGoals([])
    pending.clearPending()
    markDataModified()
    setShowBanner(false)
  }

  // Pending SMS inbox handlers
  function handlePendingApprove(item, addToPending) {
    if (item.type === 'income' && !trackIncome) { pending.removePending(item.id); return }
    if (addToPending) {
      pending.addPending(item)
    } else {
      // Open TransactionForm pre-filled with detected data
      openAddTx({
        type: item.type,
        amount: String(item.amount),
        category: item.category,
        method: item.method,
        note: item.note,
        date: item.date || todayISO(),
      })
      pending.removePending(item.id)
    }
  }

  const clock = resolveClock(settings)

  return (
    <div className="app">
      {locked && settings.appLock?.enabled && (
        <AppLock appLock={settings.appLock} onUnlock={() => setLocked(false)} />
      )}
      {showRevealPinGate && (
        <PinGate
          storedPin={settings.appLock?.pin}
          title="Reveal amounts"
          subtitle="Enter your PIN to show all amounts"
          onSuccess={() => { setShowRevealPinGate(false); doReveal() }}
          onCancel={() => setShowRevealPinGate(false)}
        />
      )}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand-mark" aria-hidden="true">
            <IconChart width={17} height={17} style={{ color: '#fff' }} />
          </div>
          <div>
            <div className="brand-name">Ledger</div>
            <div className="brand-sub">Daily finance tracker</div>
          </div>
          <div className="spacer" />

          <nav className="sidenav" aria-label="Primary">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <button key={t.id} className={'tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
                  <Icon width={15} height={15} /> {t.label}
                </button>
              )
            })}
          </nav>

          <button className="btn btn-primary btn-sm desktop-add" onClick={fabAdd} style={{ marginLeft: 6 }}>
            <IconPlus width={13} height={13} /> Add
          </button>
          <button
            className="icon-btn"
            onClick={toggleHideAmounts}
            aria-label={hideAmounts ? 'Show amounts' : 'Hide amounts'}
            title={hideAmounts ? 'Show amounts' : 'Hide amounts'}
            style={{ marginLeft: 6 }}
          >
            {hideAmounts ? <IconEyeOff /> : <IconEye />}
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              cycle()
              const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light'
              notify(next === 'light' ? '☀️ Light theme' : next === 'dark' ? '🌙 Dark theme' : '💻 System theme')
            }}
            aria-label={mode === 'light' ? 'Light theme — click for dark' : mode === 'dark' ? 'Dark theme — click for system' : 'System theme — click for light'}
            title={mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System'}
            style={{ marginLeft: 2 }}
          >
            {mode === 'light' ? <IconSun /> : mode === 'dark' ? <IconMoon /> : <IconSystem />}
          </button>
        </div>
      </header>

      {/* Demo data banner */}
      {showBanner && (
        <div className="seed-banner">
          <span className="seed-banner-icon">ℹ️</span>
          <div className="seed-banner-body">
            <strong>Demo data</strong> — Sample transactions loaded on first install. Add your own or clear to start fresh.
          </div>
          <div className="seed-banner-actions">
            <button className="btn btn-danger btn-sm" onClick={() => { clearEverything(); markDataModified(); setShowBanner(false); notify('Data cleared') }}>
              Clear
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowBanner(false)}>Dismiss</button>
          </div>
        </div>
      )}

      <main className="shell">
        {tab === 'dashboard' && (
          <Dashboard
            transactions={viewTx}
            trackIncome={trackIncome}
            style={settings.dashboard?.style || 'glass'}
            layout={settings.dashboard?.widgets}
            onLayoutChange={(widgets) => update({ dashboard: { ...settings.dashboard, widgets } })}
            onStyleChange={(st) => update({ dashboard: { ...settings.dashboard, style: st } })}
            settlements={stl.settlements}
            currency={settings.currency}
            monthlyBudget={settings.monthlyBudget || 0}
            categoryBudgets={settings.categoryBudgets || {}}
            month={month}
            onMonthChange={setMonth}
            onAdd={openAddTx}
            onSettle={settleMonth}
            onUnsettle={unsettleMonth}
            hideAmounts={hideAmounts}
            clockCountry={clock.countryCode}
            clockTimezone={clock.tz}
            clockFormat={settings.clockFormat || '24h'}
          />
        )}
        {tab === 'transactions' && (
          <TransactionList
            transactions={viewTx}
            trackIncome={trackIncome}
            currency={settings.currency}
            month={month}
            onMonthChange={setMonth}
            onEdit={openEditTx}
            onDelete={deleteTx}
            onAdd={openAddTx}
            hideAmounts={hideAmounts}
          />
        )}
        {tab === 'goals' && (
          <Goals
            goals={goals.goals}
            currency={settings.currency}
            onAdd={goals.addGoal}
            onUpdate={goals.updateGoal}
            onContribute={goals.contributeToGoal}
            onDelete={goals.deleteGoal}
          />
        )}
        {tab === 'debts' && (
          <Debts
            debts={dbt.debts}
            currency={settings.currency}
            onAdd={openAddDebt}
            onToggle={toggleDebt}
            onEdit={openEditDebt}
            onDelete={deleteDebt}
            hideAmounts={hideAmounts}
          />
        )}
        {tab === 'settings' && (
          <Settings
            settings={settings}
            updateSettings={update}
            transactions={tx.transactions}
            debts={dbt.debts}
            settlements={stl.settlements}
            months={months}
            replaceAll={tx.replaceAll}
            replaceDebts={dbt.replaceDebts}
            replaceSettlements={stl.replaceSettlements}
            goals={goals.goals}
            replaceGoals={goals.replaceGoals}
            clearAll={clearEverything}
            notify={notify}
          />
        )}
      </main>

      {/* SMS Pending Inbox (floating badge + modal) */}
      <PendingInbox
        pending={visiblePending}
        currency={settings.currency}
        smsDetection={settings.smsDetection}
        onApprove={handlePendingApprove}
        onReject={pending.removePending}
        onClear={pending.clearPending}
        onOpenForm={(item) => openAddTx(item)}
      />

      {/* Mobile bottom navigation (6 items including FAB) */}
      <nav className="botnav" aria-label="Primary mobile">
        <div className="botnav-inner">
          <button className={'nav-item' + (tab === 'dashboard' ? ' active' : '')} onClick={() => setTab('dashboard')}><IconHome width={18} height={18} />Home</button>
          <button className={'nav-item' + (tab === 'transactions' ? ' active' : '')} onClick={() => setTab('transactions')}><IconList width={18} height={18} />History</button>
          <button className="fab" onClick={fabAdd} aria-label="Add"><IconPlus width={22} height={22} /></button>
          <button className={'nav-item' + (tab === 'goals' ? ' active' : '')} onClick={() => setTab('goals')}><IconTarget width={18} height={18} />Goals</button>
          <button className={'nav-item' + (tab === 'debts' ? ' active' : '')} onClick={() => setTab('debts')}><IconUsers width={18} height={18} />Debts</button>
          <button className={'nav-item' + (tab === 'settings' ? ' active' : '')} onClick={() => setTab('settings')}><IconSettings width={18} height={18} />More</button>
        </div>
      </nav>

      {txForm.open && (
        <TransactionForm
          initial={txForm.editing || txForm.prefill}
          trackIncome={trackIncome}
          history={tx.transactions}
          currency={settings.currency}
          onSave={saveTx}
          onClose={() => setTxForm({ open: false, editing: null, prefill: null })}
        />
      )}
      {debtForm.open && (
        <DebtForm
          initial={debtForm.editing}
          currency={settings.currency}
          onSave={saveDebt}
          onClose={() => setDebtForm({ open: false, editing: null })}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
          {undoTx && <button className="toast-action" onClick={restoreTx}>Undo</button>}
        </div>
      )}
    </div>
  )
}
