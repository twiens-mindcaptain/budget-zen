'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRightLeft, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  COMMON_CURRENCIES,
  getExchangeRate,
  getCurrencySymbol,
  type CurrencyCode,
} from '@/lib/exchange-rates'

interface CurrencyInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  inputClassName?: string
  /** Show converter inline (expanded) or as popover (compact) */
  variant?: 'inline' | 'popover'
  /** Auto-focus the input on mount */
  autoFocus?: boolean
  /** Allow +/- prefix for income/expense */
  allowSign?: boolean
  /** Callback when Enter is pressed */
  onEnterPress?: () => void
}

export function CurrencyInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  inputClassName = '',
  variant = 'inline',
  autoFocus = false,
  allowSign = false,
  onEnterPress,
}: CurrencyInputProps) {
  const t = useTranslations()
  const inputRef = useRef<HTMLInputElement>(null)

  // Converter state
  const [showConverter, setShowConverter] = useState(false)
  const [foreignCurrency, setForeignCurrency] = useState<CurrencyCode>('MXN')
  const [foreignAmount, setForeignAmount] = useState('')
  const [exchangeRate, setExchangeRate] = useState<{ rate: number; date: string } | null>(null)
  const [isLoadingRate, startRateTransition] = useTransition()
  const foreignInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus main input
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus()
    }
  }, [autoFocus])

  // Fetch exchange rate
  const fetchExchangeRate = (currency: CurrencyCode) => {
    startRateTransition(async () => {
      const rateInfo = await getExchangeRate(currency, 'EUR')
      setExchangeRate(rateInfo)
    })
  }

  // Handle converter toggle
  const handleConverterToggle = () => {
    const newShow = !showConverter
    setShowConverter(newShow)
    if (newShow) {
      fetchExchangeRate(foreignCurrency)
      setTimeout(() => foreignInputRef.current?.focus(), 100)
    }
  }

  // Handle currency change
  const handleCurrencyChange = (currency: CurrencyCode) => {
    setForeignCurrency(currency)
    fetchExchangeRate(currency)
  }

  // Calculate converted EUR amount
  const convertedEurAmount =
    foreignAmount && exchangeRate
      ? (parseFloat(foreignAmount.replace(',', '.')) * exchangeRate.rate).toFixed(2)
      : ''

  // Apply converted amount
  const applyConvertedAmount = () => {
    if (convertedEurAmount) {
      onChange(convertedEurAmount)
      setShowConverter(false)
      setForeignAmount('')
      inputRef.current?.focus()
    }
  }

  // Filter main input
  const handleMainKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const char = e.key
    const currentValue = (e.target as HTMLInputElement).value
    const cursorPosition = (e.target as HTMLInputElement).selectionStart || 0

    // Allow control keys
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Escape' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      (e.metaKey || e.ctrlKey)
    ) {
      return
    }

    // Enter key
    if (e.key === 'Enter') {
      if (onEnterPress) {
        e.preventDefault()
        onEnterPress()
      }
      return
    }

    // Allow numbers
    if (/^\d$/.test(char)) return

    // Allow +/- only at beginning if allowSign
    if (
      allowSign &&
      (char === '+' || char === '-') &&
      cursorPosition === 0 &&
      !currentValue.startsWith('+') &&
      !currentValue.startsWith('-')
    ) {
      return
    }

    // Allow comma or period (decimal separator)
    if (
      (char === ',' || char === '.') &&
      !currentValue.includes(',') &&
      !currentValue.includes('.')
    ) {
      return
    }

    e.preventDefault()
  }

  // Filter foreign input
  const handleForeignKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const char = e.key
    const currentValue = (e.target as HTMLInputElement).value

    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Escape' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      (e.metaKey || e.ctrlKey)
    ) {
      return
    }

    // Enter applies conversion
    if (e.key === 'Enter' && convertedEurAmount) {
      e.preventDefault()
      applyConvertedAmount()
      return
    }

    if (/^\d$/.test(char)) return

    if (
      (char === ',' || char === '.') &&
      !currentValue.includes(',') &&
      !currentValue.includes('.')
    ) {
      return
    }

    e.preventDefault()
  }

  // Converter content (shared between inline and popover)
  const converterContent = (
    <div className="space-y-3">
      {/* Currency Selector and Foreign Amount */}
      <div className="flex gap-2">
        <Select
          value={foreignCurrency}
          onValueChange={(v) => handleCurrencyChange(v as CurrencyCode)}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMMON_CURRENCIES.map((curr) => (
              <SelectItem key={curr.code} value={curr.code}>
                {curr.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          ref={foreignInputRef}
          type="text"
          inputMode="decimal"
          placeholder={`${t('transaction.amount')} (${foreignCurrency})`}
          value={foreignAmount}
          onChange={(e) => setForeignAmount(e.target.value)}
          onKeyDown={handleForeignKeyDown}
          className="flex-1"
        />
      </div>

      {/* Exchange Rate Info */}
      <div className="text-xs text-zinc-500">
        {isLoadingRate ? (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('transaction.loadingRate')}
          </span>
        ) : exchangeRate ? (
          <span>
            1 EUR = {(1 / exchangeRate.rate).toFixed(2)} {foreignCurrency}
            <span className="ml-1 text-zinc-400">({exchangeRate.date})</span>
          </span>
        ) : (
          <span className="text-red-500">{t('transaction.rateError')}</span>
        )}
      </div>

      {/* Converted Result and Apply Button */}
      {convertedEurAmount && (
        <div className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-zinc-200">
          <div>
            <span className="text-xs text-zinc-500">{t('transaction.convertedAmount')}</span>
            <div className="text-lg font-semibold text-emerald-600">
              {getCurrencySymbol('EUR')} {convertedEurAmount}
            </div>
          </div>
          <Button type="button" size="sm" onClick={applyConvertedAmount}>
            {t('transaction.applyAmount')}
          </Button>
        </div>
      )}
    </div>
  )

  if (variant === 'popover') {
    // Compact variant: converter in popover
    return (
      <div className={`flex gap-2 ${className}`}>
        <Input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleMainKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClassName}
        />
        <Popover open={showConverter} onOpenChange={setShowConverter}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="flex-shrink-0"
              onClick={() => {
                if (!showConverter) fetchExchangeRate(foreignCurrency)
              }}
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="text-sm font-medium mb-3">{t('transaction.currencyConverter')}</div>
            {converterContent}
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  // Inline variant: converter below input
  return (
    <div className={`space-y-3 ${className}`}>
      <Input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleMainKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClassName}
      />

      {/* Converter Toggle */}
      <button
        type="button"
        onClick={handleConverterToggle}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
      >
        <ArrowRightLeft className="h-4 w-4" />
        {t('transaction.currencyConverter')}
        {showConverter ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {/* Converter Panel */}
      {showConverter && (
        <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-200">{converterContent}</div>
      )}
    </div>
  )
}
