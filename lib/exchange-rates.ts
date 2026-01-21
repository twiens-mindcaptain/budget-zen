/**
 * Exchange rate utilities using frankfurter.app API
 * Free, no API key required, uses European Central Bank data
 */

// Common currencies for the converter
export const COMMON_CURRENCIES = [
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: '$' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
] as const

export type CurrencyCode = (typeof COMMON_CURRENCIES)[number]['code'] | 'EUR'

interface ExchangeRateResponse {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

interface CachedRate {
  rate: number
  timestamp: number
  date: string
}

// Cache rates for 1 hour (3600000 ms)
const CACHE_DURATION = 60 * 60 * 1000
const rateCache = new Map<string, CachedRate>()

/**
 * Get the cache key for a currency pair
 */
function getCacheKey(from: string, to: string): string {
  return `${from}-${to}`
}

/**
 * Fetch the current exchange rate from frankfurter.app
 * @param from Source currency code (e.g., 'MXN')
 * @param to Target currency code (e.g., 'EUR')
 * @returns Exchange rate (1 from = X to)
 */
export async function getExchangeRate(
  from: CurrencyCode,
  to: CurrencyCode = 'EUR'
): Promise<{ rate: number; date: string } | null> {
  // Check cache first
  const cacheKey = getCacheKey(from, to)
  const cached = rateCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { rate: cached.rate, date: cached.date }
  }

  try {
    // frankfurter.app: GET /latest?from=MXN&to=EUR
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${from}&to=${to}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour in Next.js
    )

    if (!response.ok) {
      console.error('Exchange rate API error:', response.status)
      return null
    }

    const data: ExchangeRateResponse = await response.json()
    const rate = data.rates[to]

    if (!rate) {
      console.error('No rate found for', to)
      return null
    }

    // Cache the rate
    rateCache.set(cacheKey, {
      rate,
      timestamp: Date.now(),
      date: data.date,
    })

    return { rate, date: data.date }
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error)
    return null
  }
}

/**
 * Convert an amount from one currency to another
 * @param amount Amount in source currency
 * @param from Source currency code
 * @param to Target currency code
 * @returns Converted amount and rate info
 */
export async function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode = 'EUR'
): Promise<{ converted: number; rate: number; date: string } | null> {
  const rateInfo = await getExchangeRate(from, to)

  if (!rateInfo) {
    return null
  }

  return {
    converted: amount * rateInfo.rate,
    rate: rateInfo.rate,
    date: rateInfo.date,
  }
}

/**
 * Format a rate for display (e.g., "1 MXN = 0.054 EUR")
 */
export function formatRate(from: string, to: string, rate: number): string {
  // Show inverse rate for better readability when converting to EUR
  if (to === 'EUR' && rate < 1) {
    const inverseRate = 1 / rate
    return `1 ${to} = ${inverseRate.toFixed(2)} ${from}`
  }
  return `1 ${from} = ${rate.toFixed(4)} ${to}`
}

/**
 * Get currency symbol by code
 */
export function getCurrencySymbol(code: CurrencyCode): string {
  if (code === 'EUR') return '€'
  const currency = COMMON_CURRENCIES.find((c) => c.code === code)
  return currency?.symbol || code
}
