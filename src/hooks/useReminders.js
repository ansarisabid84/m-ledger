import { useEffect, useRef } from 'react'
import { showNotification, notifPermission, timeToMinutes, isNative } from '../lib/notify'
import { fmtMoney } from '../lib/format'

const LAST_DAILY = 'ledger.reminder.daily.last'
const LAST_DEBT = 'ledger.reminder.debt.last'

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
  // keep latest values without re-subscribing the interval each render
  const ref = useRef({})
  ref.current = { settings, transactions, debts, currency }

  useEffect(() => {
    // On native, reminders are scheduled local notifications (lib/native.js),
    // so the in-app interval is unnecessary.
    if (isNative()) return
    function check() {
      const { settings, transactions, debts, currency } = ref.current
      if (notifPermission() !== 'granted') return
      const now = new Date()
      const mins = now.getHours() * 60 + now.getMinutes()
      const today = todayKey()

      // 1) End-of-day reminder to log spending
      const daily = settings.reminders?.dailyLog
      if (daily?.enabled && mins >= timeToMinutes(daily.time) && read(LAST_DAILY) !== today) {
        const loggedToday = transactions.some((t) => t.date === today)
        write(LAST_DAILY, today)
        if (!loggedToday) {
          showNotification('Log today\u2019s spending', {
            body: 'You haven\u2019t recorded any transactions today. Add them before the day ends.',
            tag: 'ledger-daily',
          })
        }
      }

      // 2) Outstanding debt reminder
      const debtR = settings.reminders?.debts
      if (debtR?.enabled && mins >= timeToMinutes(debtR.time) && read(LAST_DEBT) !== today) {
        const open = debts.filter((d) => d.status === 'open')
        write(LAST_DEBT, today)
        if (open.length) {
          const iOwe = open.filter((d) => d.kind === 'borrowed').reduce((s, d) => s + d.amount, 0)
          const owedToMe = open.filter((d) => d.kind === 'lent').reduce((s, d) => s + d.amount, 0)
          const due = open.filter((d) => d.dueDate && d.dueDate <= today)
          let body
          if (due.length) {
            body = `${due.length} item${due.length > 1 ? 's' : ''} due. You owe ${fmtMoney(iOwe, currency)}, owed ${fmtMoney(owedToMe, currency)}.`
          } else {
            body = `You owe ${fmtMoney(iOwe, currency)} \u00b7 owed to you ${fmtMoney(owedToMe, currency)}.`
          }
          showNotification('Pending settlements', { body, tag: 'ledger-debt' })
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
