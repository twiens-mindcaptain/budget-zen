'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Plus, Loader2 } from 'lucide-react'
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
import { createTransaction } from '@/app/actions/transaction'
import { insertTransactionSchema, type InsertTransactionInput, type Account, type Category } from '@/lib/types'

interface QuickAddDialogProps {
  accounts: Account[]
  categories: Category[]
}

export function QuickAddDialog({ accounts, categories }: QuickAddDialogProps) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense')
  const amountInputRef = useRef<HTMLInputElement>(null)

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
      account_id: accounts[0]?.id || '', // Select first account by default
      category_id: '',
      amount: '',
      date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      note: '',
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

  const handleSubmit = useCallback(async (data: InsertTransactionInput, keepOpen: boolean = false) => {
    setIsSubmitting(true)

    try {
      // Normalize decimal separator (comma to period)
      const normalizedData = {
        ...data,
        amount: data.amount.replace(',', '.'),
      }

      const result = await createTransaction(normalizedData)

      if (result.success) {
        // Reset form for next entry
        form.reset({
          account_id: data.account_id, // Keep same account
          category_id: '', // Clear category
          amount: '',
          date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          note: '',
        })

        // If not keeping open, close the dialog
        if (!keepOpen) {
          setOpen(false)
        } else {
          // Focus back on amount field for next entry
          setTimeout(() => {
            amountInputRef.current?.focus()
          }, 100)
        }
      } else {
        // Show error (you could use a toast notification here)
        console.error('Transaction creation failed:', result.error)
        alert(result.error)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }, [form, setOpen])

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

  // Filter categories based on transaction type
  const filteredCategories = categories.filter(cat => cat.type === transactionType)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          {t('transaction.addTransaction')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('transaction.quickAdd')}</DialogTitle>
          <DialogDescription className="space-y-1">
            <span>
              {t('transaction.press')}{' '}
              <kbd className="mx-1 px-1.5 py-0.5 text-xs bg-zinc-100 text-zinc-700 border border-zinc-300 rounded font-mono">
                Enter
              </kbd>{' '}
              {t('transaction.toSaveAndClose')}
            </span>
            <br />
            <span>
              {t('transaction.press')}{' '}
              <kbd className="mx-1 px-1.5 py-0.5 text-xs bg-zinc-100 text-zinc-700 border border-zinc-300 rounded font-mono">
                ⌘
              </kbd>
              {'+'}
              <kbd className="mx-1 px-1.5 py-0.5 text-xs bg-zinc-100 text-zinc-700 border border-zinc-300 rounded font-mono">
                Enter
              </kbd>{' '}
              ({t('transaction.or')}{' '}
              <kbd className="mx-1 px-1.5 py-0.5 text-xs bg-zinc-100 text-zinc-700 border border-zinc-300 rounded font-mono">
                Ctrl
              </kbd>
              {'+'}
              <kbd className="mx-1 px-1.5 py-0.5 text-xs bg-zinc-100 text-zinc-700 border border-zinc-300 rounded font-mono">
                Enter
              </kbd>
              ) {t('transaction.toSaveAndAddAnother')}
            </span>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {transactionType === 'income' ? `💚 ${t('transaction.income')}` : `💸 ${t('transaction.expense')}`}
                  </p>
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
