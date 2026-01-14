'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Pencil, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getCategoryIcon } from '@/lib/icon-mapper'
import { getCategoryDisplayName } from '@/lib/i18n-helpers'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { insertTransactionSchema, type InsertTransactionInput, type Account, type Category } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'

interface EditTransactionDialogProps {
  transaction: any // Full transaction object with category and account data
  accounts: Account[]
  categories: Category[]
  currency: string
  locale: string
  onOptimisticUpdate?: (transaction: any) => void
}

export function EditTransactionDialog({ transaction, accounts, categories, currency, locale, onOptimisticUpdate }: EditTransactionDialogProps) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>(
    transaction.category?.type || 'expense'
  )
  const amountInputRef = useRef<HTMLInputElement>(null)

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
      account_id: transaction.account_id || accounts[0]?.id || '',
      category_id: transaction.category_id || '',
      amount: parseAmount(transaction.amount),
      date: format(new Date(transaction.date), "yyyy-MM-dd'T'HH:mm"),
      note: transaction.note || '',
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
        if (currentCategory && currentCategory.type !== newType) {
          form.setValue('category_id', '')
        }
      }
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
      const selectedAccount = accounts.find(acc => acc.id === normalizedData.account_id)

      // Optimistically update UI before server responds
      if (onOptimisticUpdate) {
        // Calculate signed amount based on category type or + prefix
        let finalAmount = Math.abs(parseFloat(normalizedData.amount))

        if (selectedCategory) {
          // Income = positive, Expense = negative
          if (selectedCategory.type === 'expense') {
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
          account: selectedAccount || null,
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
        // Show error (you could use a toast notification here)
        console.error('Transaction update failed:', result.error)
        alert(result.error)
        // Reopen dialog if there was an error
        if (onOptimisticUpdate) {
          setOpen(true)
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An unexpected error occurred')
      // Reopen dialog if there was an error
      if (onOptimisticUpdate) {
        setOpen(true)
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [transaction, categories, accounts, onOptimisticUpdate])

  const onSubmit = (data: InsertTransactionInput) => {
    handleSubmit(data)
  }

  // Filter categories based on transaction type
  const filteredCategories = categories.filter(cat => cat.type === transactionType)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('transaction.editTransaction')}</DialogTitle>
          <DialogDescription>
            {t('transaction.editDescription')}
          </DialogDescription>
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
                  <FormLabel>{t('transaction.amount')} *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      ref={amountInputRef}
                      type="text"
                      inputMode="decimal"
                      placeholder={t('transaction.amountPlaceholder')}
                      disabled={isSubmitting}
                      onKeyDown={handleAmountKeyPress}
                      onChange={(e) => {
                        field.onChange(e)
                        updateTransactionType(e.target.value)
                      }}
                      className="text-lg font-semibold"
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground mt-1">
                      {transactionType === 'income' ? `💚 ${t('transaction.income')}` : `💸 ${t('transaction.expense')}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('transaction.formatExample')}: {exampleAmount}
                    </p>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Account Selector */}
            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('transaction.account')} *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('transaction.selectAccount')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({t(`accountTypes.${account.type}`)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                        <SelectValue placeholder={t('transaction.selectCategory', { type: t(`transaction.${transactionType}`) }) + ` (${t('transaction.optional')})`} />
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

            {/* Date Field */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('transaction.date')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="datetime-local"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Note Field */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('transaction.note')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      placeholder={t('transaction.notePlaceholder')}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
