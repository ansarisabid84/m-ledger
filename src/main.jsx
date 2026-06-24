import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { hydrateFromNative } from './lib/native'

// ─── Mobile keyboard scroll/zoom fix ────────────────────────────────────────
// On iOS (Safari + Capacitor WKWebView) and some Android browsers:
//   • The page scrolls when a text input is focused to bring it into view.
//   • When the keyboard is dismissed the scroll position is NOT automatically
//     restored, leaving the screen "stuck" at an offset / appearing zoomed.
// Fix:
//   1. Remember scrollY right before any input gains focus.
//   2. When the visual viewport grows back (keyboard closed), restore it.
//   3. Briefly toggle maximum-scale=1 on the viewport meta to force iOS to
//      reset the pinch-zoom level back to 1x without permanently disabling zoom.
;(function installKeyboardFix() {
  if (typeof window === 'undefined') return

  const FIELD_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])
  const vp = document.querySelector('meta[name="viewport"]')
  const vpBase = vp ? vp.getAttribute('content') : ''

  let savedScrollY = 0
  let kbOpen = false

  // Capture scroll position the moment a field is focused (before keyboard opens)
  document.addEventListener('focusin', (e) => {
    if (FIELD_TAGS.has(e.target?.tagName)) {
      if (!kbOpen) savedScrollY = window.scrollY
    }
  }, true)

  // Primary fix via visualViewport API (most reliable on iOS 13+ / Android Chrome)
  const vv = window.visualViewport
  if (vv) {
    vv.addEventListener('resize', () => {
      const shrunk = vv.height < window.innerHeight * 0.78
      if (shrunk && !kbOpen) {
        kbOpen = true
      } else if (!shrunk && kbOpen) {
        kbOpen = false
        // Restore scroll position after the keyboard animation finishes
        setTimeout(() => {
          window.scrollTo({ top: savedScrollY, behavior: 'instant' })

          // Force iOS to reset its zoom scale: set maximum-scale=1 for one frame
          // then remove it so the user can still pinch-zoom manually.
          if (vp && vpBase) {
            vp.setAttribute('content', vpBase + ', maximum-scale=1')
            requestAnimationFrame(() => {
              vp.setAttribute('content', vpBase)
            })
          }
        }, 80)
      }
    })
  } else {
    // Fallback for browsers without visualViewport (older Android WebView)
    document.addEventListener('focusout', (e) => {
      if (!FIELD_TAGS.has(e.target?.tagName)) return
      setTimeout(() => {
        const ae = document.activeElement
        if (!ae || !FIELD_TAGS.has(ae.tagName)) {
          window.scrollTo({ top: savedScrollY, behavior: 'instant' })
          if (vp && vpBase) {
            vp.setAttribute('content', vpBase + ', maximum-scale=1')
            requestAnimationFrame(() => vp.setAttribute('content', vpBase))
          }
        }
      }, 150)
    }, true)
  }
}())

async function boot() {
  // On native, restore data from the durable backup before first paint.
  // No-op on the web (resolves immediately).
  try {
    await hydrateFromNative()
  } catch {
    /* ignore */
  }
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

boot()
