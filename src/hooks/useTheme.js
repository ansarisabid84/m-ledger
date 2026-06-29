import { useCallback, useEffect, useState } from 'react'
import { loadSettings, saveSettings } from '../lib/storage'

const THEME_KEY = 'ledger.theme'

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function loadMode() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {}
  return 'system'
}

export function useTheme() {
  const [mode, setMode] = useState(loadMode)
  const [systemTheme, setSystemTheme] = useState(getSystemTheme)

  // Track OS-level dark/light changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => setSystemTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const theme = mode === 'system' ? systemTheme : mode

  // Apply effective theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(THEME_KEY, mode) } catch {}
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0e1311' : '#0e9f6e')
  }, [theme, mode])

  // Cycles: light → dark → system → light
  const cycle = useCallback(() => {
    setMode((m) => m === 'light' ? 'dark' : m === 'dark' ? 'system' : 'light')
  }, [])

  return { theme, mode, cycle }
}

export function useSettings() {
  const [settings, setSettings] = useState(() => loadSettings())

  const update = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  return { settings, update }
}
