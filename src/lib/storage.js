// localStorage-backed persistence. No backend required.

import { mirrorWrite } from './native'

const TX_KEY = 'ledger.transactions.v1'
const DEBT_KEY = 'ledger.debts.v1'
const SETTLE_KEY = 'ledger.settlements.v1'
const SETTINGS_KEY = 'ledger.settings.v1'
const SEED_FLAG = 'ledger.seeded.v1'
const GOALS_KEY = 'ledger.goals.v1'
const PENDING_KEY = 'ledger.pending.v1'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function safeWrite(key, value) {
  try {
    const serialized = JSON.stringify(value)
    localStorage.setItem(key, serialized)
    mirrorWrite(key, serialized) // durable backup on native; no-op on web
  } catch (e) {
    console.error('Could not save to localStorage', e)
  }
}

/* ---------------- transactions ---------------- */

function sortTx(list) {
  return [...list].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt
  )
}

export function loadTransactions() {
  return sortTx(safeRead(TX_KEY, []))
}

export function saveTransactions(list) {
  safeWrite(TX_KEY, list)
}

export function makeTransaction(data) {
  return {
    id: uid(),
    type: data.type,
    amount: Number(data.amount),
    category: data.category,
    method: data.method,
    date: data.date,
    note: (data.note || '').trim(),
    recurring: data.recurring
      ? { enabled: true, frequency: data.recurring.frequency || 'monthly', nextDate: data.recurring.nextDate || null }
      : null,
    createdAt: Date.now(),
  }
}

/* ---------------- debts (borrowed / lent) ---------------- */
// Kept entirely separate from transactions — never part of monthly totals.

export function loadDebts() {
  const list = safeRead(DEBT_KEY, [])
  return [...list].sort((a, b) => {
    // open first, then by date desc
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1
    return a.date < b.date ? 1 : -1
  })
}

export function saveDebts(list) {
  safeWrite(DEBT_KEY, list)
}

export function makeDebt(data) {
  return {
    id: uid(),
    kind: data.kind, // 'borrowed' (I owe) | 'lent' (owed to me)
    person: (data.person || '').trim(),
    amount: Number(data.amount),
    date: data.date,
    dueDate: data.dueDate || null,
    note: (data.note || '').trim(),
    status: 'open', // 'open' | 'settled'
    settledDate: null,
    createdAt: Date.now(),
  }
}

/* ---------------- monthly settlements (carry-forward) ---------------- */
// One record per settled month. carryForward becomes the next month's opening balance.

export function loadSettlements() {
  return safeRead(SETTLE_KEY, [])
}

export function saveSettlements(list) {
  safeWrite(SETTLE_KEY, list)
}

/* ---------------- settings ---------------- */

const DEFAULT_SETTINGS = {
  currency: 'NPR',
  monthlyBudget: 0,
  autoCarryForward: false,
  smsDetection: false,
  hideAmounts: false,
  clockCountry: null,    // ISO-2 country code e.g. 'IN', 'US', 'NP'
  clockTimezone: null,   // IANA tz string e.g. 'Asia/Kolkata'
  clockCurrency: null,   // legacy — superseded by clockCountry/clockTimezone
  clockFormat: '24h',    // '24h' | '12h'
  // App lock: 'device' uses the phone's own lock screen as the barrier (re-locks on background).
  // 'pin' adds an explicit 4-digit PIN inside the app.
  appLock: { enabled: false, lockType: 'device', pin: null, pinHintEnabled: false, pinHint: '' },
  autoBackup: { enabled: false, intervalHours: 24, lastBackupAt: null, folderName: 'Backups' },
  categoryBudgets: {},
  reminders: {
    dailyLog: { enabled: false, time: '21:00' },
    debts: { enabled: false, time: '10:00' },
    custom: [],
  },
}

const MODIFIED_KEY = 'ledger.modified.v1'
export function isDataModified() { return safeRead(MODIFIED_KEY, false) }
export function markDataModified() { safeWrite(MODIFIED_KEY, true) }
export function isSeedBannerVisible() {
  return safeRead(SEED_FLAG, false) && !safeRead(MODIFIED_KEY, false)
}

export function loadSettings() {
  const s = safeRead(SETTINGS_KEY, {})
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    monthlyBudget: s.monthlyBudget ?? DEFAULT_SETTINGS.monthlyBudget,
    autoCarryForward: s.autoCarryForward ?? DEFAULT_SETTINGS.autoCarryForward,
    smsDetection: s.smsDetection ?? false,
    hideAmounts: s.hideAmounts ?? false,
    clockCountry: s.clockCountry ?? null,
    clockTimezone: s.clockTimezone ?? null,
    clockCurrency: s.clockCurrency ?? null,
    clockFormat: s.clockFormat ?? '24h',
    appLock: s.appLock
      ? { enabled: !!s.appLock.enabled, lockType: s.appLock.lockType || 'device', pin: s.appLock.pin || null, pinHintEnabled: !!s.appLock.pinHintEnabled, pinHint: s.appLock.pinHint || '' }
      : { enabled: false, lockType: 'device', pin: null, pinHintEnabled: false, pinHint: '' },
    autoBackup: s.autoBackup
      ? { enabled: !!s.autoBackup.enabled, intervalHours: Number(s.autoBackup.intervalHours) || 24, lastBackupAt: s.autoBackup.lastBackupAt || null, folderName: s.autoBackup.folderName || 'Backups' }
      : { enabled: false, intervalHours: 24, lastBackupAt: null, folderName: 'Backups' },
    categoryBudgets: s.categoryBudgets ?? {},
    reminders: {
      dailyLog: { ...DEFAULT_SETTINGS.reminders.dailyLog, ...(s.reminders?.dailyLog || {}) },
      debts: { ...DEFAULT_SETTINGS.reminders.debts, ...(s.reminders?.debts || {}) },
      custom: Array.isArray(s.reminders?.custom) ? s.reminders.custom : [],
    },
  }
}

export function saveSettings(s) {
  safeWrite(SETTINGS_KEY, s)
}

/* ---------------- import / export ---------------- */

export function exportTransactionsJSON(list, scopeLabel = 'all') {
  return JSON.stringify(
    { app: 'ledger', version: 2, scope: scopeLabel, exportedAt: new Date().toISOString(), transactions: list },
    null,
    2
  )
}

export function exportCSV(list) {
  const head = ['date', 'type', 'amount', 'category', 'method', 'note']
  const rows = list.map((t) =>
    [t.date, t.type, t.amount, t.category, t.method, `"${(t.note || '').replace(/"/g, '""')}"`].join(',')
  )
  return [head.join(','), ...rows].join('\n')
}

export function exportDebtsCSV(list) {
  const head = ['kind', 'person', 'amount', 'date', 'dueDate', 'status', 'settledDate', 'note']
  const rows = list.map((d) =>
    [d.kind, `"${(d.person || '').replace(/"/g, '""')}"`, d.amount, d.date, d.dueDate || '', d.status, d.settledDate || '', `"${(d.note || '').replace(/"/g, '""')}"`].join(',')
  )
  return [head.join(','), ...rows].join('\n')
}

// Full backup: everything needed to restore the app on another device.
export function exportBackup({ transactions, debts, settlements, settings, goals }) {
  return JSON.stringify(
    { app: 'ledger', version: 2, exportedAt: new Date().toISOString(), transactions, debts, settlements, settings, goals: goals || [] },
    null,
    2
  )
}

function normalizeTx(t) {
  return {
    id: t.id || uid(),
    type: t.type,
    amount: Number(t.amount),
    category: t.category || (t.type === 'income' ? 'other_income' : 'other_expense'),
    method: t.method || 'cash',
    date: t.date,
    note: t.note || '',
    createdAt: t.createdAt || Date.now(),
  }
}

// Returns { transactions, debts|null, settlements|null }.
export function parseImport(text) {
  const data = JSON.parse(text)
  const txArr = Array.isArray(data) ? data : data.transactions
  if (!Array.isArray(txArr)) throw new Error('No transactions found in file.')
  const transactions = txArr.filter((t) => t && t.amount != null && t.type && t.date).map(normalizeTx)

  const debts = Array.isArray(data.debts)
    ? data.debts
        .filter((d) => d && d.amount != null && d.kind)
        .map((d) => ({
          id: d.id || uid(),
          kind: d.kind,
          person: d.person || '',
          amount: Number(d.amount),
          date: d.date || new Date().toISOString().slice(0, 10),
          dueDate: d.dueDate || null,
          note: d.note || '',
          status: d.status === 'settled' ? 'settled' : 'open',
          settledDate: d.settledDate || null,
          createdAt: d.createdAt || Date.now(),
        }))
    : null

  const settlements = Array.isArray(data.settlements)
    ? data.settlements.filter((s) => s && s.month).map((s) => ({
        month: s.month,
        openingBalance: Number(s.openingBalance || 0),
        income: Number(s.income || 0),
        expense: Number(s.expense || 0),
        carryForward: Number(s.carryForward || 0),
        settledAt: s.settledAt || new Date().toISOString(),
      }))
    : null

  const goals = Array.isArray(data.goals) ? data.goals : null

  return { transactions, debts, settlements, goals }
}

/* ---------------- savings goals ---------------- */

export function loadGoals() {
  return safeRead(GOALS_KEY, [])
}

export function saveGoals(list) {
  safeWrite(GOALS_KEY, list)
}

export function makeGoal(data) {
  return {
    id: uid(),
    name: data.name.trim(),
    targetAmount: Number(data.targetAmount),
    savedAmount: Number(data.savedAmount || 0),
    icon: data.icon || '🎯',
    color: data.color || '#5b6cf0',
    deadline: data.deadline || null,
    createdAt: Date.now(),
  }
}

/* ---------------- pending (SMS-detected) transactions ---------------- */

export function loadPending() {
  return safeRead(PENDING_KEY, [])
}

export function savePending(list) {
  safeWrite(PENDING_KEY, list)
}

export function makePending(data) {
  return {
    id: uid(),
    type: data.type || 'expense',
    amount: Number(data.amount),
    category: data.category || (data.type === 'income' ? 'other_income' : 'other_expense'),
    method: data.method || 'upi',
    note: (data.note || '').trim(),
    rawSms: data.rawSms || '',
    detectedAt: Date.now(),
  }
}

/* ---------------- demo seed ---------------- */

function isoDaysAgo(n) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const SEED = [
  ['income', 85000, 'salary', 'net_banking', 2, 'Monthly salary'],
  ['expense', 18500, 'rent', 'net_banking', 1, 'Flat rent'],
  ['expense', 2450, 'groceries', 'upi', 1, 'Big Bazaar'],
  ['expense', 640, 'food', 'upi', 0, 'Lunch with team'],
  ['expense', 1299, 'shopping', 'credit_card', 3, 'Headphones'],
  ['expense', 220, 'transport', 'upi', 0, 'Auto + metro'],
  ['expense', 999, 'entertainment', 'credit_card', 4, 'OTT subscriptions'],
  ['expense', 480, 'food', 'cash', 2, 'Street food'],
  ['expense', 3600, 'bills', 'upi', 5, 'Electricity + internet'],
  ['income', 6000, 'freelance', 'upi', 6, 'Design gig'],
  ['expense', 750, 'health', 'debit_card', 7, 'Pharmacy'],
  ['expense', 1500, 'transport', 'credit_card', 8, 'Cab to airport'],
  ['expense', 320, 'food', 'wallet', 1, 'Coffee'],
  ['income', 1200, 'refund', 'upi', 9, 'Order refund'],
  ['expense', 2100, 'shopping', 'upi', 10, 'Clothes'],
]

const SEED_DEBTS = [
  ['lent', 'Rahul', 2000, 5, 12, 'Lunch + movie'],
  ['borrowed', 'Priya', 5000, 8, null, 'Emergency cash'],
]

export function seedIfEmpty() {
  if (safeRead(SEED_FLAG, false)) {
    return { transactions: loadTransactions(), debts: loadDebts() }
  }
  if (loadTransactions().length === 0) {
    saveTransactions(
      SEED.map(([type, amount, category, method, daysAgo, note]) =>
        makeTransaction({ type, amount, category, method, date: isoDaysAgo(daysAgo), note })
      )
    )
  }
  if (loadDebts().length === 0) {
    saveDebts(
      SEED_DEBTS.map(([kind, person, amount, daysAgo, dueIn, note]) => ({
        ...makeDebt({ kind, person, amount, date: isoDaysAgo(daysAgo), note, dueDate: dueIn != null ? isoDaysAgo(-dueIn) : null }),
      }))
    )
  }
  safeWrite(SEED_FLAG, true)
  return { transactions: loadTransactions(), debts: loadDebts() }
}
