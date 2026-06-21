import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { hydrateFromNative } from './lib/native'

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
