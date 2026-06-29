import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { fmtMoney, fmtCompact, maskMoney, AMOUNT_MASK } from '../lib/format'
import { CHART_COLORS } from '../lib/constants'

function TipBox({ rows, title }) {
  return (
    <div className="rc-tip">
      {title && <div className="k" style={{ marginBottom: 4 }}>{title}</div>}
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {r.color && <span className="sw" style={{ width: 9, height: 9, borderRadius: 2, background: r.color }} />}
          <span className="k">{r.label}</span>
          <span className="v" style={{ marginLeft: 'auto', color: r.color || 'var(--ink)' }}>{r.value}</span>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Category donut ---------------- */
export function CategoryDonut({ data, currency, total, hideAmounts }) {
  if (!data.length) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 16, alignItems: 'center' }}>
      <div style={{ position: 'relative', height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={70}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
            {!hideAmounts && (
              <Tooltip
                content={({ active, payload }) =>
                  active && payload && payload.length ? (
                    <TipBox
                      rows={[{
                        label: payload[0].payload.name,
                        value: fmtMoney(payload[0].value, currency),
                        color: payload[0].payload.color,
                      }]}
                    />
                  ) : null
                }
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', pointerEvents: 'none' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Spent</div>
            <div className="num" style={{ fontWeight: 700, fontSize: 16 }}>
              {hideAmounts ? AMOUNT_MASK : fmtCompact(total, currency)}
            </div>
          </div>
        </div>
      </div>
      <div className="legend">
        {data.slice(0, 6).map((d) => (
          <div className="legend-row" key={d.key}>
            <span className="sw" style={{ background: d.color }} />
            <span className="lname">{d.icon} {d.name}</span>
            <span className="lval">{hideAmounts ? AMOUNT_MASK : fmtCompact(d.value, currency)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------- Monthly trend (grouped bars) ---------------- */
export function TrendChart({ data, currency, hideAmounts }) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data} margin={{ top: 6, right: 4, left: -16, bottom: 0 }} barGap={4}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-faint)', fontSize: 12 }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tick={{ fill: 'var(--ink-faint)', fontSize: 11 }}
          tickFormatter={(v) => hideAmounts ? AMOUNT_MASK : fmtCompact(v, currency)}
        />
        {!hideAmounts && (
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            content={({ active, payload, label }) =>
              active && payload && payload.length ? (
                <TipBox
                  title={label}
                  rows={payload.map((p) => ({
                    label: p.dataKey === 'income' ? 'Income' : 'Expense',
                    value: fmtMoney(p.value, currency),
                    color: p.fill,
                  }))}
                />
              ) : null
            }
          />
        )}
        <Bar dataKey="income" fill="var(--income)" radius={[5, 5, 0, 0]} maxBarSize={26} />
        <Bar dataKey="expense" fill="var(--expense)" radius={[5, 5, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ---------------- Payment method (horizontal bars) ---------------- */
export function MethodChart({ data, currency, hideAmounts }) {
  if (!data.length) return null
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 42)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={96}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--ink-soft)', fontSize: 12.5 }}
        />
        {!hideAmounts && (
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            content={({ active, payload }) =>
              active && payload && payload.length ? (
                <TipBox rows={[{ label: payload[0].payload.name, value: fmtMoney(payload[0].value, currency), color: payload[0].payload.color }]} />
              ) : null
            }
          />
        )}
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {data.map((d, i) => (
            <Cell key={d.key} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
