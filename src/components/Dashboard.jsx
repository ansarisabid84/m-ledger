import { useMemo } from 'react'
import { totals, byCategory, byMethod, monthlyTrend, filterByMonth, listMonths } from '../lib/stats'
import { fmtMoney, monthLabel } from '../lib/format'
import { CATEGORY_MAP, METHOD_MAP } from '../lib/constants'
import { settlementFor, openingBalance, nextMonthKey } from '../lib/settlements'
import { CategoryDonut, TrendChart, MethodChart } from './Charts'
import MonthNav from './MonthNav'
import { IconUp, IconDown, IconWallet, IconLock, IconUndo, IconCheck } from './icons'

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
        {settled && !stale && <span className="debt-tag settled"><IconCheck width={13} height={13} /> Settled</span>}
        {stale && <span className="debt-tag overdue">Needs update</span>}
      </div>

      <div className="settle-rows">
        <div className="settle-row"><span>Opening balance (carried in)</span><b className="num">{fmtMoney(opening, currency)}</b></div>
        <div className="settle-row"><span>Income this month</span><b className="num pos">+{fmtMoney(t.income, currency)}</b></div>
        <div className="settle-row"><span>Expenses this month</span><b className="num neg">&minus;{fmtMoney(t.expense, currency)}</b></div>
        <div className="settle-row total"><span>Closing balance</span><b className="num" style={{ color: closing >= 0 ? 'var(--income)' : 'var(--expense)' }}>{closing < 0 ? '−' : ''}{fmtMoney(Math.abs(closing), currency)}</b></div>
      </div>

      {settled && (
        <p className="muted" style={{ fontSize: 12.5, margin: '10px 0 0' }}>
          {fmtMoney(settlement.carryForward, currency)} carried forward to {monthLabel(nextMonthKey(month))}.
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
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

export default function Dashboard({ transactions, settlements, currency, month, onMonthChange, onAdd, onSettle, onUnsettle }) {
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

  return (
    <div className="section">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">Overview</div>
          <h2 className="page-title">Dashboard</h2>
        </div>
        <MonthNav months={months} value={month} onChange={onMonthChange} />
      </div>

      {/* Balance hero */}
      <div className="hero">
        <div className="hero-label">{isMonth ? `${month === 'all' ? '' : monthLabel(month)} · closing balance` : 'Net balance · all time'}</div>
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
      </div>

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
            <div className="empty" style={{ padding: '24px 0' }}><p>No expenses in this period.</p></div>
          )}
        </div>

        <div className="card card-pad">
          <div className="card-head"><span className="card-title">By payment method</span></div>
          {methods.length ? (
            <MethodChart data={methods} currency={currency} />
          ) : (
            <div className="empty" style={{ padding: '24px 0' }}><p>No expenses in this period.</p></div>
          )}
        </div>
      </div>

      <div className="card card-pad">
        <div className="card-head">
          <span className="card-title">Income vs expense · last 6 months</span>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--ink-soft)' }}>
            <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: 'var(--income)', marginRight: 6 }} />In</span>
            <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: 'var(--expense)', marginRight: 6 }} />Out</span>
          </div>
        </div>
        <TrendChart data={trend} currency={currency} />
      </div>

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
          <div className="empty" style={{ padding: '24px 0' }}>
            <div className="empty-ico"><IconWallet width={28} height={28} /></div>
            <h3>Nothing here yet</h3>
            <p style={{ marginBottom: 16 }}>Add a transaction to see it on your dashboard.</p>
            <button className="btn btn-primary" onClick={onAdd}>Add transaction</button>
          </div>
        )}
      </div>
    </div>
  )
}
