import { useState } from 'react'
import { fmtMoney, todayISO } from '../lib/format'
import { CATEGORY_MAP, METHOD_MAP } from '../lib/constants'
import { parseSms } from '../lib/smsParser'
import { isNative } from '../lib/native'
import { IconClose, IconCheck, IconTrash, IconInbox, IconEdit } from './icons'

function PendingRow({ item, currency, onApprove, onReject }) {
  const cat = CATEGORY_MAP[item.category] || { label: item.category, icon: '•' }
  const method = METHOD_MAP[item.method] || { label: item.method }
  const isIncome = item.type === 'income'

  return (
    <div style={{
      display: 'flex', gap: 10, padding: '10px 0',
      borderBottom: '1px solid var(--border)', alignItems: 'flex-start',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: isIncome ? 'var(--income-tint)' : 'var(--surface-2)',
        display: 'grid', placeItems: 'center', fontSize: 15,
      }}>{cat.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.note || cat.label}
          </span>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, flexShrink: 0,
            color: isIncome ? 'var(--income)' : 'var(--expense)',
          }}>
            {isIncome ? '+' : '−'}{fmtMoney(item.amount, currency)}
          </span>
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 2, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          <span>{cat.label}</span>
          <span>·</span>
          <span>{method.label}</span>
          {item.rawSms && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>· "{item.rawSms.slice(0, 60)}…"</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button className="btn btn-primary btn-sm" style={{ padding: '4px 7px', fontSize: 11 }} onClick={() => onApprove(item)}>
          <IconCheck width={11} height={11} /> Add
        </button>
        <button className="tx-act" onClick={() => onReject(item.id)} title="Dismiss">
          <IconTrash />
        </button>
      </div>
    </div>
  )
}

export default function PendingInbox({ pending, currency, onApprove, onReject, onClear, onOpenForm, smsDetection }) {
  const [open, setOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [parseError, setParseError] = useState('')
  const [clipboardLoading, setClipboardLoading] = useState(false)

  async function readFromClipboard() {
    setClipboardLoading(true)
    try {
      const text = await navigator.clipboard.readText()
      if (text?.trim()) {
        setPasteText(text.trim())
        setParseError('')
      } else {
        setParseError('Clipboard is empty.')
      }
    } catch {
      setParseError('Could not read clipboard. Copy the SMS first, then try again.')
    } finally {
      setClipboardLoading(false)
    }
  }

  function handleParse() {
    const text = pasteText.trim()
    if (!text) return
    const result = parseSms(text)
    if (result) {
      onApprove({ ...result, rawSms: text, date: todayISO() }, true /* addToPending */)
      setPasteText('')
      setParseError('')
    } else {
      setParseError('Could not detect a transaction in this text. Try a bank debit/credit SMS.')
    }
  }

  if (!smsDetection) return null

  return (
    <>
      {/* Floating badge button */}
      {pending.length > 0 && (
        <button
          className="btn btn-sm"
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom))', right: 14,
            zIndex: 50, background: 'var(--expense)', color: '#fff', borderColor: 'var(--expense)',
            gap: 5, boxShadow: 'var(--shadow-lg)',
          }}
        >
          <IconInbox width={14} height={14} />
          {pending.length} pending
        </button>
      )}

      {/* Inbox modal */}
      {open && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 520 }}>
            <div className="modal-grab" />
            <div className="modal-head">
              <h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }}>
                <IconInbox width={16} height={16} /> SMS Inbox
                {pending.length > 0 && (
                  <span style={{
                    background: 'var(--expense)', color: '#fff', borderRadius: '999px',
                    fontSize: 10, fontWeight: 700, padding: '1px 6px',
                  }}>{pending.length}</span>
                )}
              </h3>
              <button className="icon-btn" onClick={() => setOpen(false)}><IconClose /></button>
            </div>

            {/* Paste SMS */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <label className="label">Bank SMS text</label>
                {(isNative() || navigator.clipboard) && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 10, padding: '3px 7px' }}
                    onClick={readFromClipboard}
                    disabled={clipboardLoading}
                  >
                    {clipboardLoading ? 'Reading…' : '📋 Paste from clipboard'}
                  </button>
                )}
              </div>
              <textarea
                className="input textarea"
                rows={3}
                placeholder="Paste your bank's transaction SMS here, or use the clipboard button above…"
                value={pasteText}
                onChange={(e) => { setPasteText(e.target.value); setParseError('') }}
                style={{ resize: 'vertical', fontSize: 16, lineHeight: 1.4 }}
              />
              {parseError && <p style={{ color: 'var(--expense)', fontSize: 11, margin: '4px 0 0' }}>{parseError}</p>}
              <div style={{ display: 'flex', gap: 7, marginTop: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn btn-primary btn-sm" onClick={handleParse} disabled={!pasteText.trim()}>
                  Detect transaction
                </button>
                <span style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
                  {isNative() ? 'Copy the SMS in Messages, then tap "Paste from clipboard".' : 'Copy a bank SMS and paste it above.'}
                </span>
              </div>
            </div>

            {/* Pending list */}
            {pending.length > 0 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)' }}>
                    {pending.length} detected transaction{pending.length > 1 ? 's' : ''} waiting for review
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={onClear} style={{ fontSize: 10 }}>Clear all</button>
                </div>
                <div>
                  {pending.map((item) => (
                    <PendingRow
                      key={item.id}
                      item={item}
                      currency={currency}
                      onApprove={(item) => { onOpenForm(item); setOpen(false) }}
                      onReject={onReject}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="empty" style={{ padding: '20px 10px' }}>
                <p style={{ fontSize: 12 }}>No detected transactions. Paste an SMS above to get started.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
