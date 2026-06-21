import { monthLabel } from '../lib/format'
import { IconChevronL, IconChevronR } from './icons'

export default function MonthNav({ months, value, onChange }) {
  const idx = months.indexOf(value)
  const canOlder = value === 'all' ? months.length > 0 : idx < months.length - 1
  const canNewer = value !== 'all' && idx > 0

  function older() {
    if (value === 'all') onChange(months[0])
    else if (idx < months.length - 1) onChange(months[idx + 1])
  }
  function newer() {
    if (value !== 'all' && idx > 0) onChange(months[idx - 1])
  }

  return (
    <div className="monthnav">
      <button
        className={'monthnav-all' + (value === 'all' ? ' active' : '')}
        onClick={() => onChange('all')}
      >
        All time
      </button>
      <div className="monthnav-step">
        <button className="monthnav-arrow" onClick={older} disabled={!canOlder} aria-label="Older month">
          <IconChevronL width={18} height={18} />
        </button>
        <select
          className="monthnav-select"
          value={value === 'all' ? '' : value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          aria-label="Select month"
        >
          {value === 'all' && <option value="" disabled>Pick a month</option>}
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
        <button className="monthnav-arrow" onClick={newer} disabled={!canNewer} aria-label="Newer month">
          <IconChevronR width={18} height={18} />
        </button>
      </div>
    </div>
  )
}
