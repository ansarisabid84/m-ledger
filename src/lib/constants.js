// Categories, payment methods, and shared constants.

export const CHART_COLORS = [
  '#0e9f6e', '#e0a93b', '#e5594e', '#5b6cf0',
  '#9b5bd6', '#3fa9d6', '#6fb23f', '#e07b3b',
]

export const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', icon: '📲' },
  { id: 'credit_card', label: 'Credit Card', icon: '💳' },
  { id: 'debit_card', label: 'Debit Card', icon: '🏧' },
  { id: 'cash', label: 'Cash', icon: '💵' },
  { id: 'net_banking', label: 'Net Banking', icon: '🏦' },
  { id: 'wallet', label: 'Wallet', icon: '👛' },
]

export const METHOD_MAP = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.id, m]))

export const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Food & Dining', icon: '🍽️' },
  { id: 'groceries', label: 'Groceries', icon: '🛒' },
  { id: 'transport', label: 'Transport', icon: '🚕' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'bills', label: 'Bills & Utilities', icon: '🧾' },
  { id: 'rent', label: 'Rent & Home', icon: '🏠' },
  { id: 'health', label: 'Health', icon: '💊' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { id: 'education', label: 'Education', icon: '📚' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'other_expense', label: 'Other', icon: '📦' },
]

export const INCOME_CATEGORIES = [
  { id: 'salary', label: 'Salary', icon: '💼' },
  { id: 'business', label: 'Business', icon: '🧮' },
  { id: 'investment', label: 'Investments', icon: '📈' },
  { id: 'freelance', label: 'Freelance', icon: '🧑‍💻' },
  { id: 'gift', label: 'Gift', icon: '🎁' },
  { id: 'refund', label: 'Refund', icon: '↩️' },
  { id: 'other_income', label: 'Other', icon: '➕' },
]

export const CATEGORY_MAP = Object.fromEntries(
  [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c.id, c])
)

export function categoriesFor(type) {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', locale: 'en-IN' },
  { code: 'USD', symbol: '$', locale: 'en-US' },
  { code: 'EUR', symbol: '€', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', locale: 'ja-JP' },
  { code: 'AED', symbol: 'د.إ', locale: 'ar-AE' },
]
export const CURRENCY_MAP = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]))
