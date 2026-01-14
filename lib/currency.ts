/**
 * Currency configuration with symbol and position
 */
interface CurrencyConfig {
  symbol: string
  position: 'before' | 'after'
}

/**
 * Converts a short locale code to a full locale for Intl.NumberFormat
 * @param locale - Short locale code (e.g., 'de', 'en')
 * @returns Full locale code (e.g., 'de-DE', 'en-US')
 */
export function getFullLocale(locale: string): string {
  const localeMap: Record<string, string> = {
    'de': 'de-DE',
    'en': 'en-US',
    'fr': 'fr-FR',
    'es': 'es-ES',
    'it': 'it-IT',
    'pt': 'pt-PT',
    'nl': 'nl-NL',
    'pl': 'pl-PL',
    'cs': 'cs-CZ',
    'sv': 'sv-SE',
    'da': 'da-DK',
    'no': 'no-NO',
    'fi': 'fi-FI',
  }

  return localeMap[locale] || 'de-DE'
}

const CURRENCY_CONFIG: Record<string, CurrencyConfig> = {
  // Symbol after amount (European style)
  EUR: { symbol: '€', position: 'after' },
  CHF: { symbol: 'CHF', position: 'after' },
  SEK: { symbol: 'kr', position: 'after' },
  NOK: { symbol: 'kr', position: 'after' },
  DKK: { symbol: 'kr', position: 'after' },
  PLN: { symbol: 'zł', position: 'after' },
  CZK: { symbol: 'Kč', position: 'after' },
  HUF: { symbol: 'Ft', position: 'after' },
  RON: { symbol: 'lei', position: 'after' },
  BGN: { symbol: 'лв', position: 'after' },
  RUB: { symbol: '₽', position: 'after' },

  // Symbol before amount (US/UK style)
  USD: { symbol: '$', position: 'before' },
  GBP: { symbol: '£', position: 'before' },
  JPY: { symbol: '¥', position: 'before' },
  CNY: { symbol: '¥', position: 'before' },
  INR: { symbol: '₹', position: 'before' },
  AUD: { symbol: 'A$', position: 'before' },
  CAD: { symbol: 'C$', position: 'before' },
  TRY: { symbol: '₺', position: 'before' },
  BRL: { symbol: 'R$', position: 'before' },
  MXN: { symbol: 'Mex$', position: 'before' },
  ZAR: { symbol: 'R', position: 'before' },
  KRW: { symbol: '₩', position: 'before' },
  THB: { symbol: '฿', position: 'before' },
}

/**
 * Converts a currency code to its symbol
 * Falls back to the currency code if no symbol is found
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_CONFIG[currencyCode.toUpperCase()]?.symbol || currencyCode
}

/**
 * Formats an amount with the correct currency symbol and position
 * Uses locale-aware number formatting (thousands separator, decimal separator)
 * @param amount - The numeric amount
 * @param currencyCode - The currency code (e.g., 'EUR', 'USD')
 * @param prefix - Optional prefix (e.g., '+' or '-' for income/expense)
 * @param locale - Optional locale (e.g., 'de-DE', 'en-US'). Defaults to 'de-DE'
 */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  prefix = '',
  locale = 'de-DE'
): string {
  const config = CURRENCY_CONFIG[currencyCode.toUpperCase()]

  // Format number with locale-specific thousands and decimal separators
  // German (de-DE): 1.234,56 (dot for thousands, comma for decimals)
  // English (en-US): 1,234.56 (comma for thousands, dot for decimals)
  const formattedAmount = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))

  if (!config) {
    // Fallback: code before amount
    return `${prefix}${currencyCode} ${formattedAmount}`
  }

  if (config.position === 'after') {
    return `${prefix}${formattedAmount} ${config.symbol}`
  } else {
    return `${prefix}${config.symbol}${formattedAmount}`
  }
}
