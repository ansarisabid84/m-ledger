import { useState } from 'react'

export default function PinGate({ storedPin, onSuccess, onCancel, title = 'Enter PIN', subtitle = 'Confirm your identity to continue' }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  function handleDigit(d) {
    const next = input + d
    if (next.length > 4) return
    setInput(next); setError('')
    if (next.length === 4) {
      if (next === storedPin) { onSuccess() }
      else {
        setShake(true); setError('Incorrect PIN')
        setTimeout(() => { setInput(''); setShake(false) }, 600)
      }
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 18, padding: '28px 24px', maxWidth: 320, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 20 }}>{subtitle}</div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 12, animation: shake ? 'pin-shake 0.5s ease' : 'none' }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: i < input.length ? 'var(--brand)' : 'var(--border)', transition: 'background 0.15s' }} />
          ))}
        </div>
        {error && <div style={{ fontSize: 12, color: 'var(--expense)', fontWeight: 600, marginBottom: 10 }}>{error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 220, margin: '0 auto 12px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((k, i) => (
            <button key={i}
              onClick={() => { if (k === '') return; if (k === '⌫') { setInput((v) => v.slice(0, -1)); return }; handleDigit(String(k)) }}
              style={{ height: 44, borderRadius: 10, border: '1px solid var(--border)', background: k === '' ? 'transparent' : 'var(--surface)', fontSize: k === '⌫' ? 16 : 18, fontWeight: 600, cursor: k === '' ? 'default' : 'pointer', color: 'var(--ink)' }}
            >{k}</button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <style>{`@keyframes pin-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-8px)}80%{transform:translateX(4px)}}`}</style>
      </div>
    </div>
  )
}
