'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Plus, Loader2, ArrowRightLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getCategoryIcon } from '@/lib/icon-mapper'
import { getCategoryDisplayName } from '@/lib/i18n-helpers'
import { COMMON_CURRENCIES, getExchangeRate, getCurrencySymbol, type CurrencyCode } from '@/lib/exchange-rates'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createTransaction } from '@/app/actions/transaction'
import { insertTransactionSchema, type InsertTransactionInput, type Category } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import { toast } from 'sonner'

interface QuickAddDialogProps {
  categories: Category[]
  currency: string
  locale: string
  onOptimisticCreate?: (transaction: any) => void
}

export function QuickAddDialog({ categories, currency, locale, onOptimisticCreate }: QuickAddDialogProps) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense')
  const amountInputRef = useRef<HTMLInputElement>(null)

  // Currency converter state
  const [showConverter, setShowConverter] = useState(false)
  const [foreignCurrency, setForeignCurrency] = useState<CurrencyCode>('MXN')
  const [foreignAmount, setForeignAmount] = useState('')
  const [exchangeRate, setExchangeRate] = useState<{ rate: number; date: string } | null>(null)
  const [isLoadingRate, startRateTransition] = useTransition()
  const foreignAmountInputRef = useRef<HTMLInputElement>(null)

  // Generate example formatted amount for helper text
  const exampleAmount = formatCurrency(1234.56, currency, '', locale)

  // Global keyboard shortcut to open the dialog from anywhere on the page
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea or if dialog is already open
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || open) {
        return
      }

      // Press 'N' to open (New transaction)
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setOpen(true)
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [open])

  const form = useForm<InsertTransactionInput>({
    resolver: zodResolver(insertTransactionSchema),
    defaultValues: {
      category_id: '',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      memo: '',
    },
  })

  // Determine transaction type based on amount input
  const updateTransactionType = (value: string) => {
    const newType = value.startsWith('+') ? 'income' : 'expense'

    if (newType !== transactionType) {
      setTransactionType(newType)

      // Clear category if it doesn't match the new type
      const currentCategoryId = form.getValues('category_id')
      if (currentCategoryId) {
        const currentCategory = categories.find(cat => cat.id === currentCategoryId)
        if (currentCategory) {
          const currentIsIncome = currentCategory.type === 'INCOME'
          const newIsIncome = newType === 'income'
          if (currentIsIncome !== newIsIncome) {
            form.setValue('category_id', '')
          }
        }
      }
    }
  }

  // Fetch exchange rate when converter opens or currency changes
  const fetchExchangeRate = useCallback((currency: CurrencyCode) => {
    startRateTransition(async () => {
      const rateInfo = await getExchangeRate(currency, 'EUR')
      setExchangeRate(rateInfo)
    })
  }, [])

  // Handle converter toggle
  const handleConverterToggle = () => {
    const newShowConverter = !showConverter
    setShowConverter(newShowConverter)
    if (newShowConverter) {
      // Fetch rate when opening
      fetchExchangeRate(foreignCurrency)
      // Focus foreign amount input after a short delay
      setTimeout(() => {
        foreignAmountInputRef.current?.focus()
      }, 100)
    }
  }

  // Handle currency change
  const handleCurrencyChange = (currency: CurrencyCode) => {
    setForeignCurrency(currency)
    fetchExchangeRate(currency)
  }

  // Calculate converted EUR amount
  const convertedEurAmount = foreignAmount && exchangeRate
    ? (parseFloat(foreignAmount.replace(',', '.')) * exchangeRate.rate).toFixed(2)
    : ''

  // Apply converted amount to main field
  const applyConvertedAmount = () => {
    if (convertedEurAmount) {
      form.setValue('amount', convertedEurAmount)
      updateTransactionType(convertedEurAmount)
      setShowConverter(false)
      setForeignAmount('')
      // Focus main amount field
      amountInputRef.current?.focus()
    }
  }

  // Helper function to filter amount input (numbers, comma, period, plus, minus)
  const handleAmountKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const char = e.key
    const currentValue = (e.target as HTMLInputElement).value
    const cursorPosition = (e.target as HTMLInputElement).selectionStart || 0

    // Allow control keys
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Escape' ||
      e.key === 'Enter' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      (e.metaKey || e.ctrlKey) // Allow Cmd/Ctrl shortcuts
    ) {
      return
    }

    // Allow numbers
    if (/^\d$/.test(char)) {
      return
    }

    // Allow plus or minus only at the beginning
    if ((char === '+' || char === '-') && cursorPosition === 0 && !currentValue.startsWith('+') && !currentValue.startsWith('-')) {
      return
    }

    // Allow comma or period (only if not already present)
    if ((char === ',' || char === '.') && !currentValue.includes(',') && !currentValue.includes('.')) {
      return
    }

    // Block everything else
    e.preventDefault()
  }

  // Helper function to filter foreign amount input (numbers and decimal only)
  const handleForeignAmountKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const char = e.key
    const currentValue = (e.target as HTMLInputElement).value

    // Allow control keys
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Escape' ||
      e.key === 'Enter' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      (e.metaKey || e.ctrlKey)
    ) {
      // Enter applies the converted amount
      if (e.key === 'Enter' && convertedEurAmount) {
        e.preventDefault()
        applyConvertedAmount()
      }
      return
    }

    // Allow numbers
    if (/^\d$/.test(char)) {
      return
    }

    // Allow comma or period (only if not already present)
    if ((char === ',' || char === '.') && !currentValue.includes(',') && !currentValue.includes('.')) {
      return
    }

    // Block everything else
    e.preventDefault()
  }

  // Auto-focus amount field when dialog opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure dialog is fully rendered
      const timer = setTimeout(() => {
        amountInputRef.current?.focus()
        amountInputRef.current?.select()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [open])

  const handleSubmit = useCallback(async (data: InsertTransactionInput, keepOpen: boolean = false) => {
    setIsSubmitting(true)

    try {
      // Normalize decimal separator (comma to period)
      const normalizedData = {
        ...data,
        amount: data.amount.replace(',', '.'),
      }

      // Create optimistic transaction for instant UI update
      if (onOptimisticCreate) {
        // Calculate signed amount based on category type or + prefix
        let finalAmount = Math.abs(parseFloat(normalizedData.amount))
        const selectedCategory = categories.find(c => c.id === data.category_id)

        if (selectedCategory) {
          // Income (INCOME type) = positive, Expense (FIX, VARIABLE, SF1, SF2) = negative
          if (selectedCategory.type !== 'INCOME') {
            finalAmount = -finalAmount
          }
        } else {
          // No category: check if amount starts with + (income) or treat as expense
          const amountStr = normalizedData.amount.toString()
          if (!amountStr.startsWith('+')) {
            finalAmount = -finalAmount
          }
        }

        const optimisticTransaction = {
          id: `temp-${Date.now()}`, // Temporary ID
          amount: finalAmount.toString(),
          date: data.date || new Date().toISOString(),
          memo: data.memo || null,
          category_id: data.category_id || null,
          category: selectedCategory || null,
        }

        onOptimisticCreate(optimisticTransaction)

        // Reset form immediately
        form.reset({
          category_id: '', // Clear category
          amount: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          memo: '',
        })

        // If not keeping open, close the dialog immediately
        if (!keepOpen) {
          setOpen(false)
        } else {
          // Focus back on amount field for next entry
          setTimeout(() => {
            amountInputRef.current?.focus()
          }, 100)
        }
      }

      // Submit to server in background
      const result = await createTransaction(normalizedData)

      if (!result.success) {
        console.error('Transaction creation failed:', result.error)
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      toast.error(t('common.unexpectedError'))
    } finally {
      setIsSubmitting(false)
    }
  }, [form, setOpen, onOptimisticCreate, categories])

  // Keyboard handler for Cmd+Enter inside the dialog
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) - Submit and keep open
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit((data) => handleSubmit(data, true))()
      }
    }

    document.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [open, form, handleSubmit])

  const onSubmit = (data: InsertTransactionInput) => {
    handleSubmit(data, false)
  }

  // Filter categories based on transaction type (INCOME for income, everything else for expense)
  const filteredCategories = categories.filter(cat =>
    transactionType === 'income' ? cat.type === 'INCOME' : cat.type !== 'INCOME'
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          {t('transaction.addTransaction')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('transaction.quickAdd')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {/* Amount Field - Auto-focused */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{t('transaction.amount')}</FormLabel>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        transactionType === 'income'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {t(`transaction.${transactionType}`)}
                    </span>
                  </div>
                  <FormControl>
                    <Input
                      {...field}
                      ref={amountInputRef}
                      type="text"
                      inputMode="decimal"
                      placeholder={exampleAmount}
                      disabled={isSubmitting}
                      onKeyDown={handleAmountKeyPress}
                      onChange={(e) => {
                        field.onChange(e)
                        updateTransactionType(e.target.value)
                      }}
                      className="text-xl font-semibold h-12"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Currency Converter Toggle */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleConverterToggle}
                className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
              >
                <ArrowRightLeft className="h-4 w-4" />
                {t('transaction.currencyConverter')}
                {showConverter ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {/* Currency Converter Panel */}
              {showConverter && (
                <div className="bg-zinc-50 rounded-lg p-3 space-y-3 border border-zinc-200">
                  {/* Currency Selector and Foreign Amount */}
                  <div className="flex gap-2">
                    {/* Currency Dropdown */}
                    <Select
                      value={foreignCurrency}
                      onValueChange={(value) => handleCurrencyChange(value as CurrencyCode)}
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

                    {/* Foreign Amount Input */}
                    <Input
                      ref={foreignAmountInputRef}
                      type="text"
                      inputMode="decimal"
                      placeholder={`${t('transaction.amount')} (${foreignCurrency})`}
                      value={foreignAmount}
                      onChange={(e) => setForeignAmount(e.target.value)}
                      onKeyDown={handleForeignAmountKeyPress}
                      className="flex-1"
                    />
                  </div>

                  {/* Exchange Rate Info and Converted Amount */}
                  <div className="flex items-center justify-between">
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
                      <Button
                        type="button"
                        size="sm"
                        onClick={applyConvertedAmount}
                      >
                        {t('transaction.applyAmount')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Category Selector */}
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('transaction.category')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('transaction.selectCategoryShort')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCategories.map((category) => {
                        const CategoryIcon = getCategoryIcon(category.icon)
                        return (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <CategoryIcon
                                className="w-4 h-4"
                                style={{ color: category.color || '#71717a' }}
                              />
                              {getCategoryDisplayName(category, t)}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date and Memo in a row */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('transaction.date')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="memo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('transaction.memo')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder={t('transaction.memoPlaceholder')}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                {t('transaction.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('transaction.saving')}
                  </>
                ) : (
                  t('transaction.saveTransaction')
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
