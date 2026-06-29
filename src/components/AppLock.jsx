import { useEffect, useRef, useState } from 'react'
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth'
import { IconChart, IconLock } from './icons'
import { isNative } from '../lib/native'

const MAX_ATTEMPTS = 5
const HINT_AFTER = 3         // show partial PIN after this many wrong attempts
const LOCKOUT_MS = 5 * 60 * 1000  // 5 minutes

// ─── Device lock screen ───────────────────────────────────────────────────────

function DeviceLockScreen({ onUnlock }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const triggered = useRef(false)

  async function authenticate() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await BiometricAuth.authenticate({
        reason: 'Unlock Ledger',
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Use Passcode',
        androidTitle: 'Unlock Ledger',
        androidSubtitle: 'Use biometrics or device PIN',
      })
      onUnlock()
    } catch (err) {
      const code = err?.code || ''
      if (code === 'userCancel' || code === 'systemCancel') {
        setError('')
      } else if (code === 'passcodeNotSet' || code === 'noDeviceCredential') {
        setError('No device passcode or biometrics set up. Configure one in your device settings.')
      } else if (!isNative()) {
        onUnlock()
      } else {
        setError('Authentication failed. Tap to try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (triggered.current) return
    triggered.current = true
    authenticate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px',
    }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--brand)', display: 'grid', placeItems: 'center', marginBottom: 24 }}>
        <IconLock width={28} height={28} style={{ color: '#fff' }} />
      </div>
      <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 8 }}>Ledger is locked</div>
      <p style={{ fontSize: 13, color: 'var(--ink-faint)', textAlign: 'center', maxWidth: 260, lineHeight: 1.55, marginBottom: 36 }}>
        Authenticate with Face ID, fingerprint, or your device passcode to continue.
      </p>
      {error && (
        <div style={{ fontSize: 12, color: 'var(--expense)', fontWeight: 600, marginBottom: 20, textAlign: 'center', maxWidth: 260 }}>
          {error}
        </div>
      )}
      <button
        className="btn btn-primary"
        style={{ padding: '12px 36px', fontSize: 15, fontWeight: 700, borderRadius: 12, opacity: busy ? 0.6 : 1 }}
        onClick={authenticate}
        disabled={busy}
      >
        {busy ? 'Authenticating…' : error ? 'Try Again' : 'Open Ledger'}
      </button>
    </div>
  )
}

// ─── PIN lock screen ──────────────────────────────────────────────────────────

function PinLockScreen({ storedPin, pinHintEnabled, pinHint, onUnlock }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(null)
  const [remaining, setRemaining] = useState(0)
  // Two random positions to reveal in partial hint — generated once at HINT_AFTER wrong attempts
  const [revealPositions, setRevealPositions] = useState(null)

  // Countdown timer when locked out
  useEffect(() => {
    if (!lockedUntil) return
    const id = setInterval(() => {
      const rem = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (rem <= 0) {
        setLockedUntil(null)
        setRemaining(0)
        setWrongAttempts(0)
        setRevealPositions(null)
        setError('')
      } else {
        setRemaining(rem)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [lockedUntil])

  function fmtCountdown(sec) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  // Partial PIN: 2 random digits revealed, 2 shown as *
  function buildRevealPositions() {
    const idxs = [0, 1, 2, 3]
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]]
    }
    return new Set(idxs.slice(0, 2))
  }

  const partialPin = revealPositions && storedPin
    ? storedPin.split('').map((d, i) => revealPositions.has(i) ? d : '*').join('')
    : null

  function handleDigit(d) {
    if (lockedUntil) return
    const next = input + d
    if (next.length > 4) return
    setInput(next)
    setError('')
    if (next.length === 4) {
      if (next === storedPin) {
        onUnlock()
      } else {
        const nextWrong = wrongAttempts + 1
        setWrongAttempts(nextWrong)
        setShake(true)

        if (nextWrong >= MAX_ATTEMPTS) {
          // Lock out for 5 minutes
          setLockedUntil(Date.now() + LOCKOUT_MS)
          setError('Too many attempts. Try again in 5:00.')
          setInput('')
          setShake(false)
        } else {
          if (nextWrong === HINT_AFTER && !revealPositions) {
            setRevealPositions(buildRevealPositions())
          }
          const attemptsLeft = MAX_ATTEMPTS - nextWrong
          setError(`Incorrect PIN — ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left`)
          setTimeout(() => { setInput(''); setShake(false) }, 600)
        }
      }
    }
  }

  const isLockedOut = !!lockedUntil

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px',
    }}>
      {/* Branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--brand)', display: 'grid', placeItems: 'center' }}>
          <IconChart width={22} height={22} style={{ color: '#fff' }} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>Ledger</div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
            {isLockedOut ? 'Too many attempts' : 'Enter your PIN to continue'}
          </div>
        </div>
      </div>

      {isLockedOut ? (
        /* ── Lockout state ── */
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>App locked</div>
          <p style={{ fontSize: 13, color: 'var(--ink-faint)', maxWidth: 240, lineHeight: 1.55, marginBottom: 20 }}>
            Too many incorrect attempts. Try again in
          </p>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: 'var(--expense)', letterSpacing: '0.04em' }}>
            {fmtCountdown(remaining)}
          </div>
        </div>
      ) : (
        <>
          {/* PIN dots */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 14, animation: shake ? 'pin-shake 0.5s ease' : 'none' }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{
                width: 16, height: 16, borderRadius: '50%',
                background: i < input.length ? 'var(--brand)' : 'var(--border)',
                transition: 'background 0.15s',
              }} />
            ))}
          </div>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--expense)', fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>{error}</div>
          )}

          {/* Partial PIN reveal after HINT_AFTER wrong attempts (only if hints enabled) */}
          {pinHintEnabled && partialPin && (
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginBottom: 10, textAlign: 'center' }}>
              PIN hint: <span style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.2em', fontSize: 14 }}>{partialPin}</span>
            </div>
          )}

          {/* Text hint (if enabled and set) */}
          {pinHintEnabled && pinHint && !partialPin && (
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 10, textAlign: 'center' }}>
              Hint: {pinHint}
            </div>
          )}
          {pinHintEnabled && pinHint && partialPin && (
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 10, textAlign: 'center' }}>
              {pinHint}
            </div>
          )}

          {/* Numpad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 260, width: '100%' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((k, i) => (
              <button
                key={i}
                onClick={() => {
                  if (k === '') return
                  if (k === '⌫') { setInput((v) => v.slice(0, -1)); setError(''); return }
                  handleDigit(String(k))
                }}
                style={{
                  height: 60, borderRadius: 14, border: '1px solid var(--border)',
                  background: k === '' ? 'transparent' : 'var(--surface)',
                  fontSize: k === '⌫' ? 20 : 24, fontWeight: 600,
                  cursor: k === '' ? 'default' : 'pointer',
                  color: 'var(--ink)', boxShadow: k !== '' ? '0 1px 3px rgba(0,0,0,.06)' : 'none',
                  transition: 'var(--transition)',
                }}
              >{k}</button>
            ))}
          </div>
        </>
      )}

      <style>{`
        @keyframes pin-shake {
          0%,100% { transform: translateX(0) }
          20%      { transform: translateX(-8px) }
          40%      { transform: translateX(8px) }
          60%      { transform: translateX(-8px) }
          80%      { transform: translateX(4px) }
        }
      `}</style>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function AppLock({ appLock, onUnlock }) {
  const { lockType = 'device', pin, pinHintEnabled = false, pinHint = '' } = appLock || {}
  if (lockType === 'pin' && pin) {
    return <PinLockScreen storedPin={pin} pinHintEnabled={pinHintEnabled} pinHint={pinHint} onUnlock={onUnlock} />
  }
  return <DeviceLockScreen onUnlock={onUnlock} />
}
