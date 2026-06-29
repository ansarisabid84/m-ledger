// Timezone and calendar utilities for the LiveClock feature.
// Country-first structure: each country lists its available timezones so
// users can pick the exact region they want (e.g. India only has IST, but
// the USA has six distinct timezone options).

// ─── Country / Timezone catalogue ────────────────────────────────────────────

export const COUNTRIES = [
  {
    code: 'IN', name: 'India', flag: '🇮🇳', calendarType: 'gregorian',
    timezones: [{ tz: 'Asia/Kolkata', label: 'IST', name: 'India Standard Time' }],
  },
  {
    code: 'NP', name: 'Nepal', flag: '🇳🇵', calendarType: 'bs',
    timezones: [{ tz: 'Asia/Kathmandu', label: 'NST', name: 'Nepal Standard Time' }],
  },
  {
    code: 'US', name: 'United States', flag: '🇺🇸', calendarType: 'gregorian',
    timezones: [
      { tz: 'America/New_York',    label: 'ET',  name: 'Eastern (New York)' },
      { tz: 'America/Chicago',     label: 'CT',  name: 'Central (Chicago)' },
      { tz: 'America/Denver',      label: 'MT',  name: 'Mountain (Denver)' },
      { tz: 'America/Los_Angeles', label: 'PT',  name: 'Pacific (Los Angeles)' },
      { tz: 'America/Anchorage',   label: 'AKT', name: 'Alaska (Anchorage)' },
      { tz: 'Pacific/Honolulu',    label: 'HT',  name: 'Hawaii (Honolulu)' },
    ],
  },
  {
    code: 'GB', name: 'United Kingdom', flag: '🇬🇧', calendarType: 'gregorian',
    timezones: [{ tz: 'Europe/London', label: 'GMT', name: 'Greenwich Mean Time' }],
  },
  {
    code: 'AU', name: 'Australia', flag: '🇦🇺', calendarType: 'gregorian',
    timezones: [
      { tz: 'Australia/Sydney',   label: 'AEST', name: 'Eastern (Sydney)' },
      { tz: 'Australia/Brisbane', label: 'AEST', name: 'Queensland (Brisbane)' },
      { tz: 'Australia/Adelaide', label: 'ACST', name: 'Central (Adelaide)' },
      { tz: 'Australia/Darwin',   label: 'ACST', name: 'Darwin' },
      { tz: 'Australia/Perth',    label: 'AWST', name: 'Western (Perth)' },
    ],
  },
  {
    code: 'CA', name: 'Canada', flag: '🇨🇦', calendarType: 'gregorian',
    timezones: [
      { tz: 'America/Toronto',   label: 'ET', name: 'Eastern (Toronto)' },
      { tz: 'America/Winnipeg',  label: 'CT', name: 'Central (Winnipeg)' },
      { tz: 'America/Edmonton',  label: 'MT', name: 'Mountain (Edmonton)' },
      { tz: 'America/Vancouver', label: 'PT', name: 'Pacific (Vancouver)' },
      { tz: 'America/St_Johns',  label: 'NT', name: "Newfoundland (St. John's)" },
    ],
  },
  {
    code: 'PK', name: 'Pakistan', flag: '🇵🇰', calendarType: 'gregorian',
    timezones: [{ tz: 'Asia/Karachi', label: 'PKT', name: 'Pakistan Standard Time' }],
  },
  {
    code: 'BD', name: 'Bangladesh', flag: '🇧🇩', calendarType: 'gregorian',
    timezones: [{ tz: 'Asia/Dhaka', label: 'BST', name: 'Bangladesh Standard Time' }],
  },
  {
    code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', calendarType: 'gregorian',
    timezones: [{ tz: 'Asia/Colombo', label: 'SLST', name: 'Sri Lanka Time' }],
  },
  {
    code: 'SG', name: 'Singapore', flag: '🇸🇬', calendarType: 'gregorian',
    timezones: [{ tz: 'Asia/Singapore', label: 'SGT', name: 'Singapore Time' }],
  },
  {
    code: 'MY', name: 'Malaysia', flag: '🇲🇾', calendarType: 'gregorian',
    timezones: [{ tz: 'Asia/Kuala_Lumpur', label: 'MYT', name: 'Malaysia Time' }],
  },
  {
    code: 'ID', name: 'Indonesia', flag: '🇮🇩', calendarType: 'gregorian',
    timezones: [
      { tz: 'Asia/Jakarta',   label: 'WIB',  name: 'Western (Jakarta)' },
      { tz: 'Asia/Makassar',  label: 'WITA', name: 'Central (Makassar)' },
      { tz: 'Asia/Jayapura',  label: 'WIT',  name: 'Eastern (Jayapura)' },
    ],
  },
  {
    code: 'TH', name: 'Thailand', flag: '🇹🇭', calendarType: 'gregorian',
    timezones: [{ tz: 'Asia/Bangkok', label: 'ICT', name: 'Indochina Time' }],
  },
  {
    code: 'PH', name: 'Philippines', flag: '🇵🇭', calendarType: 'gregorian',
    timezones: [{ tz: 'Asia/Manila', label: 'PHT', name: 'Philippine Time' }],
  },
  {
    code: 'VN', name: 'Vietnam', flag: '🇻🇳', calendarType: 'gregorian',
    timezones: [{ tz: 'Asia/Ho_Chi_Minh', label: 'ICT', name: 'Indochina Time' }],
  },
  {
    code: 'CN', name: 'China', flag: '🇨🇳', calendarType: 'gregorian',
    timezones: [{ tz: 'Asia/Shanghai', label: 'CST', name: 'China Standard Time' }],
  },
  {
    code: 'JP', name: 'Japan', flag: '🇯🇵', calendarType: 'gregorian',
    timezones: [{ tz: 'Asia/Tokyo', label: 'JST', name: 'Japan Standard Time' }],
  },
  {
    code: 'KR', name: 'South Korea', flag: '🇰🇷', calendarType: 'gregorian',
    timezones: [{ tz: 'Asia/Seoul', label: 'KST', name: 'Korea Standard Time' }],
  },
  {
    code: 'AE', name: 'UAE', flag: '🇦🇪', calendarType: 'gregorian',
    timezones: [{ tz: 'Asia/Dubai', label: 'GST', name: 'Gulf Standard Time' }],
  },
  {
    code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', calendarType: 'gregorian',
    timezones: [{ tz: 'Asia/Riyadh', label: 'AST', name: 'Arabia Standard Time' }],
  },
  {
    code: 'TR', name: 'Turkey', flag: '🇹🇷', calendarType: 'gregorian',
    timezones: [{ tz: 'Europe/Istanbul', label: 'TRT', name: 'Turkey Time' }],
  },
  {
    code: 'DE', name: 'Germany', flag: '🇩🇪', calendarType: 'gregorian',
    timezones: [{ tz: 'Europe/Berlin', label: 'CET', name: 'Central European Time' }],
  },
  {
    code: 'FR', name: 'France', flag: '🇫🇷', calendarType: 'gregorian',
    timezones: [{ tz: 'Europe/Paris', label: 'CET', name: 'Central European Time' }],
  },
  {
    code: 'IT', name: 'Italy', flag: '🇮🇹', calendarType: 'gregorian',
    timezones: [{ tz: 'Europe/Rome', label: 'CET', name: 'Central European Time' }],
  },
  {
    code: 'NL', name: 'Netherlands', flag: '🇳🇱', calendarType: 'gregorian',
    timezones: [{ tz: 'Europe/Amsterdam', label: 'CET', name: 'Central European Time' }],
  },
  {
    code: 'ES', name: 'Spain', flag: '🇪🇸', calendarType: 'gregorian',
    timezones: [{ tz: 'Europe/Madrid', label: 'CET', name: 'Central European Time' }],
  },
  {
    code: 'PT', name: 'Portugal', flag: '🇵🇹', calendarType: 'gregorian',
    timezones: [{ tz: 'Europe/Lisbon', label: 'WET', name: 'Western European Time' }],
  },
  {
    code: 'RU', name: 'Russia', flag: '🇷🇺', calendarType: 'gregorian',
    timezones: [
      { tz: 'Europe/Moscow',       label: 'MSK',  name: 'Moscow Time' },
      { tz: 'Asia/Yekaterinburg',  label: 'YEKT', name: 'Yekaterinburg Time' },
      { tz: 'Asia/Krasnoyarsk',    label: 'KRAT', name: 'Krasnoyarsk Time' },
      { tz: 'Asia/Irkutsk',        label: 'IRKT', name: 'Irkutsk Time' },
      { tz: 'Asia/Vladivostok',    label: 'VLAT', name: 'Vladivostok Time' },
    ],
  },
  {
    code: 'BR', name: 'Brazil', flag: '🇧🇷', calendarType: 'gregorian',
    timezones: [
      { tz: 'America/Sao_Paulo', label: 'BRT', name: 'Brasília Time' },
      { tz: 'America/Manaus',    label: 'AMT', name: 'Amazon Time (Manaus)' },
    ],
  },
  {
    code: 'MX', name: 'Mexico', flag: '🇲🇽', calendarType: 'gregorian',
    timezones: [
      { tz: 'America/Mexico_City', label: 'CST', name: 'Central (Mexico City)' },
      { tz: 'America/Hermosillo',  label: 'MST', name: 'Mountain (Hermosillo)' },
      { tz: 'America/Tijuana',     label: 'PST', name: 'Pacific (Tijuana)' },
    ],
  },
  {
    code: 'AR', name: 'Argentina', flag: '🇦🇷', calendarType: 'gregorian',
    timezones: [{ tz: 'America/Argentina/Buenos_Aires', label: 'ART', name: 'Argentina Time' }],
  },
  {
    code: 'CO', name: 'Colombia', flag: '🇨🇴', calendarType: 'gregorian',
    timezones: [{ tz: 'America/Bogota', label: 'COT', name: 'Colombia Time' }],
  },
  {
    code: 'ZA', name: 'South Africa', flag: '🇿🇦', calendarType: 'gregorian',
    timezones: [{ tz: 'Africa/Johannesburg', label: 'SAST', name: 'SA Standard Time' }],
  },
  {
    code: 'NG', name: 'Nigeria', flag: '🇳🇬', calendarType: 'gregorian',
    timezones: [{ tz: 'Africa/Lagos', label: 'WAT', name: 'West Africa Time' }],
  },
  {
    code: 'EG', name: 'Egypt', flag: '🇪🇬', calendarType: 'gregorian',
    timezones: [{ tz: 'Africa/Cairo', label: 'EET', name: 'Eastern European Time' }],
  },
]

// Look up a country entry by code
export function getCountry(code) {
  return COUNTRIES.find((c) => c.code === code) || null
}

// Look up a timezone entry within a country
export function getTimezoneEntry(countryCode, tz) {
  const country = getCountry(countryCode)
  return country?.timezones.find((t) => t.tz === tz) || country?.timezones[0] || null
}

// Whether a country uses the Bikram Sambat calendar
export function isBS(countryCode) {
  return countryCode === 'NP'
}

// Resolve from legacy clockCurrency to new clockCountry/clockTimezone
const CURRENCY_TO_COUNTRY = {
  NPR: 'NP', INR: 'IN', USD: 'US', EUR: 'DE', GBP: 'GB', JPY: 'JP', AED: 'AE',
}
export function resolveClock(settings) {
  const countryCode = settings.clockCountry || CURRENCY_TO_COUNTRY[settings.clockCurrency || settings.currency] || 'IN'
  const country = getCountry(countryCode) || COUNTRIES[0]
  const tz = settings.clockTimezone || country.timezones[0].tz
  const tzEntry = getTimezoneEntry(countryCode, tz) || country.timezones[0]
  return { countryCode, country, tz, tzLabel: tzEntry.label }
}

// ─── Formatting functions (accept raw IANA tz string) ────────────────────────

// Format HH:MM:SS (or hh:MM:SS AM/PM) in the given timezone
export function formatClockTime(date, tz, clockFormat) {
  const timezone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone
  const use12h = clockFormat === '12h'
  try {
    return date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: use12h,
    })
  } catch {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: use12h })
  }
}

// Format "Wed, 15 Jun 2026" or "Ashadh 15, 2083 BS" in the given timezone
export function formatClockDate(date, tz, countryCode) {
  if (countryCode === 'NP') {
    const { year, month, day } = getDateParts(date, tz)
    const bs = gregorianToBS(year, month + 1, day)
    if (bs) return `${BS_MONTHS[bs.month - 1]} ${bs.day}, ${bs.year} BS`
  }
  const timezone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone
  try {
    return date.toLocaleDateString('en-GB', {
      timeZone: timezone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }
}

// Decompose a Date into {year, month (0-indexed), day} in the given timezone
export function getDateParts(date, tz) {
  const timezone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date)
    const get = (t) => Number(parts.find((p) => p.type === t)?.value)
    return { year: get('year'), month: get('month') - 1, day: get('day') }
  } catch {
    return { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() }
  }
}

// ─── Bikram Sambat (BS) Calendar ────────────────────────────────────────────

export const BS_MONTHS = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan',
  'Bhadra', 'Ashwin', 'Kartik', 'Mangsir',
  'Poush', 'Magh', 'Falgun', 'Chaitra',
]

// Days in each month for BS years 2079–2090.
// Reference: 1 Baisakh 2082 = April 14, 2025 AD.
const BS_MONTH_DAYS = {
  2079: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2080: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2082: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2083: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2084: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2085: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2086: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2087: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2088: [30, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2089: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2090: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
}

const BS_REF_AD = Date.UTC(2025, 3, 14)
const BS_REF = { year: 2082, month: 1, day: 1 }

function daysInBSMonth(year, month) {
  return (BS_MONTH_DAYS[year] || [])[month - 1] || 30
}

export function gregorianToBS(gYear, gMonth, gDay) {
  const targetMs = Date.UTC(gYear, gMonth - 1, gDay)
  const diffDays = Math.round((targetMs - BS_REF_AD) / 86400000)

  let bsYear = BS_REF.year
  let bsMonth = BS_REF.month
  let bsDay = BS_REF.day

  if (diffDays === 0) return { year: bsYear, month: bsMonth, day: bsDay }

  if (diffDays > 0) {
    let remaining = diffDays
    while (remaining > 0) {
      const daysLeft = daysInBSMonth(bsYear, bsMonth) - bsDay + 1
      if (remaining < daysLeft) { bsDay += remaining; remaining = 0 }
      else { remaining -= daysLeft; bsDay = 1; bsMonth++; if (bsMonth > 12) { bsMonth = 1; bsYear++ } }
    }
  } else {
    let remaining = -diffDays
    while (remaining > 0) {
      if (remaining < bsDay) { bsDay -= remaining; remaining = 0 }
      else { remaining -= bsDay; bsMonth--; if (bsMonth < 1) { bsMonth = 12; bsYear-- }; bsDay = daysInBSMonth(bsYear, bsMonth) }
    }
  }

  return { year: bsYear, month: bsMonth, day: bsDay }
}

export function bsMonthDays(bsYear, bsMonth) {
  const firstOfRef = { year: BS_REF.year, month: BS_REF.month, day: BS_REF.day }
  let days = 0
  let y = firstOfRef.year
  let m = firstOfRef.month

  if (bsYear > y || (bsYear === y && bsMonth > m)) {
    while (y < bsYear || (y === bsYear && m < bsMonth)) {
      days += daysInBSMonth(y, m); m++; if (m > 12) { m = 1; y++ }
    }
  } else if (bsYear < y || (bsYear === y && bsMonth < m)) {
    while (y > bsYear || (y === bsYear && m > bsMonth)) {
      m--; if (m < 1) { m = 12; y-- }; days -= daysInBSMonth(y, m)
    }
  }

  const firstAD = new Date(BS_REF_AD + days * 86400000)
  const count = daysInBSMonth(bsYear, bsMonth)
  return Array.from({ length: count }, (_, i) => ({
    bsDay: i + 1,
    adDate: new Date(firstAD.getTime() + i * 86400000),
  }))
}

export function bsCalendarGrid(bsYear, bsMonth) {
  const days = bsMonthDays(bsYear, bsMonth)
  const firstDow = days[0].adDate.getUTCDay()
  const startPad = firstDow === 0 ? 6 : firstDow - 1

  // Trailing days from previous BS month (shown faded)
  let prevMonthDays = []
  if (startPad > 0) {
    const prevBsMonth = bsMonth === 1 ? 12 : bsMonth - 1
    const prevBsYear = bsMonth === 1 ? bsYear - 1 : bsYear
    const prevCount = daysInBSMonth(prevBsYear, prevBsMonth)
    for (let i = startPad - 1; i >= 0; i--) {
      prevMonthDays.unshift({ bsDay: prevCount - i, adDate: null, adjacent: true })
    }
  }

  const cells = [...prevMonthDays, ...days.map((d) => ({ ...d, adjacent: false }))]
  const trailing = (7 - (cells.length % 7)) % 7
  const nextBsMonth = bsMonth === 12 ? 1 : bsMonth + 1
  const nextBsYear = bsMonth === 12 ? bsYear + 1 : bsYear
  for (let i = 1; i <= trailing; i++) {
    cells.push({ bsDay: i, adDate: null, adjacent: true, nextMonth: true })
  }

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

// Build a Gregorian calendar grid (weeks starting Monday), with adjacent month days
export function gregorianCalendarGrid(year, month) {
  // month is 1-indexed
  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDow = firstDay.getDay()
  const startPad = firstDow === 0 ? 6 : firstDow - 1

  const prevYear = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1
  const prevDaysInMonth = new Date(prevYear, prevMonth, 0).getDate()

  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1

  const prevDays = Array.from({ length: startPad }, (_, i) => ({
    date: new Date(prevYear, prevMonth - 1, prevDaysInMonth - startPad + 1 + i),
    current: false,
  }))
  const curDays = Array.from({ length: daysInMonth }, (_, i) => ({
    date: new Date(year, month - 1, i + 1),
    current: true,
  }))
  const cells = [...prevDays, ...curDays]
  const trailing = (7 - (cells.length % 7)) % 7
  for (let i = 1; i <= trailing; i++) {
    cells.push({ date: new Date(nextYear, nextMonth - 1, i), current: false })
  }

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

// Legacy compat — kept so any remaining callers don't break
export const CURRENCY_TIMEZONE = {
  NPR: 'Asia/Kathmandu', INR: 'Asia/Kolkata', USD: 'America/New_York',
  EUR: 'Europe/Berlin',  GBP: 'Europe/London', JPY: 'Asia/Tokyo', AED: 'Asia/Dubai',
}
export const CURRENCY_TZ_LABEL = {
  NPR: 'NST', INR: 'IST', USD: 'ET', EUR: 'CET', GBP: 'GMT', JPY: 'JST', AED: 'GST',
}
