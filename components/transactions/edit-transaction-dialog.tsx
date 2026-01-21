'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Pencil, Loader2, ArrowRightLeft, ChevronDown, ChevronUp } from 'lucide-react'
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
import { updateTransaction } from '@/app/actions/transaction'
import { insertTransactionSchema, type InsertTransactionInput, type Category } from '@/lib/types'
import { formatCurrency, parseLocalDate } from '@/lib/currency'
import { toast } from 'sonner'

interface EditTransactionDialogProps {
  transaction: any // Full transaction object with category data
  categories: Category[]
  currency: string
  locale: string
  onOptimisticUpdate?: (transaction: any) => void
}

export function EditTransactionDialog({ transaction, categories, currency, locale, onOptimisticUpdate }: EditTransactionDialogProps) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>(
    transaction.category?.type === 'INCOME' ? 'income' : 'expense'
  )
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

  // Parse the amount to remove any prefix
  const parseAmount = (amount: string | number) => {
    const amountStr = typeof amount === 'string' ? amount : amount.toString()
    const cleanAmount = amountStr.replace(/^[+-]/, '')
    return cleanAmount
  }

  const form = useForm<InsertTransactionInput>({
    resolver: zodResolver(insertTransactionSchema),
    defaultValues: {
      category_id: transaction.category_id || '',
      amount: parseAmount(transaction.amount),
      date: format(parseLocalDate(transaction.date), 'yyyy-MM-dd'),
      memo: transaction.memo || '',
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
      fetchExchangeRate(foreignCurrency)
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
      amountInputRef.current?.focus()
    }
  }

  // Helper function to filter foreign amount input (numbers and decimal only)
  const handleForeignAmountKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const char = e.key
    const currentValue = (e.target as HTMLInputElement).value

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
      if (e.key === 'Enter' && convertedEurAmount) {
        e.preventDefault()
        applyConvertedAmount()
      }
      return
    }

    if (/^\d$/.test(char)) {
      return
    }

    if ((char === ',' || char === '.') && !currentValue.includes(',') && !currentValue.includes('.')) {
      return
    }

    e.preventDefault()
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

  const handleSubmit = useCallback(async (data: InsertTransactionInput) => {
    setIsSubmitting(true)

    try {
      // Normalize decimal separator (comma to period)
      const normalizedData = {
        ...data,
        amount: data.amount.replace(',', '.'),
      }

      // Find the selected category to get full category info
      const selectedCategory = categories.find(cat => cat.id === normalizedData.category_id)

      // Optimistically update UI before server responds
      if (onOptimisticUpdate) {
        // Calculate signed amount based on category type or + prefix
        let finalAmount = Math.abs(parseFloat(normalizedData.amount))

        if (selectedCategory) {
          // Income (INCOME type) = positive, Expense (FIX, VARIABLE, SF1, SF2) = negative
          if (selectedCategory.type !== 'INCOME') {
            finalAmount = -finalAmount
          }
        } else {
          // No category: check if amount starts with + (income) or treat as expense
          const amountStr = normalizedData.amount.toString()
          if (!amountStr.startsWith('+')) {
            // Default: treat as expense (negative)
            finalAmount = -finalAmount
          }
        }

        const optimisticTransaction = {
          ...transaction,
          ...normalizedData,
          amount: finalAmount.toString(),
          category: selectedCategory || null,
        }
        onOptimisticUpdate(optimisticTransaction)
        // Close dialog immediately for better UX
        setOpen(false)
      }

      const result = await updateTransaction(transaction.id, normalizedData)

      if (result.success) {
        // Dialog already closed if optimistic update was used
        if (!onOptimisticUpdate) {
          setOpen(false)
        }
      } else {
        console.error('Transaction update failed:', result.error)
        toast.error(result.error)
        // Reopen dialog if there was an error
        if (onOptimisticUpdate) {
          setOpen(true)
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      toast.error(t('common.unexpectedError'))
      // Reopen dialog if there was an error
      if (onOptimisticUpdate) {
        setOpen(true)
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [transaction, categories, onOptimisticUpdate])

  const onSubmit = (data: InsertTransactionInput) => {
    handleSubmit(data)
  }

  // Filter categories based on transaction type (INCOME for income, everything else for expense)
  const filteredCategories = categories.filter(cat =>
    transactionType === 'income' ? cat.type === 'INCOME' : cat.type !== 'INCOME'
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('transaction.editTransaction')}</DialogTitle>
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
                  t('transaction.saveChanges')
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
