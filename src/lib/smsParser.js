// Parse Indian bank SMS / notification text into a pending transaction object.
// Works with HDFC, SBI, ICICI, Axis, Kotak, PNB, Yes Bank, UPI formats.

const DEBIT_PATTERNS = [
  /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)\s+(?:debited|spent|deducted|withdrawn|sent)/i,
  /(?:debited|paid|spent|sent)\s+(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?).*?(?:has been |is )?(?:debited|deducted)/i,
  /purchase\s+of\s+(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /withdrawn\s+(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
]

const CREDIT_PATTERNS = [
  /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)\s+(?:credited|received|deposited|added)/i,
  /(?:credited|received|deposited)\s+(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?).*?(?:has been |is )?credited/i,
  /refund\s+of\s+(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
]

function cleanAmount(str) {
  return parseFloat(str.replace(/,/g, ''))
}

function extractMerchant(text) {
  const patterns = [
    /(?:at|to|in|for)\s+([A-Z][A-Za-z0-9 &.'/-]{2,30}?)(?:\s+on\b|\s+via\b|\s+ref|\.|,|$)/i,
    /VPA\s+[\w.@-]+(?:\s+to\s+([\w\s]{2,25}))?/i,
    /(?:UPI[-\s]?[Rr]ef\b|txn\b|ref\b)[:\s#]?\w+\s+(?:to\s+)?([\w\s]{2,25})/i,
    /(?:info|narration|description):\s*([A-Za-z0-9 &.'/-]{3,35})/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    const name = m?.[1]?.trim()
    if (name && name.length > 1) return name
  }
  return ''
}

function detectMethod(text) {
  const t = text.toLowerCase()
  if (t.includes('upi')) return 'upi'
  if (t.includes('credit card') || t.includes('cc ')) return 'credit_card'
  if (t.includes('debit card') || t.includes('dc ')) return 'debit_card'
  if (t.includes('neft') || t.includes('imps') || t.includes('rtgs') || t.includes('net banking')) return 'net_banking'
  if (t.includes('wallet') || t.includes('paytm') || t.includes('phonepe') || t.includes('gpay')) return 'wallet'
  return 'net_banking'
}

function detectCategory(type, text) {
  if (type === 'income') {
    const t = text.toLowerCase()
    if (t.includes('salary') || t.includes('payroll')) return 'salary'
    if (t.includes('refund') || t.includes('cashback')) return 'refund'
    if (t.includes('freelance') || t.includes('invoice')) return 'freelance'
    return 'other_income'
  }
  const t = text.toLowerCase()
  if (t.includes('zomato') || t.includes('swiggy') || t.includes('restaurant') || t.includes('food')) return 'food'
  if (t.includes('bigbasket') || t.includes('grocer') || t.includes('kirana')) return 'groceries'
  if (t.includes('uber') || t.includes('ola') || t.includes('metro') || t.includes('fuel') || t.includes('petrol')) return 'transport'
  if (t.includes('amazon') || t.includes('flipkart') || t.includes('myntra') || t.includes('shop')) return 'shopping'
  if (t.includes('electricity') || t.includes('internet') || t.includes('mobile') || t.includes('bill') || t.includes('recharge')) return 'bills'
  if (t.includes('rent') || t.includes('maintenance') || t.includes('housing')) return 'rent'
  if (t.includes('hospital') || t.includes('pharmacy') || t.includes('medical') || t.includes('doctor')) return 'health'
  if (t.includes('movie') || t.includes('netflix') || t.includes('spotify') || t.includes('entertainment')) return 'entertainment'
  return 'other_expense'
}

export function parseSms(text) {
  if (!text || text.trim().length < 8) return null

  // Try debit patterns first
  for (const pattern of DEBIT_PATTERNS) {
    const m = text.match(pattern)
    if (m) {
      const amount = cleanAmount(m[1])
      if (!amount || amount <= 0 || amount > 10000000) continue
      const merchant = extractMerchant(text)
      return {
        type: 'expense',
        amount,
        note: merchant || 'SMS transaction',
        category: detectCategory('expense', text),
        method: detectMethod(text),
        rawSms: text.slice(0, 300),
      }
    }
  }

  // Try credit patterns
  for (const pattern of CREDIT_PATTERNS) {
    const m = text.match(pattern)
    if (m) {
      const amount = cleanAmount(m[1])
      if (!amount || amount <= 0 || amount > 10000000) continue
      const merchant = extractMerchant(text)
      return {
        type: 'income',
        amount,
        note: merchant || 'SMS credit',
        category: detectCategory('income', text),
        method: detectMethod(text),
        rawSms: text.slice(0, 300),
      }
    }
  }

  return null
}
