'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type InsertBudgetItemInput, type BudgetItem, type Category } from '@/lib/types'
import { createBudgetItem, updateBudgetItem } from '@/app/actions/budget-items'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getCategoryDisplayName } from '@/lib/i18n-helpers'
import { formatCurrency } from '@/lib/currency'

interface BudgetItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: BudgetItem
  categories: Category[]
  currency: string
  locale: string
  onSuccess: (item: BudgetItem) => void
}

// Form schema without transform for client-side validation
const formSchema = z.object({
  category_id: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Item name is required').max(100),
  amount: z.string().min(1, 'Amount is required'),
  frequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']),
  saved_balance: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

export function BudgetItemDialog({
  open,
  onOpenChange,
  item,
  categories,
  currency,
  locale,
  onSuccess,
}: BudgetItemDialogProps) {
  const t = useTranslations()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!item

  // Filter categories: only expense categories with budget_type='fixed' or 'sinking_fund'
  const eligibleCategories = categories.filter(
    (c) => c.type === 'expense' && (c.budget_type === 'fixed' || c.budget_type === 'sinking_fund')
  )

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category_id: item?.category_id || '',
      name: item?.name || '',
      amount: item?.amount || '',
      frequency: item?.frequency || 'monthly',
      saved_balance: item?.saved_balance || '0.00',
    },
  })

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      form.reset({
        category_id: item.category_id,
        name: item.name,
        amount: item.amount,
        frequency: item.frequency,
        saved_balance: item.saved_balance,
      })
    } else {
      form.reset({
        category_id: '',
        name: '',
        amount: '',
        frequency: 'monthly',
        saved_balance: '0.00',
      })
    }
  }, [item, form])

  // Watch amount and frequency to calculate monthly impact
  const amount = form.watch('amount')
  const frequency = form.watch('frequency')

  const calculateMonthlyImpact = () => {
    if (!amount || isNaN(parseFloat(amount))) return '0.00'
    const amountNum = parseFloat(amount)
    const divisors = { monthly: 1, quarterly: 3, semi_annual: 6, annual: 12 }
    return (amountNum / divisors[frequency]).toFixed(2)
  }

  const monthlyImpact = calculateMonthlyImpact()
  const showSavedBalance = frequency !== 'monthly'

  async function onSubmit(data: FormData) {
    setIsSubmitting(true)

    try {
      const submitData: InsertBudgetItemInput = {
        category_id: data.category_id,
        name: data.name,
        amount: data.amount,
        frequency: data.frequency,
        saved_balance: showSavedBalance ? (data.saved_balance || '0.00') : '0.00',
      }

      const result = isEditing
        ? await updateBudgetItem(item.id, submitData)
        : await createBudgetItem(submitData)

      if (result.success) {
        toast.success(
          isEditing
            ? 'Budget item updated successfully'
            : 'Budget item created successfully'
        )
        onSuccess(result.data)
        form.reset()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('budgetItems.editItem') : t('budgetItems.createItem')}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('budgetItems.editDescription')
              : t('budgetItems.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Item Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('budgetItems.itemName')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('budgetItems.itemNamePlaceholder')}
                      autoFocus
                    />
                  </FormControl>
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
                  <FormLabel>{t('budgetItems.category')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('budgetItems.selectCategory')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {eligibleCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {getCategoryDisplayName(category, t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('budgetItems.amount')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="pr-12"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                        {currency}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Frequency */}
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('budgetItems.frequency')}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-2 gap-3"
                    >
                      {(['monthly', 'quarterly', 'semi_annual', 'annual'] as const).map(
                        (freq) => (
                          <label
                            key={freq}
                            htmlFor={freq}
                            className={`flex items-center space-x-2 border-2 rounded-lg p-3 cursor-pointer transition-all ${
                              field.value === freq
                                ? 'border-zinc-900 bg-zinc-50'
                                : 'border-zinc-200 hover:border-zinc-300'
                            }`}
                          >
                            <RadioGroupItem value={freq} id={freq} className="sr-only" />
                            <span className="text-sm font-medium">
                              {t(`budgetItems.frequencies.${freq}`)}
                            </span>
                          </label>
                        )
                      )}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Monthly Impact (calculated, read-only) */}
            <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-200">
              <div className="text-sm text-zinc-500 mb-1">
                {t('budgetItems.monthlyImpact')}
              </div>
              <div className="text-lg font-semibold text-zinc-900">
                {formatCurrency(parseFloat(monthlyImpact), currency, '', locale)}/mo
              </div>
            </div>

            {/* Saved Balance (only for non-monthly) */}
            {showSavedBalance && (
              <FormField
                control={form.control}
                name="saved_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('budgetItems.savedBalance')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="pr-12"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                          {currency}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('transaction.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? t('budgetItems.save') : t('budgetItems.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
