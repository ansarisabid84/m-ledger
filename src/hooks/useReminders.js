import { useEffect, useRef } from 'react'
import { showNotification, notifPermission, timeToMinutes, isNative } from '../lib/notify'
import { fmtMoney } from '../lib/format'

const LAST_DAILY = 'ledger.reminder.daily.last'
const LAST_DEBT = 'ledger.reminder.debt.last'
const LAST_CUSTOM_PFX = 'ledger.reminder.custom.'

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function read(k) {
  try { return localStorage.getItem(k) } catch { return null }
}
function write(k, v) {
  try { localStorage.setItem(k, v) } catch {}
}

export function useReminders({ settings, transactions, debts, currency }) {
  const ref = useRef({})
  ref.current = { settings, transactions, debts, currency }

  useEffect(() => {
    if (isNative()) return
    function check() {
      const { settings, transactions, debts, currency } = ref.current
      if (notifPermission() !== 'granted') return
      const now = new Date()
      const mins = now.getHours() * 60 + now.getMinutes()
      const today = todayKey()

      // 1) Daily log reminder
      const daily = settings.reminders?.dailyLog
      if (daily?.enabled && mins >= timeToMinutes(daily.time) && read(LAST_DAILY) !== today) {
        write(LAST_DAILY, today)
        const loggedToday = transactions.some((t) => t.date === today)
        if (!loggedToday) {
          showNotification('Log today’s spending', {
            body: 'You haven’t recorded any transactions today. Add them before the day ends.',
            tag: 'ledger-daily',
          })
        }
      }

      // 2) Debt reminder
      const debtR = settings.reminders?.debts
      if (debtR?.enabled && mins >= timeToMinutes(debtR.time) && read(LAST_DEBT) !== today) {
        const open = debts.filter((d) => d.status === 'open')
        write(LAST_DEBT, today)
        if (open.length) {
          const iOwe = open.filter((d) => d.kind === 'borrowed').reduce((s, d) => s + d.amount, 0)
          const owedToMe = open.filter((d) => d.kind === 'lent').reduce((s, d) => s + d.amount, 0)
          const due = open.filter((d) => d.dueDate && d.dueDate <= today)
          const body = due.length
            ? `${due.length} item${due.length > 1 ? 's' : ''} due. You owe ${fmtMoney(iOwe, currency)}, owed ${fmtMoney(owedToMe, currency)}.`
            : `You owe ${fmtMoney(iOwe, currency)} · owed to you ${fmtMoney(owedToMe, currency)}.`
          showNotification('Pending settlements', { body, tag: 'ledger-debt' })
        }
      }

      // 3) Custom reminders
      const custom = settings.reminders?.custom || []
      for (const r of custom) {
        if (!r.enabled || !r.id || !r.label) continue
        const key = LAST_CUSTOM_PFX + r.id
        if (mins >= timeToMinutes(r.time) && read(key) !== today) {
          write(key, today)
          showNotification(r.label, { body: 'Reminder from Ledger.', tag: `ledger-custom-${r.id}` })
        }
      }
    }

    check()
    const id = setInterval(check, 60 * 1000)
    const onVis = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', check)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', check)
    }
  }, [])
}
