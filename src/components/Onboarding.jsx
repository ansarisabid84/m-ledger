import { useState } from 'react'
import { CURRENCIES } from '../lib/constants'
import { currencySymbol } from '../lib/format'
import { IconChart } from './icons'

// First-run setup: name → currency → what to track → (optional) monthly budget.
export default function Onboarding({ defaultCurrency, hasDemoData, onFinish }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState(defaultCurrency || 'NPR')
  const [trackIncome, setTrackIncome] = useState(false)
  const [budget, setBudget] = useState('')
  const [clean, setClean] = useState(true)
  const LAST = 3

  function finish() {
    onFinish({ userName: name.trim(), currency, trackIncome, monthlyBudget: Math.max(0, Number(budget) || 0), clean: hasDemoData && clean })
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 400 }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Welcome to Ledger" style={{ maxWidth: 440 }}>
        <div className="ob-dots">{[0, 1, 2, 3].map((i) => <i key={i} className={i === step ? 'on' : ''} />)}</div>

        {step === 0 && (
          <div style={{ textAlign: 'center' }}>
            <div className="brand-mark" style={{ width: 64, height: 64, borderRadius: 22, margin: '8px auto 16px' }}><IconChart width={30} height={30} style={{ color: '#fff' }} /></div>
            <h3 style={{ fontSize: 24 }}>Welcome to Ledger</h3>
            <p className="muted" style={{ margin: '8px 0 18px' }}>A private, offline money tracker. Everything stays on your device. Let&rsquo;s set it up in 30 seconds.</p>
            <div className="field" style={{ textAlign: 'left' }}>
              <label className="label">What should we call you? (optional)</label>
              <input className="input" placeholder="Your name" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 style={{ fontSize: 20, marginBottom: 4 }}>Your currency</h3>
            <p className="muted">Used for every amount in the app. You can change it later.</p>
            <div className="chips">
              {CURRENCIES.map((c) => (
                <button key={c.code} className={'chip' + (currency === c.code ? ' active' : '')} onClick={() => setCurrency(c.code)}>
                  <b>{c.symbol}</b> {c.code}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 style={{ fontSize: 20, marginBottom: 4 }}>What do you want to track?</h3>
            <p className="muted">You can switch this anytime in Settings.</p>
            <div style={{ display: 'grid', gap: 10 }}>
              <button className={'tile' + (!trackIncome ? ' active' : '')} style={{ flexDirection: 'row', textAlign: 'left', padding: 14, gap: 12, fontSize: 13 }} onClick={() => setTrackIncome(false)}>
                <span className="tile-ico">💸</span>
                <span><b style={{ color: 'var(--ink)', fontSize: 14 }}>Expenses only</b><br />Simple &amp; focused — log what you spend, stay within budget.</span>
              </button>
              <button className={'tile' + (trackIncome ? ' active' : '')} style={{ flexDirection: 'row', textAlign: 'left', padding: 14, gap: 12, fontSize: 13 }} onClick={() => setTrackIncome(true)}>
                <span className="tile-ico">📒</span>
                <span><b style={{ color: 'var(--ink)', fontSize: 14 }}>Income &amp; expenses</b><br />Full ledger with balance, savings and month settlements.</span>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 style={{ fontSize: 20, marginBottom: 4 }}>Monthly spending budget</h3>
            <p className="muted">We&rsquo;ll show how much you can safely spend each day. Skip if you&rsquo;re not sure.</p>
            <div className="amount-wrap">
              <span className="amount-cur">{currencySymbol(currency)}</span>
              <input className="input amount-input num" type="number" inputMode="decimal" min="0" placeholder="0" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
            {hasDemoData && (
              <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 16, fontSize: 13 }}>
                <input type="checkbox" checked={clean} onChange={(e) => setClean(e.target.checked)} style={{ width: 18, height: 18 }} />
                Start clean — remove the sample data
              </label>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          {step > 0 && <button className="btn" style={{ flex: 1 }} onClick={() => setStep(step - 1)}>Back</button>}
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => (step === LAST ? finish() : setStep(step + 1))}>
            {step === LAST ? 'Start tracking' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
