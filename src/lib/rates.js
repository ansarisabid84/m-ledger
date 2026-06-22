// Currency conversion utilities.
// Rates are fetched from open.er-api.com (free, no key) with 24h localStorage cache.
// Static fallback rates (approximate mid-2025) are used when offline.

const RATES_KEY = 'ledger.rates.v1'
const RATES_TTL = 24 * 60 * 60 * 1000

// 1 unit of [currency] ≈ X NPR (approximate)
const TO_NPR = {
  NPR: 1,
  INR: 1.608,
  USD: 133.5,
  EUR: 145.2,
  GBP: 169.8,
  JPY: 0.893,
  AED: 36.35,
}

export const RATE_CURRENCIES = ['NPR', 'INR', 'USD', 'EUR', 'GBP', 'JPY', 'AED']

// Build static fallback: rates[c] = how many c per 1 baseCurrency
function buildFallback(baseCurrency) {
  const baseNPR = TO_NPR[baseCurrency] || 1
  const rates = {}
  for (const c of RATE_CURRENCIES) rates[c] = baseNPR / (TO_NPR[c] || 1)
  return rates
}

// Fetch live rates where rates[c] = how many c per 1 baseCurrency
export async function fetchRates(baseCurrency) {
  try {
    const cached = JSON.parse(localStorage.getItem(RATES_KEY) || '{}')
    if (cached.base === baseCurrency && cached.time && Date.now() - cached.time < RATES_TTL)
      return cached.rates
  } catch {}

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`, {
      signal: AbortSignal.timeout(4000),
    })
    const data = await res.json()
    if (data.result === 'success' && data.rates) {
      const rates = { [baseCurrency]: 1 }
      for (const c of RATE_CURRENCIES) if (data.rates[c] != null) rates[c] = data.rates[c]
      try {
        localStorage.setItem(RATES_KEY, JSON.stringify({ base: baseCurrency, rates, time: Date.now() }))
      } catch {}
      return rates
    }
  } catch {}

  return buildFallback(baseCurrency)
}

// Convert amount from fromCurrency → baseCurrency.
// rates must come from fetchRates(baseCurrency): rates[c] = c per 1 base.
// So: X fromCurrency = X / rates[fromCurrency] base
export function toBase(amount, fromCurrency, baseCurrency, rates) {
  if (!amount || fromCurrency === baseCurrency) return amount
  const r = rates?.[fromCurrency]
  if (r && r > 0) return amount / r
  // Offline fallback via TO_NPR table
  return amount * (TO_NPR[fromCurrency] || 1) / (TO_NPR[baseCurrency] || 1)
}

// Static approximation: 1 fromCurrency ≈ X baseCurrency
export function staticRate(fromCurrency, baseCurrency) {
  return (TO_NPR[fromCurrency] || 1) / (TO_NPR[baseCurrency] || 1)
}
