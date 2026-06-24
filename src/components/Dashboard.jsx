import { useMemo } from 'react'
import { totals, byCategory, byMethod, monthlyTrend, filterByMonth, listMonths } from '../lib/stats'
import { fmtMoney, monthLabel, monthKey, todayISO } from '../lib/format'
import { CATEGORY_MAP, METHOD_MAP, EXPENSE_CATEGORIES } from '../lib/constants'
import { settlementFor, openingBalance, nextMonthKey } from '../lib/settlements'
import { CategoryDonut, TrendChart, MethodChart } from './Charts'
import MonthNav from './MonthNav'
import { IconUp, IconDown, IconWallet, IconLock, IconUndo, IconCheck, IconBulb } from './icons'

function StatTile({ label, value, tone, icon, tint }) {
  return (
    <div className="stat">
      <div className="stat-top">
        <span className="stat-badge" style={{ background: tint, color: tone }}>{icon}</span>
        {label}
      </div>
      <div className="stat-val num" style={{ color: tone }}>{value}</div>
    </div>
  )
}

function SettlementCard({ month, opening, t, settlement, currency, onSettle, onUnsettle }) {
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
        <div className="settle-row"><span>Opening balance (carried in)</span><b className="num">{fmtMoney(opening, currency)}</b></div>
        <div className="settle-row"><span>Income this month</span><b className="num pos">+{fmtMoney(t.income, currency)}</b></div>
        <div className="settle-row"><span>Expenses this month</span><b className="num neg">&minus;{fmtMoney(t.expense, currency)}</b></div>
        <div className="settle-row total"><span>Closing balance</span><b className="num" style={{ color: closing >= 0 ? 'var(--income)' : 'var(--expense)' }}>{closing < 0 ? '−' : ''}{fmtMoney(Math.abs(closing), currency)}</b></div>
      </div>

      {settled && (
        <p className="muted" style={{ fontSize: 11, margin: '8px 0 0' }}>
          {fmtMoney(settlement.carryForward, currency)} carried forward to {monthLabel(nextMonthKey(month))}.
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
  let streak = 0
  const today = todayISO()
  let check = today
  while (days.has(check)) {
    streak++
    const d = new Date(check + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    check = d.toISOString().slice(0, 10)
  }
  return streak
}

function InsightsCard({ scoped, allTransactions, month, currency }) {
  const cats = useMemo(() => byCategory(scoped, 'expense'), [scoped])
  const topCat = cats[0]

  // Month-over-month comparison
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

  const momChange = prevT.expense > 0
    ? Math.round(((currentT.expense - prevT.expense) / prevT.expense) * 100)
    : null

  // Biggest single expense
  const biggestExpense = useMemo(() =>
    scoped.filter((t) => t.type === 'expense').sort((a, b) => b.amount - a.amount)[0],
    [scoped]
  )

  // Average daily spend (days elapsed this month or total days for past months)
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
    topCat && {
      icon: CATEGORY_MAP[topCat.key]?.icon || '📦',
      label: 'Top spend',
      value: `${CATEGORY_MAP[topCat.key]?.label || topCat.name} · ${fmtMoney(topCat.value, currency)}`,
    },
    momChange !== null && {
      icon: momChange > 0 ? '📈' : '📉',
      label: 'vs last month',
      value: `${momChange > 0 ? '+' : ''}${momChange}% expenses`,
      tone: momChange > 0 ? 'var(--expense)' : 'var(--income)',
    },
    biggestExpense && {
      icon: CATEGORY_MAP[biggestExpense.category]?.icon || '📦',
      label: 'Biggest expense',
      value: `${biggestExpense.note || CATEGORY_MAP[biggestExpense.category]?.label} · ${fmtMoney(biggestExpense.amount, currency)}`,
    },
    avgDaily !== null && avgDaily > 0 && {
      icon: '📅',
      label: 'Avg daily spend',
      value: fmtMoney(avgDaily, currency),
    },
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
            <div style={{
              width: 30, height: 30, borderRadius: 8, background: 'var(--surface-2)',
              display: 'grid', placeItems: 'center', fontSize: 15, flexShrink: 0,
            }}>{item.icon}</div>
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

function CategoryBudgetAlerts({ scoped, categoryBudgets, currency }) {
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
                <div className="budget-bar-fill" style={{
                  width: `${Math.min(a.pct, 100)}%`,
                  background: a.over ? 'var(--expense)' : '#e0a93b',
                }} />
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 3 }}>
                {fmtMoney(a.value, currency)} of {fmtMoney(a.budget, currency)} budget
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Dashboard({ transactions, settlements, currency, monthlyBudget, categoryBudgets, month, onMonthChange, onAdd, onSettle, onUnsettle }) {
  const months = useMemo(() => listMonths(transactions), [transactions])
  const scoped = useMemo(() => filterByMonth(transactions, month), [transactions, month])

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
          <div className="eyebrow">Overview</div>
          <h2 className="page-title">Dashboard</h2>
        </div>
        <MonthNav months={months} value={month} onChange={onMonthChange} />
      </div>

      {/* Balance hero */}
      <div className="hero">
        <div className="hero-label">{isMonth ? `${monthLabel(month)} · closing balance` : 'Net balance · all time'}</div>
        <div className="hero-balance" style={{ color: heroBalance >= 0 ? 'var(--ink)' : 'var(--expense)' }}>
          {heroBalance < 0 ? '−' : ''}{fmtMoney(Math.abs(heroBalance), currency)}
        </div>
        <div className="hero-meta">
          {isMonth && opening !== 0 ? `Opening ${fmtMoney(opening, currency)} · ` : ''}
          {t.count} transaction{t.count === 1 ? '' : 's'}
        </div>

        <div className="flow" aria-hidden="true">
          <div className="flow-in" style={{ width: `${inflowPct}%` }} />
          <div className="flow-out" style={{ width: `${100 - inflowPct}%` }} />
        </div>
        <div className="flow-legend">
          <span><span className="dot" style={{ background: 'var(--income)' }} />Money in <b>{fmtMoney(t.income, currency)}</b></span>
          <span><span className="dot" style={{ background: 'var(--expense)' }} />Money out <b>{fmtMoney(t.expense, currency)}</b></span>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="stat-grid">
        <StatTile label="Income" value={fmtMoney(t.income, currency)} tone="var(--income)" tint="var(--income-tint)" icon={<IconUp />} />
        <StatTile label="Expenses" value={fmtMoney(t.expense, currency)} tone="var(--expense)" tint="var(--expense-tint)" icon={<IconDown />} />
        {savingsRate !== null && (
          <StatTile
            label="Savings rate"
            value={`${savingsRate}%`}
            tone={savingsRate >= 0 ? 'var(--income)' : 'var(--expense)'}
            tint={savingsRate >= 0 ? 'var(--income-tint)' : 'var(--expense-tint)'}
            icon="💰"
          />
        )}
        {streak > 0 && (
          <StatTile label="Day streak" value={`${streak}d`} tone="var(--ink)" tint="var(--surface-3)" icon="🔥" />
        )}
      </div>

      {/* Monthly budget bar */}
      {showBudget && (
        <div className="card card-pad">
          <div className="card-head">
            <span className="card-title">Monthly budget</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: budgetOver ? 'var(--expense)' : 'var(--ink-soft)' }}>
              {fmtMoney(t.expense, currency)} / {fmtMoney(monthlyBudget, currency)}
            </span>
          </div>
          <div className="budget-bar-track">
            <div
              className="budget-bar-fill"
              style={{
                width: `${budgetPct}%`,
                background: budgetOver ? 'var(--expense)' : budgetPct > 80 ? '#e0a93b' : 'var(--income)',
              }}
            />
          </div>
          <div style={{ marginTop: 5, fontSize: 11, color: budgetOver ? 'var(--expense)' : 'var(--ink-faint)', fontWeight: 600 }}>
            {budgetOver
              ? `Over budget by ${fmtMoney(t.expense - monthlyBudget, currency)}`
              : `${fmtMoney(monthlyBudget - t.expense, currency)} remaining (${Math.round(100 - budgetPct)}%)`}
          </div>
        </div>
      )}

      {/* Category budget alerts */}
      {isMonth && categoryBudgets && Object.keys(categoryBudgets).length > 0 && (
        <CategoryBudgetAlerts scoped={scoped} categoryBudgets={categoryBudgets} currency={currency} />
      )}

      {/* Settlement (month view only) */}
      {isMonth && (
        <SettlementCard
          month={month}
          opening={opening}
          t={t}
          settlement={settlement}
          currency={currency}
          onSettle={onSettle}
          onUnsettle={onUnsettle}
        />
      )}

      {/* Charts */}
      <div className="grid-2">
        <div className="card card-pad">
          <div className="card-head"><span className="card-title">Spending by category</span></div>
          {cats.length ? (
            <CategoryDonut data={cats} currency={currency} total={t.expense} />
          ) : (
            <div className="empty" style={{ padding: '18px 0' }}><p>No expenses in this period.</p></div>
          )}
        </div>

        <div className="card card-pad">
          <div className="card-head"><span className="card-title">By payment method</span></div>
          {methods.length ? (
            <MethodChart data={methods} currency={currency} />
          ) : (
            <div className="empty" style={{ padding: '18px 0' }}><p>No expenses in this period.</p></div>
          )}
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
        <TrendChart data={trend} currency={currency} />
      </div>

      {/* Spending insights */}
      {scoped.length > 0 && (
        <InsightsCard scoped={scoped} allTransactions={transactions} month={month} currency={currency} />
      )}

      {/* Recent */}
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
                  <div className={'tx-amt ' + (inc ? 'pos' : 'neg')}>{inc ? '+' : '−'}{fmtMoney(tx.amount, currency)}</div>
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
