// Capacitor integration. Everything here is guarded by isNative() and uses
// dynamic imports, so the plain web build is completely unaffected: on the web
// these functions are no-ops and the Capacitor packages are never executed.

export function isNative() {
  return typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.())
}

const DAILY_ID = 1001
const DEBT_ID = 1002
const TEST_ID = 999
const CUSTOM_ID_BASE = 2000 // custom reminder IDs start at 2000

function hm(t) {
  const [h, m] = (t || '0:0').split(':').map(Number)
  return { hour: h || 0, minute: m || 0 }
}

/* ---------------- notifications ---------------- */

export async function nativeRequestPermission() {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const res = await LocalNotifications.requestPermissions()
    return res.display === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

export async function nativeCheckPermission() {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const res = await LocalNotifications.checkPermissions()
    if (res.display === 'granted') return 'granted'
    if (res.display === 'denied') return 'denied'
    return 'default'
  } catch {
    return 'default'
  }
}

// Cancel and re-schedule all reminders (daily, debt, and custom) as local notifications.
export async function nativeSyncReminders(settings) {
  if (!isNative()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    // Cancel all previously scheduled reminders (fixed + up to 20 custom slots)
    const toCancel = [{ id: DAILY_ID }, { id: DEBT_ID }]
    for (let i = 0; i < 20; i++) toCancel.push({ id: CUSTOM_ID_BASE + i })
    await LocalNotifications.cancel({ notifications: toCancel }).catch(() => {})

    const list = []

    const daily = settings?.reminders?.dailyLog
    if (daily?.enabled) {
      const { hour, minute } = hm(daily.time)
      list.push({
        id: DAILY_ID,
        title: "Log today's spending",
        body: "Add today's transactions before the day ends.",
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      })
    }

    const debt = settings?.reminders?.debts
    if (debt?.enabled) {
      const { hour, minute } = hm(debt.time)
      list.push({
        id: DEBT_ID,
        title: 'Pending settlements',
        body: 'Check borrowed & lent amounts that are still open.',
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      })
    }

    const custom = settings?.reminders?.custom || []
    custom.forEach((r, idx) => {
      if (!r.enabled || !r.label) return
      const { hour, minute } = hm(r.time)
      list.push({
        id: CUSTOM_ID_BASE + idx,
        title: r.label,
        body: 'Reminder from Ledger.',
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      })
    })

    if (list.length) await LocalNotifications.schedule({ notifications: list })
  } catch {
    /* noop */
  }
}

export async function nativeTestNotification() {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.schedule({
      notifications: [
        { id: TEST_ID, title: 'Test reminder', body: 'This is how reminders will look.', schedule: { at: new Date(Date.now() + 1500) } },
      ],
    })
    return true
  } catch {
    return false
  }
}

/* ---------------- storage durability ----------------
   Mirror each write into Capacitor Preferences and restore on boot, so data
   survives if the WebView ever clears localStorage. */

const MIRROR_KEYS = [
  'ledger.transactions.v1',
  'ledger.debts.v1',
  'ledger.settlements.v1',
  'ledger.settings.v1',
  'ledger.seeded.v1',
]

export function mirrorWrite(key, value) {
  if (!isNative()) return
  import('@capacitor/preferences')
    .then(({ Preferences }) => Preferences.set({ key, value }))
    .catch(() => {})
}

export async function hydrateFromNative() {
  if (!isNative()) return
  try {
    const { Preferences } = await import('@capacitor/preferences')
    for (const k of MIRROR_KEYS) {
      const local = localStorage.getItem(k)
      if (local == null) {
        const { value } = await Preferences.get({ key: k })
        if (value != null) localStorage.setItem(k, value)
      } else {
        // keep the durable backup current
        await Preferences.set({ key: k, value: local })
      }
    }
  } catch {
    /* noop */
  }
}
