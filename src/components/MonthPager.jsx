import { useState } from 'react'
import { monthLabel } from '../lib/format'
import { IconChevronL, IconChevronR } from './icons'

// Month selector: ‹ October 2026 ›  — tap the label to jump to any month or "All time".
// Arrow buttons step one month; the parent screens also wire swipe gestures to the same handlers.
export default function MonthPager({ months, value, onChange }) {
  const [open, setOpen] = useState(false)
  const idx = months.indexOf(value)
  const canOlder = value === 'all' ? false : idx < months.length - 1
  const canNewer = value === 'all' ? false : idx > 0

  return (
    <>
      <div className="pager">
        <button className="pager-arrow" onClick={() => canOlder && onChange(months[idx + 1])} disabled={!canOlder} aria-label="Previous month">
          <IconChevronL width={20} height={20} />
        </button>
        <button className="pager-label" onClick={() => setOpen(true)} aria-label="Choose period">
          {value === 'all' ? 'All time' : monthLabel(value)}
          <small>▾</small>
        </button>
        <button className="pager-arrow" onClick={() => canNewer && onChange(months[idx - 1])} disabled={!canNewer} aria-label="Next month">
          <IconChevronR width={20} height={20} />
        </button>
      </div>

      {open && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)} style={{ zIndex: 200 }}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Choose period" style={{ maxWidth: 380 }}>
            <div className="modal-grab" />
            <div className="modal-head"><h3>Choose period</h3></div>
            <button className={'btn btn-block' + (value === 'all' ? ' btn-primary' : '')} style={{ marginBottom: 10 }} onClick={() => { onChange('all'); setOpen(false) }}>
              All time
            </button>
            <div style={{ maxHeight: '44vh', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {months.map((m) => (
                <button key={m} className={'btn' + (value === m ? ' btn-primary' : '')} onClick={() => { onChange(m); setOpen(false) }}>
                  {monthLabel(m)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
