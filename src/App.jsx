import { useEffect, useMemo, useState } from 'react'
import { useTransactions } from './hooks/useTransactions'
import { useDebts, useSettlements } from './hooks/useDebts'
import { useTheme, useSettings } from './hooks/useTheme'
import { useReminders } from './hooks/useReminders'
import Dashboard from './components/Dashboard'
import TransactionList from './components/TransactionList'
import TransactionForm from './components/TransactionForm'
import Debts from './components/Debts'
import DebtForm from './components/DebtForm'
import Settings from './components/Settings'
import { listMonths, filterByMonth, totals } from './lib/stats'
import { buildSettlement, settlementFor, openingBalance } from './lib/settlements'
import { monthKey, todayISO } from './lib/format'
import { isNative, nativeSyncReminders } from './lib/native'
import { isSeedBannerVisible, markDataModified } from './lib/storage'
import {
  IconHome, IconList, IconChart, IconSettings, IconPlus, IconSun, IconMoon, IconUsers,
} from './components/icons'

const TABS = [
  { id: 'dashboard', label: 'Home', icon: IconHome },
  { id: 'transactions', label: 'History', icon: IconList },
  { id: 'debts', label: 'Debts', icon: IconUsers },
  { id: 'settings', label: 'Settings', icon: IconSettings },
]

export default function App() {
  const tx = useTransactions()
  const dbt = useDebts()
  const stl = useSettlements()
  const { theme, toggle } = useTheme()
  const { settings, update } = useSettings()

  const [tab, setTab] = useState('dashboard')
  const [month, setMonth] = useState(() => monthKey(todayISO()))
  const [txForm, setTxForm] = useState({ open: false, editing: null })
  const [debtForm, setDebtForm] = useState({ open: false, editing: null })
  const [toast, setToast] = useState('')
  const [showBanner, setShowBanner] = useState(() => isSeedBannerVisible())

  useReminders({ settings, transactions: tx.transactions, debts: dbt.debts, currency: settings.currency })

  useEffect(() => {
    if (isNative()) nativeSyncReminders(settings)
  }, [settings])

  // Auto carry-forward: settle past months without a settlement
  useEffect(() => {
    if (!settings.autoCarryForward || !tx.transactions.length) return
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

  const months = useMemo(() => listMonths(tx.transactions), [tx.transactions])

  function notify(msg) { setToast(msg) }
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(t)
  }, [toast])

  function touched() {
    if (showBanner) { markDataModified(); setShowBanner(false) }
  }

  // transaction modal
  function openAddTx() { setTxForm({ open: true, editing: null }) }
  function openEditTx(t) { setTxForm({ open: true, editing: t }) }
  function saveTx(data) {
    touched()
    if (txForm.editing) { tx.updateTransaction(txForm.editing.id, data); notify('Transaction updated') }
    else { tx.addTransaction(data); notify('Transaction added') }
    setTxForm({ open: false, editing: null })
  }
  function deleteTx(t) { touched(); tx.deleteTransaction(t.id); notify('Transaction deleted') }

  // debt modal
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

  function fabAdd() { tab === 'debts' ? openAddDebt() : openAddTx() }

  function settleMonth(m, opening, income, expense) {
    stl.upsertSettlement(buildSettlement(m, opening, income, expense))
    notify('Month settled')
  }
  function unsettleMonth(m) { stl.removeSettlement(m); notify('Settlement undone') }

  function clearEverything() {
    tx.clearAll()
    dbt.replaceDebts([])
    stl.replaceSettlements([])
    markDataModified()
    setShowBanner(false)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand-mark" aria-hidden="true">
            <IconChart width={20} height={20} style={{ color: '#fff' }} />
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
                  <Icon width={17} height={17} /> {t.label}
                </button>
              )
            })}
          </nav>

          <button className="btn btn-primary btn-sm desktop-add" onClick={fabAdd} style={{ marginLeft: 8 }}>
            <IconPlus width={16} height={16} /> Add
          </button>
          <button className="icon-btn" onClick={toggle} aria-label="Toggle theme" style={{ marginLeft: 8 }}>
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </header>

      {/* Demo data banner */}
      {showBanner && (
        <div className="seed-banner">
          <span className="seed-banner-icon">ℹ️</span>
          <div className="seed-banner-body">
            <strong>Demo data</strong> — Sample transactions loaded on first install.
            Add your own or clear to start fresh.
          </div>
          <div className="seed-banner-actions">
            <button className="btn btn-danger btn-sm" onClick={() => { clearEverything(); markDataModified(); setShowBanner(false); notify('Data cleared') }}>
              Clear
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowBanner(false)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="shell">
        {tab === 'dashboard' && (
          <Dashboard
            transactions={tx.transactions}
            settlements={stl.settlements}
            currency={settings.currency}
            monthlyBudget={settings.monthlyBudget || 0}
            month={month}
            onMonthChange={setMonth}
            onAdd={openAddTx}
            onSettle={settleMonth}
            onUnsettle={unsettleMonth}
          />
        )}
        {tab === 'transactions' && (
          <TransactionList
            transactions={tx.transactions}
            currency={settings.currency}
            month={month}
            onMonthChange={setMonth}
            onEdit={openEditTx}
            onDelete={deleteTx}
            onAdd={openAddTx}
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
            clearAll={clearEverything}
            notify={notify}
          />
        )}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="botnav" aria-label="Primary mobile">
        <div className="botnav-inner">
          <button className={'nav-item' + (tab === 'dashboard' ? ' active' : '')} onClick={() => setTab('dashboard')}><IconHome /> Home</button>
          <button className={'nav-item' + (tab === 'transactions' ? ' active' : '')} onClick={() => setTab('transactions')}><IconList /> History</button>
          <button className="fab" onClick={fabAdd} aria-label="Add"><IconPlus width={24} height={24} /></button>
          <button className={'nav-item' + (tab === 'debts' ? ' active' : '')} onClick={() => setTab('debts')}><IconUsers /> Debts</button>
          <button className={'nav-item' + (tab === 'settings' ? ' active' : '')} onClick={() => setTab('settings')}><IconSettings /> Settings</button>
        </div>
      </nav>

      {txForm.open && (
        <TransactionForm
          initial={txForm.editing}
          currency={settings.currency}
          onSave={saveTx}
          onClose={() => setTxForm({ open: false, editing: null })}
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

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
