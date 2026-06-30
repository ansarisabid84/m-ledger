import { useEffect, useMemo, useRef, useState } from 'react'
import { totals, byCategory, byMethod, monthlyTrend, filterByMonth, listMonths } from '../lib/stats'
import { fmtMoney, maskMoney, AMOUNT_MASK, monthLabel, monthKey, todayISO } from '../lib/format'
import { CATEGORY_MAP, METHOD_MAP, EXPENSE_CATEGORIES } from '../lib/constants'
import { settlementFor, openingBalance, nextMonthKey } from '../lib/settlements'
import {
  formatClockTime, formatClockDate, gregorianToBS, BS_MONTHS,
  bsCalendarGrid, getDateParts, bsMonthDays, getCountry, isBS,
  gregorianCalendarGrid,
} from '../lib/calendar'
import { CategoryDonut, TrendChart, MethodChart } from './Charts'
import MonthNav from './MonthNav'
import { IconUp, IconDown, IconWallet, IconLock, IconUndo, IconCheck, IconBulb, IconCalendar, IconClose, IconFilter } from './icons'

// ─── Filter sheet ────────────────────────────────────────────────────────────

function FilterSheet({ months, value, onChange, onClose }) {
  const overlayRef = useRef(null)
  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onMouseDown={(e) => e.target === overlayRef.current && onClose()}
      style={{ zIndex: 200 }}
    >
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 360 }}>
        <div className="modal-grab" />
        <div className="modal-head">
          <h3 style={{ fontSize: 15 }}>Filter period</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>
        <button
          className={'btn btn-block' + (value === 'all' ? ' btn-primary' : '')}
          style={{ marginBottom: 10 }}
          onClick={() => { onChange('all'); onClose() }}
        >
          All time
        </button>
        <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {months.map((m) => (
            <button
              key={m}
              className={'btn' + (value === m ? ' btn-primary' : ' btn-ghost')}
              style={{ justifyContent: 'flex-start', textAlign: 'left' }}
              onClick={() => { onChange(m); onClose() }}
            >
              {monthLabel(m)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Calendar popup ──────────────────────────────────────────────────────────

function CalendarPopup({ clockCountry, clockTimezone, clockFormat, onClose }) {
  const now = new Date()
  const country = getCountry(clockCountry) || { flag: '🌐', name: '' }
  const useBS = isBS(clockCountry)
  const { year, month, day } = getDateParts(now, clockTimezone)

  const bsNow = useBS ? gregorianToBS(year, month + 1, day) : null
  const [viewYear, setViewYear] = useState(useBS ? (bsNow?.year ?? year) : year)
  const [viewMonth, setViewMonth] = useState(useBS ? (bsNow?.month ?? month + 1) : month + 1)
  const [selectedDate, setSelectedDate] = useState(null) // { adDate } always present for diff calc

  // Today as a plain midnight date in local time (used for day-diff)
  const todayMidnight = new Date(year, month, day, 0, 0, 0, 0)

  const [tick, setTick] = useState(now)
  useEffect(() => {
    const id = setInterval(() => setTick(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const overlayRef = useRef(null)
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }
  function goToday() {
    if (useBS && bsNow) { setViewYear(bsNow.year); setViewMonth(bsNow.month) }
    else { setViewYear(year); setViewMonth(month + 1) }
    setSelectedDate(null)
  }

  const weeks = useBS ? bsCalendarGrid(viewYear, viewMonth) : gregorianCalendarGrid(viewYear, viewMonth)
  const monthName = useBS
    ? BS_MONTHS[viewMonth - 1]
    : new Date(viewYear, viewMonth - 1, 1).toLocaleDateString('en-US', { month: 'long' })

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onMouseDown={(e) => e.target === overlayRef.current && onClose()}
      style={{ zIndex: 200 }}
    >
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 340 }}>
        <div className="modal-grab" />

        {/* Header: flag + date + time */}
        <div className="modal-head" style={{ alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 26, lineHeight: 1 }}>{country.flag}</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>
                {formatClockDate(now, clockTimezone, clockCountry)}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
                {formatClockTime(tick, clockTimezone, clockFormat)}
              </div>
              {useBS && <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>Bikram Sambat</div>}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><IconClose /></button>
        </div>

        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={prevMonth} style={{ padding: '4px 10px', fontSize: 16, lineHeight: 1 }}>‹</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{monthName} {viewYear}{useBS ? ' BS' : ''}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={goToday}
              style={{ fontSize: 9, padding: '2px 7px', color: 'var(--brand)', borderColor: 'var(--brand)' }}
            >
              Today
            </button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth} style={{ padding: '4px 10px', fontSize: 16, lineHeight: 1 }}>›</button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
          {DAYS.map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'var(--ink-faint)', padding: '2px 0' }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
            {week.map((cell, di) => {
              if (!cell) return <div key={di} />

              let isToday, isSelected, label, isAdjacentMonth
              if (useBS) {
                isAdjacentMonth = cell.adjacent === true
                isToday = !isAdjacentMonth && bsNow && cell.bsDay === bsNow.day && viewYear === bsNow.year && viewMonth === bsNow.month
                isSelected = selectedDate?.bsDay === cell.bsDay && !isAdjacentMonth
                label = cell.bsDay
              } else {
                isAdjacentMonth = !cell.current
                isToday = !isAdjacentMonth && cell.date.getFullYear() === year && cell.date.getMonth() === month && cell.date.getDate() === day
                isSelected = selectedDate && !isAdjacentMonth &&
                  cell.date.toDateString() === selectedDate?.date?.toDateString()
                label = cell.date.getDate()
              }

              const bg = isSelected
                ? 'var(--brand-strong, var(--brand))'
                : isToday ? 'var(--brand)' : 'transparent'
              const color = (isSelected || isToday)
                ? 'var(--on-brand, #fff)'
                : isAdjacentMonth ? 'var(--ink-faint)' : 'var(--ink)'

              return (
                <button
                  key={di}
                  onClick={() => {
                    if (isAdjacentMonth) return
                    // Determine AD date for this cell
                    const adDate = useBS ? cell.adDate : cell.date
                    const cellMidnight = adDate
                      ? new Date(adDate.getFullYear(), adDate.getMonth(), adDate.getDate(), 0, 0, 0, 0)
                      : null
                    const diff = cellMidnight ? Math.round((cellMidnight - todayMidnight) / 86400000) : null
                    // If today is tapped, clear selection (nothing to show)
                    if (diff === 0) { setSelectedDate(null); return }
                    if (useBS) setSelectedDate({ bsDay: cell.bsDay, adDate: cell.adDate, diff })
                    else setSelectedDate({ date: cell.date, diff })
                  }}
                  style={{
                    textAlign: 'center', fontSize: 11, fontWeight: isToday ? 700 : 400,
                    padding: '5px 2px', borderRadius: 6,
                    background: bg, color,
                    border: 'none', cursor: isAdjacentMonth ? 'default' : 'pointer',
                    opacity: isAdjacentMonth ? 0.4 : 1,
                    transition: 'background 0.15s',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        ))}

        {/* Selected date info — days before/after today */}
        {selectedDate && selectedDate.diff !== 0 && (
          <div style={{
            marginTop: 10, padding: '8px 12px',
            background: selectedDate.diff > 0 ? 'var(--income-tint)' : 'var(--expense-tint)',
            borderRadius: 8, fontSize: 12, fontWeight: 600, textAlign: 'center',
            color: selectedDate.diff > 0 ? 'var(--income)' : 'var(--expense)',
          }}>
            {selectedDate.diff > 0
              ? `${selectedDate.diff} day${selectedDate.diff === 1 ? '' : 's'} from today`
              : `${Math.abs(selectedDate.diff)} day${Math.abs(selectedDate.diff) === 1 ? '' : 's'} ago`}
            <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--ink-faint)', marginTop: 2 }}>
              {useBS
                ? `${BS_MONTHS[viewMonth - 1]} ${selectedDate.bsDay}, ${viewYear} BS`
                : selectedDate.date?.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Live Clock ───────────────────────────────────────────────────────────────

function LiveClock({ clockCountry, clockTimezone, clockFormat }) {
  const [now, setNow] = useState(() => new Date())
  const [showCal, setShowCal] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const country = getCountry(clockCountry)
  const flag = country?.flag || '🌐'
  const timeStr = formatClockTime(now, clockTimezone, clockFormat)
  const dateStr = formatClockDate(now, clockTimezone, clockCountry)

  return (
    <>
      <button
        onClick={() => setShowCal(true)}
        className="live-clock-btn"
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '6px 10px',
          cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)',
          display: 'flex', alignItems: 'center', gap: 7,
        }}
      >
        <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{flag}</span>
        <div>
          <div style={{ fontSize: 9, color: 'var(--ink-faint)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 1 }}>
            {dateStr}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            {timeStr}
          </div>
        </div>
      </button>
      {showCal && (
        <CalendarPopup
          clockCountry={clockCountry}
          clockTimezone={clockTimezone}
          clockFormat={clockFormat}
          onClose={() => setShowCal(false)}
        />
      )}
    </>
  )
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({ label, value, tone, icon, tint, subtitle }) {
  return (
    <div className="stat">
      <div className="stat-top">
        <span className="stat-badge" style={{ background: tint, color: tone }}>{icon}</span>
        {label}
      </div>
      <div className="stat-val num" style={{ color: tone }}>{value}</div>
      {subtitle && <div style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 3, lineHeight: 1.4 }}>{subtitle}</div>}
    </div>
  )
}

// ─── Settlement card ──────────────────────────────────────────────────────────

function SettlementCard({ month, opening, t, settlement, currency, onSettle, onUnsettle, hideAmounts }) {
  const closing = opening + t.income - t.expense
  const settled = Boolean(settlement)
  const stale = settled && (settlement.income !== t.income || settlement.expense !== t.expense || settlement.openingBalance !== opening)

  return (
    <div className="card card-pad settle-card">
      <div className="card-head">
        <span className="card-title">Month settlement</span>
        {settled && !stale && <span className="debt-tag settled"><IconCheck width={10} height={10} /> Settled</span>}
        {stale && <span className="debt-tag overdue">Needs update</span>}
      </div>
      <div className="settle-rows">
        <div className="settle-row"><span>Opening balance (carried in)</span><b className="num">{maskMoney(opening, currency, hideAmounts)}</b></div>
        <div className="settle-row"><span>Income this month</span><b className="num pos">+{maskMoney(t.income, currency, hideAmounts)}</b></div>
        <div className="settle-row"><span>Expenses this month</span><b className="num neg">&minus;{maskMoney(t.expense, currency, hideAmounts)}</b></div>
        <div className="settle-row total"><span>Closing balance</span><b className="num" style={{ color: closing >= 0 ? 'var(--income)' : 'var(--expense)' }}>{hideAmounts ? AMOUNT_MASK : (closing < 0 ? '−' : '') + fmtMoney(Math.abs(closing), currency)}</b></div>
      </div>
      {settled && (
        <p className="muted" style={{ fontSize: 11, margin: '8px 0 0' }}>
          {maskMoney(settlement.carryForward, currency, hideAmounts)} carried forward to {monthLabel(nextMonthKey(month))}.
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {!settled && (
          <button className="btn btn-primary btn-sm" onClick={() => onSettle(month, opening, t.income, t.expense)}>
            <IconLock /> Settle &amp; carry forward
          </button>
        )}
        {stale && (
          <button className="btn btn-primary btn-sm" onClick={() => onSettle(month, opening, t.income, t.expense)}>
            <IconCheck /> Update settlement
          </button>
        )}
        {settled && (
          <button className="btn btn-sm" onClick={() => onUnsettle(month)}>
            <IconUndo /> Undo settlement
          </button>
        )}
      </div>
    </div>
  )
}

function spendingStreak(transactions) {
  if (!transactions.length) return 0
  const days = new Set(transactions.map((t) => t.date))
  const today = todayISO()
  // If nothing logged today, start from yesterday — don't break streak just because
  // the user hasn't opened the app yet today
  let check = today
  if (!days.has(today)) {
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    check = d.toISOString().slice(0, 10)
  }
  let streak = 0
  while (days.has(check)) {
    streak++
    const d = new Date(check + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    check = d.toISOString().slice(0, 10)
  }
  return streak
}

function InsightsCard({ scoped, allTransactions, month, currency, hideAmounts }) {
  const cats = useMemo(() => byCategory(scoped, 'expense'), [scoped])
  const topCat = cats[0]

  const prevMonthKey = useMemo(() => {
    if (month === 'all') return null
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [month])

  const prevScoped = useMemo(() =>
    prevMonthKey ? filterByMonth(allTransactions, prevMonthKey) : [],
    [allTransactions, prevMonthKey]
  )
  const prevT = useMemo(() => totals(prevScoped), [prevScoped])
  const currentT = useMemo(() => totals(scoped), [scoped])
  const momChange = prevT.expense > 0 ? Math.round(((currentT.expense - prevT.expense) / prevT.expense) * 100) : null

  const biggestExpense = useMemo(() =>
    scoped.filter((t) => t.type === 'expense').sort((a, b) => b.amount - a.amount)[0], [scoped])

  const avgDaily = useMemo(() => {
    if (month === 'all' || currentT.expense === 0) return null
    const today = todayISO()
    const [y, m] = month.split('-').map(Number)
    const firstDay = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay = month < monthKey(today) ? new Date(y, m, 0).toISOString().slice(0, 10) : today
    const days = Math.max(1, Math.ceil((new Date(lastDay) - new Date(firstDay)) / 86400000) + 1)
    return currentT.expense / days
  }, [scoped, month, currentT.expense])

  const items = [
    topCat && { icon: CATEGORY_MAP[topCat.key]?.icon || '📦', label: 'Top spend', value: `${CATEGORY_MAP[topCat.key]?.label || topCat.name} · ${maskMoney(topCat.value, currency, hideAmounts)}` },
    momChange !== null && { icon: momChange > 0 ? '📈' : '📉', label: 'vs last month', value: `${momChange > 0 ? '+' : ''}${momChange}% expenses`, tone: momChange > 0 ? 'var(--expense)' : 'var(--income)' },
    biggestExpense && { icon: CATEGORY_MAP[biggestExpense.category]?.icon || '📦', label: 'Biggest expense', value: `${biggestExpense.note || CATEGORY_MAP[biggestExpense.category]?.label} · ${maskMoney(biggestExpense.amount, currency, hideAmounts)}` },
    avgDaily !== null && avgDaily > 0 && { icon: '📅', label: 'Avg daily spend', value: maskMoney(avgDaily, currency, hideAmounts) },
  ].filter(Boolean)

  if (!items.length) return null

  return (
    <div className="card card-pad">
      <div className="card-head">
        <span className="card-title">Spending insights</span>
        <IconBulb width={14} height={14} style={{ color: 'var(--ink-faint)' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', fontSize: 15, flexShrink: 0 }}>{item.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: item.tone || 'var(--ink)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CategoryBudgetAlerts({ scoped, categoryBudgets, currency, hideAmounts }) {
  const cats = useMemo(() => byCategory(scoped, 'expense'), [scoped])
  const alerts = cats
    .filter((c) => categoryBudgets[c.key] > 0)
    .map((c) => {
      const budget = categoryBudgets[c.key]
      const pct = Math.round((c.value / budget) * 100)
      return { ...c, budget, pct, over: pct >= 100, warn: pct >= 80 && pct < 100 }
    })
    .filter((c) => c.warn || c.over)
    .sort((a, b) => b.pct - a.pct)

  if (!alerts.length) return null

  return (
    <div className="card card-pad">
      <div className="card-head"><span className="card-title">Category budget alerts</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {alerts.map((a) => {
          const cat = CATEGORY_MAP[a.key]
          return (
            <div key={a.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{cat?.icon} {cat?.label || a.name}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: a.over ? 'var(--expense)' : '#e0a93b' }}>
                  {a.over ? `${a.pct - 100}% over` : `${a.pct}% used`}
                </span>
              </div>
              <div className="budget-bar-track">
                <div className="budget-bar-fill" style={{ width: `${Math.min(a.pct, 100)}%`, background: a.over ? 'var(--expense)' : '#e0a93b' }} />
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 3 }}>
                {maskMoney(a.value, currency, hideAmounts)} of {maskMoney(a.budget, currency, hideAmounts)} budget
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard({
  transactions, settlements, currency, monthlyBudget, categoryBudgets,
  month, onMonthChange, onAdd, onSettle, onUnsettle,
  hideAmounts, clockCountry, clockTimezone, clockFormat,
}) {
  const months = useMemo(() => listMonths(transactions), [transactions])
  const scoped = useMemo(() => filterByMonth(transactions, month), [transactions, month])
  const [showFilter, setShowFilter] = useState(false)

  const t = useMemo(() => totals(scoped), [scoped])
  const cats = useMemo(() => byCategory(scoped, 'expense'), [scoped])
  const methods = useMemo(() => byMethod(scoped, 'expense'), [scoped])
  const trend = useMemo(() => monthlyTrend(transactions, 6), [transactions])

  const isMonth = month !== 'all'
  const opening = useMemo(() => (isMonth ? openingBalance(month, settlements) : 0), [isMonth, month, settlements])
  const settlement = isMonth ? settlementFor(month, settlements) : null

  const heroBalance = isMonth ? opening + t.income - t.expense : t.balance
  const inflowPct = t.income + t.expense > 0 ? (t.income / (t.income + t.expense)) * 100 : 50
  const recent = scoped.slice(0, 5)

  const savingsRate = t.income > 0 ? Math.round(((t.income - t.expense) / t.income) * 100) : null
  const streak = useMemo(() => spendingStreak(transactions), [transactions])

  const currentMonthKey = monthKey(todayISO())
  const showBudget = monthlyBudget > 0 && isMonth && month === currentMonthKey
  const budgetPct = showBudget ? Math.min((t.expense / monthlyBudget) * 100, 100) : 0
  const budgetOver = showBudget && t.expense > monthlyBudget

  return (
    <div className="section">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h2 className="page-title">Dashboard</h2>
          {month !== 'all' && (
            <div style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 600, marginTop: 2 }}>
              {monthLabel(month)}
            </div>
          )}
        </div>

        {/* Clock + filter — same height, visually aligned */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
          <LiveClock clockCountry={clockCountry} clockTimezone={clockTimezone} clockFormat={clockFormat} />
          <button
            className="icon-btn"
            onClick={() => setShowFilter(true)}
            aria-label="Filter by period"
            title={month === 'all' ? 'All time' : monthLabel(month)}
            style={{
              position: 'relative',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '0 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              alignSelf: 'stretch', minHeight: 48,
            }}
          >
            <IconFilter width={18} height={18} />
            {month !== 'all' && (
              <span style={{
                position: 'absolute', top: -3, right: -3, width: 8, height: 8,
                borderRadius: '50%', background: 'var(--brand)', border: '2px solid var(--bg)',
              }} />
            )}
          </button>
        </div>
      </div>

      {showFilter && (
        <FilterSheet months={months} value={month} onChange={onMonthChange} onClose={() => setShowFilter(false)} />
      )}

      {/* Balance hero */}
      <div className="hero">
        <div className="hero-label">{isMonth ? `${monthLabel(month)} · closing balance` : 'Net balance · all time'}</div>
        <div className="hero-balance" style={{ color: heroBalance >= 0 ? 'var(--ink)' : 'var(--expense)' }}>
          {hideAmounts ? AMOUNT_MASK : (heroBalance < 0 ? '−' : '') + fmtMoney(Math.abs(heroBalance), currency)}
        </div>
        <div className="hero-meta">
          {isMonth && opening !== 0 ? `Opening ${hideAmounts ? AMOUNT_MASK : fmtMoney(opening, currency)} · ` : ''}
          {t.count} transaction{t.count === 1 ? '' : 's'}
        </div>
        <div className="flow" aria-hidden="true">
          <div className="flow-in" style={{ width: `${inflowPct}%` }} />
          <div className="flow-out" style={{ width: `${100 - inflowPct}%` }} />
        </div>
        <div className="flow-legend">
          <span><span className="dot" style={{ background: 'var(--income)' }} />Money in <b>{maskMoney(t.income, currency, hideAmounts)}</b></span>
          <span><span className="dot" style={{ background: 'var(--expense)' }} />Money out <b>{maskMoney(t.expense, currency, hideAmounts)}</b></span>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="stat-grid">
        <StatTile label="Income" value={maskMoney(t.income, currency, hideAmounts)} tone="var(--income)" tint="var(--income-tint)" icon={<IconUp />} />
        <StatTile label="Expenses" value={maskMoney(t.expense, currency, hideAmounts)} tone="var(--expense)" tint="var(--expense-tint)" icon={<IconDown />} />
        <StatTile
          label="Savings rate"
          value={hideAmounts ? AMOUNT_MASK : savingsRate !== null ? `${savingsRate}%` : '—'}
          tone={savingsRate !== null && savingsRate < 0 ? 'var(--expense)' : 'var(--income)'}
          tint={savingsRate !== null && savingsRate < 0 ? 'var(--expense-tint)' : 'var(--income-tint)'}
          icon="💰"
          subtitle={!hideAmounts && (
            savingsRate === null ? 'Log your first income to see your savings rate.' :
            savingsRate < 0 ? 'Outspending income — one cut changes everything.' :
            savingsRate === 0 ? 'Breaking even. A rupee saved is a rupee earned.' :
            savingsRate < 20 ? 'Small drops fill the ocean. Keep going.' :
            savingsRate < 50 ? 'Solid. Future you is building something real.' :
            'Half saved. Future you is very proud.'
          )}
        />
        <StatTile
          label="Day streak"
          value={`${streak}d`}
          tone="var(--ink)"
          tint="var(--surface-3)"
          icon="🔥"
          subtitle={
            streak === 0 ? 'Every streak starts with day 1. Today is the day.' :
            streak === 1 ? "Day 1 done. Show up again tomorrow!" :
            streak <= 3 ? "Building momentum. Don't break the chain!" :
            streak <= 6 ? "Almost a week! You're on fire." :
            streak <= 13 ? "One week strong. A habit is forming." :
            streak <= 29 ? "Two weeks in. Consistency is your superpower." :
            "A month and counting. Absolutely legendary."
          }
        />
      </div>

      {/* Monthly budget bar */}
      {showBudget && (
        <div className="card card-pad">
          <div className="card-head">
            <span className="card-title">Monthly budget</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: budgetOver ? 'var(--expense)' : 'var(--ink-soft)' }}>
              {maskMoney(t.expense, currency, hideAmounts)} / {maskMoney(monthlyBudget, currency, hideAmounts)}
            </span>
          </div>
          <div className="budget-bar-track">
            <div className="budget-bar-fill" style={{ width: `${budgetPct}%`, background: budgetOver ? 'var(--expense)' : budgetPct > 80 ? '#e0a93b' : 'var(--income)' }} />
          </div>
          <div style={{ marginTop: 5, fontSize: 11, color: budgetOver ? 'var(--expense)' : 'var(--ink-faint)', fontWeight: 600 }}>
            {hideAmounts ? AMOUNT_MASK : budgetOver
              ? `Over budget by ${fmtMoney(t.expense - monthlyBudget, currency)}`
              : `${fmtMoney(monthlyBudget - t.expense, currency)} remaining (${Math.round(100 - budgetPct)}%)`}
          </div>
        </div>
      )}

      {isMonth && categoryBudgets && Object.keys(categoryBudgets).length > 0 && (
        <CategoryBudgetAlerts scoped={scoped} categoryBudgets={categoryBudgets} currency={currency} hideAmounts={hideAmounts} />
      )}

      {isMonth && (
        <SettlementCard
          month={month} opening={opening} t={t} settlement={settlement} currency={currency}
          onSettle={onSettle} onUnsettle={onUnsettle} hideAmounts={hideAmounts}
        />
      )}

      {/* Charts */}
      <div className="grid-2">
        <div className="card card-pad">
          <div className="card-head"><span className="card-title">Spending by category</span></div>
          {cats.length
            ? <CategoryDonut data={cats} currency={currency} total={t.expense} hideAmounts={hideAmounts} />
            : <div className="empty" style={{ padding: '18px 0' }}><p>No expenses in this period.</p></div>}
        </div>
        <div className="card card-pad">
          <div className="card-head"><span className="card-title">By payment method</span></div>
          {methods.length
            ? <MethodChart data={methods} currency={currency} hideAmounts={hideAmounts} />
            : <div className="empty" style={{ padding: '18px 0' }}><p>No expenses in this period.</p></div>}
        </div>
      </div>

      <div className="card card-pad">
        <div className="card-head">
          <span className="card-title">Income vs expense · last 6 months</span>
          <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--ink-soft)' }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--income)', marginRight: 5 }} />In</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--expense)', marginRight: 5 }} />Out</span>
          </div>
        </div>
        <TrendChart data={trend} currency={currency} hideAmounts={hideAmounts} />
      </div>

      {scoped.length > 0 && (
        <InsightsCard scoped={scoped} allTransactions={transactions} month={month} currency={currency} hideAmounts={hideAmounts} />
      )}

      <div className="card card-pad">
        <div className="card-head"><span className="card-title">Recent activity</span></div>
        {recent.length ? (
          <div className="tx-list">
            {recent.map((tx) => {
              const cat = CATEGORY_MAP[tx.category] || { label: tx.category, icon: '•' }
              const m = METHOD_MAP[tx.method] || { label: tx.method }
              const inc = tx.type === 'income'
              return (
                <div className="tx" key={tx.id}>
                  <div className="tx-ico" style={{ background: inc ? 'var(--income-tint)' : 'var(--surface-2)' }}>{cat.icon}</div>
                  <div className="tx-main">
                    <div className="tx-cat">{cat.label}</div>
                    <div className="tx-sub"><span className="tx-method">{m.label}</span></div>
                  </div>
                  <div className={'tx-amt ' + (inc ? 'pos' : 'neg')}>{hideAmounts ? AMOUNT_MASK : (inc ? '+' : '−') + fmtMoney(tx.amount, currency)}</div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty" style={{ padding: '20px 0' }}>
            <div className="empty-ico"><IconWallet width={22} height={22} /></div>
            <h3>Nothing here yet</h3>
            <p style={{ marginBottom: 12 }}>Add a transaction to see it on your dashboard.</p>
            <button className="btn btn-primary btn-sm" onClick={onAdd}>Add transaction</button>
          </div>
        )}
      </div>
    </div>
  )
}
