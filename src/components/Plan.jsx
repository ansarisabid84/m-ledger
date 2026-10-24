import Goals from './Goals'
import Debts from './Debts'
import Bills from './Bills'

const SECTIONS = [
  ['goals', '🎯 Goals'],
  ['debts', '🤝 Debts'],
  ['bills', '🔁 Bills'],
]

// "Plan" groups everything forward-looking — savings goals, money owed, recurring bills — under one tab.
export default function Plan({ section, onSection, goalsProps, debtsProps, billsProps }) {
  return (
    <div className="section">
      <div>
        <div className="eyebrow">Look ahead</div>
        <h2 className="page-title">Plan</h2>
      </div>
      <div className="seg seg-full" role="tablist">
        {SECTIONS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={section === id} className={section === id ? 'active' : ''} onClick={() => onSection(id)}>{label}</button>
        ))}
      </div>
      {section === 'goals' && <Goals {...goalsProps} />}
      {section === 'debts' && <Debts {...debtsProps} />}
      {section === 'bills' && <Bills {...billsProps} />}
    </div>
  )
}
