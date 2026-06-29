// Parse bank SMS / notification text into a pending transaction object.
// Covers Indian banks (HDFC, SBI, ICICI, Axis, Kotak, PNB, Yes Bank, UPI)
// and Nepali banks (NMB, Global IME, Himalayan, Sanima, Citizens, etc.).

const CURRENCY_RE = /(?:Rs\.?|NPR|INR|₹|रू|NRs\.?)\s*/i

const DEBIT_PATTERNS = [
  // "debited/spent/deducted with/by Rs X"
  /(?:Rs\.?|NPR|INR|₹|रू|NRs\.?)\s*([\d,]+(?:\.\d{1,2})?)\s+(?:has been\s+)?(?:debited|spent|deducted|withdrawn|sent|paid)/i,
  /(?:debited|paid|spent|sent|deducted|withdrawn)\s+(?:Rs\.?|NPR|INR|₹|रू|NRs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:Rs\.?|NPR|INR|₹|रू|NRs\.?)\s*([\d,]+(?:\.\d{1,2})?)[\s\S]{0,60}?(?:has been\s+|is\s+)?(?:debited|deducted|paid)/i,
  // "a/c / account debited by/with Rs X"
  /(?:a\/c|acct|account)[^.]{0,40}?(?:debited|deducted)\s+(?:by|with|of)\s+(?:Rs\.?|NPR|INR|₹|रू|NRs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  // "purchase of Rs X"
  /purchase\s+of\s+(?:Rs\.?|NPR|INR|₹|रू|NRs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  // "withdrawn Rs X" / "ATM withdrawal Rs X"
  /(?:ATM\s+)?withdraw[nal]{0,2}\s+(?:of\s+)?(?:Rs\.?|NPR|INR|₹|रू|NRs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  // "POS txn / transaction Rs X"
  /POS\s+(?:purchase|txn|transaction)?\s+(?:of\s+)?(?:Rs\.?|NPR|INR|₹|रू|NRs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  // "amount Rs X has been transferred/debited"
  /(?:amount|amt)\s+(?:of\s+)?(?:Rs\.?|NPR|INR|₹|रू|NRs\.?)?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:has been\s+)?(?:transferred|debited|paid|sent)/i,
  // "Dr Rs X" or "DR: Rs X" (bank statement style)
  /\bDr[.: ]+(?:Rs\.?|NPR|INR|₹|रू|NRs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  // "Rs X charged" / "Rs X deducted"
  /(?:Rs\.?|NPR|INR|₹|रू|NRs\.?)\s*([\d,]+(?:\.\d{1,2})?)\s+(?:charged|deducted)\b/i,
  // Nepali: "रु X डेबिट"
  /(?:रू|NPR|NRs\.?)\s*([\d,]+(?:\.\d{1,2})?)\s+(?:debited|डेबिट)/i,
]

const CREDIT_PATTERNS = [
  /(?:Rs\.?|NPR|INR|₹|रू|NRs\.?)\s*([\d,]+(?:\.\d{1,2})?)\s+(?:has been\s+)?(?:credited|received|deposited|added)/i,
  /(?:credited|received|deposited|added)\s+(?:Rs\.?|NPR|INR|₹|रू|NRs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:Rs\.?|NPR|INR|₹|रू|NRs\.?)\s*([\d,]+(?:\.\d{1,2})?)[\s\S]{0,60}?(?:has been\s+|is\s+)?credited/i,
  /refund\s+of\s+(?:Rs\.?|NPR|INR|₹|रू|NRs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  // "a/c credited with Rs X"
  /(?:a\/c|acct|account)[^.]{0,40}?credited\s+(?:with|by)?\s+(?:Rs\.?|NPR|INR|₹|रू|NRs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  // "Cr Rs X"
  /\bCr[.: ]+(?:Rs\.?|NPR|INR|₹|रू|NRs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  // "Rs X credited"
  /(?:Rs\.?|NPR|INR|₹|रू|NRs\.?)\s*([\d,]+(?:\.\d{1,2})?)\s+(?:credited|deposited)\b/i,
  // Salary/transfer credited
  /salary\s+(?:of\s+)?(?:Rs\.?|NPR|INR|₹|रू|NRs\.?)?\s*([\d,]+(?:\.\d{1,2})?)(?:\s+(?:has been\s+)?credited)?/i,
]

function cleanAmount(str) {
  return parseFloat(String(str).replace(/,/g, ''))
}

function extractMerchant(text) {
  const patterns = [
    // "at/to/in/for MERCHANT on/via/ref"
    /(?:at|to|in|for)\s+([A-Z][A-Za-z0-9 &.'\/\-]{2,35}?)(?:\s+on\b|\s+via\b|\s+ref\b|\s+using\b|\.|,|$)/i,
    // "merchant: NAME"
    /(?:merchant|payee|beneficiary|name)[:\s]+([A-Za-z0-9 &.'\/\-]{3,35})/i,
    // VPA payment, extract the UPI handle
    /(?:VPA|UPI ID)\s+([\w.\-@]+)/i,
    // "transferred to NAME"
    /(?:transferred|sent|paid)\s+to\s+([A-Za-z0-9 &.'\/\-]{3,35}?)(?:\s+via|\s+using|\s+on\b|\.|,|$)/i,
    // "info/narration/description: TEXT"
    /(?:info|narration|description|remark)[:\s]+([A-Za-z0-9 &.'\/\-]{3,40})/i,
    // "UPI ref ... to NAME"
    /(?:UPI[-\s]?[Rr]ef\b|txn\b|ref\b)[:\s#]?\w+\s+(?:to\s+)?([\w\s]{2,30})/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    const name = m?.[1]?.trim()
    if (name && name.length > 1 && !/^\d+$/.test(name)) return name.replace(/\s+/g, ' ')
  }
  return ''
}

function detectMethod(text) {
  const t = text.toLowerCase()
  if (t.includes('upi')) return 'upi'
  if (t.includes('ips') || t.includes('connectips')) return 'net_banking'
  if (t.includes('credit card') || t.includes('cc ') || /\bcc\d{4}\b/.test(t)) return 'credit_card'
  if (t.includes('debit card') || t.includes('dc ') || /\bdc\d{4}\b/.test(t)) return 'debit_card'
  if (t.includes('neft') || t.includes('imps') || t.includes('rtgs') || t.includes('net banking') || t.includes('online transfer')) return 'net_banking'
  if (t.includes('wallet') || t.includes('paytm') || t.includes('phonepe') || t.includes('gpay') || t.includes('khalti') || t.includes('esewa')) return 'wallet'
  if (t.includes('atm') || t.includes('cash')) return 'cash'
  return 'net_banking'
}

function detectCategory(type, text) {
  if (type === 'income') {
    const t = text.toLowerCase()
    if (t.includes('salary') || t.includes('payroll') || t.includes('wages')) return 'salary'
    if (t.includes('refund') || t.includes('cashback') || t.includes('reversal')) return 'refund'
    if (t.includes('freelance') || t.includes('invoice') || t.includes('payment received')) return 'freelance'
    if (t.includes('dividend') || t.includes('interest') || t.includes('mutual fund')) return 'investment'
    if (t.includes('gift') || t.includes('bonus')) return 'gift'
    return 'other_income'
  }
  const t = text.toLowerCase()
  // Food & Dining
  if (/zomato|swiggy|ubereats|restaurant|dhaba|hotel|cafe|cafeteria|food|dining|pizza|burger|biryani|thali|canteen/.test(t)) return 'food'
  // Groceries
  if (/bigbasket|grocer|kirana|supermarket|mart|bazar|bazaar|vegetable|fruit|grocery/.test(t)) return 'groceries'
  // Transport
  if (/uber|ola|rapido|metro|fuel|petrol|diesel|pump|parking|toll|bus|taxi|cab|auto|rickshaw|flight|railway|train/.test(t)) return 'transport'
  // Shopping
  if (/amazon|flipkart|myntra|meesho|ajio|nykaa|shop|store|fashion|cloth|apparel|purchase/.test(t)) return 'shopping'
  // Bills & Utilities
  if (/electricity|internet|broadband|mobile|recharge|bill|utility|water|gas|wifi|telephone|postpaid|prepaid/.test(t)) return 'bills'
  // Rent
  if (/rent|maintenance|housing|society|flat|apartment|lease/.test(t)) return 'rent'
  // Health
  if (/hospital|pharmacy|medical|doctor|clinic|health|medicine|lab|diagnostic|apollo|chemist/.test(t)) return 'health'
  // Entertainment
  if (/movie|netflix|spotify|amazon prime|hotstar|youtube|entertainment|game|concert|pvr|inox/.test(t)) return 'entertainment'
  // Education
  if (/school|college|university|tuition|course|fee|exam|book|stationery|library/.test(t)) return 'education'
  // Travel
  if (/hotel|resort|airbnb|booking|makemytrip|yatra|holiday|trip|tour|visa|passport/.test(t)) return 'travel'
  return 'other_expense'
}

export function parseSms(text) {
  if (!text || text.trim().length < 8) return null
  const trimmed = text.trim()

  // Try debit patterns first
  for (const pattern of DEBIT_PATTERNS) {
    const m = trimmed.match(pattern)
    if (m) {
      const amount = cleanAmount(m[1])
      if (!amount || amount <= 0 || amount > 10000000) continue
      const merchant = extractMerchant(trimmed)
      return {
        type: 'expense',
        amount,
        note: merchant || '',
        category: detectCategory('expense', trimmed),
        method: detectMethod(trimmed),
        rawSms: trimmed.slice(0, 300),
      }
    }
  }

  // Try credit patterns
  for (const pattern of CREDIT_PATTERNS) {
    const m = trimmed.match(pattern)
    if (m) {
      const amount = cleanAmount(m[1])
      if (!amount || amount <= 0 || amount > 10000000) continue
      const merchant = extractMerchant(trimmed)
      return {
        type: 'income',
        amount,
        note: merchant || '',
        category: detectCategory('income', trimmed),
        method: detectMethod(trimmed),
        rawSms: trimmed.slice(0, 300),
      }
    }
  }

  return null
}
