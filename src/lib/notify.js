// Best-effort web notifications, with native (Capacitor) delegation when available.
//
// On native (Android/iOS via Capacitor) reminders are real scheduled local
// notifications that fire even when the app is closed — see lib/native.js.
// On the web there's no reliable way to fire a notification while the tab is
// fully closed without a push server, so web reminders fire while the app is
// open or recently active.

import { isNative, nativeRequestPermission, nativeCheckPermission, nativeTestNotification } from './native'

export { isNative }

export function notifSupported() {
  return isNative() || (typeof window !== 'undefined' && 'Notification' in window)
}

export function notifPermission() {
  return notifSupported() ? Notification.permission : 'unsupported'
}

export async function requestNotifPermission() {
  if (!notifSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export async function showNotification(title, options = {}) {
  if (!notifSupported() || Notification.permission !== 'granted') return false
  const opts = {
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    ...options,
  }
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, opts)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    // eslint-disable-next-line no-new
    new Notification(title, opts)
    return true
  } catch {
    return false
  }
}

// "HH:MM" -> minutes since midnight
export function timeToMinutes(hhmm) {
  const [h, m] = (hhmm || '00:00').split(':').map(Number)
  return h * 60 + m
}

/* ---------------- platform-aware helpers (used by Settings) ---------------- */

export async function getPermission() {
  if (isNative()) return nativeCheckPermission()
  return notifPermission()
}

export async function requestPermission() {
  if (isNative()) return nativeRequestPermission()
  return requestNotifPermission()
}

export async function sendTestNotification() {
  if (isNative()) return nativeTestNotification()
  return showNotification('Test reminder', { body: 'This is how reminders will look.', tag: 'ledger-test' })
}
