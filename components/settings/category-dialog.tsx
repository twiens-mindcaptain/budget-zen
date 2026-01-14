'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createCategory, updateCategory, CategoryFormData } from '@/app/actions/categories'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IconPicker } from '@/components/settings/icon-picker'
import { ColorPicker } from '@/components/settings/color-picker'
import { getCategoryDisplayName } from '@/lib/i18n-helpers'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const formSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Name too long'),
  icon: z.string().min(1, 'Icon is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color'),
  type: z.enum(['income', 'expense']),
  budget_type: z.enum(['variable', 'fixed', 'sinking_fund']),
  target_amount: z.string().optional(),
  frequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']),
})

type FormData = z.infer<typeof formSchema>

interface Category {
  id: string
  name: string | null
  translation_key?: string | null
  icon: string
  color: string
  type: 'income' | 'expense'
  budget_type?: string
  target_amount?: string | null
  frequency?: string
}

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category
  onSuccess: (category: Category) => void
}

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryDialogProps) {
  const t = useTranslations()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!category

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: category ? getCategoryDisplayName(category, t) : '',
      icon: category?.icon || 'ShoppingCart',
      color: category?.color || '#10b981',
      type: category?.type || 'expense',
      budget_type: (category?.budget_type as 'variable' | 'fixed' | 'sinking_fund') || 'variable',
      target_amount: category?.target_amount || '',
      frequency: (category?.frequency as 'monthly' | 'quarterly' | 'semi_annual' | 'annual') || 'monthly',
    },
  })

  // Watch budget_type to conditionally show/hide fields
  const budgetType = form.watch('budget_type')
  const showBudgetFields = budgetType === 'fixed' || budgetType === 'sinking_fund'

  // Reset form when category changes
  useEffect(() => {
    if (category) {
      form.reset({
        name: getCategoryDisplayName(category, t),
        icon: category.icon,
        color: category.color,
        type: category.type,
        budget_type: (category.budget_type as 'variable' | 'fixed' | 'sinking_fund') || 'variable',
        target_amount: category.target_amount || '',
        frequency: (category.frequency as 'monthly' | 'quarterly' | 'semi_annual' | 'annual') || 'monthly',
      })
    } else {
      form.reset({
        name: '',
        icon: 'ShoppingCart',
        color: '#10b981',
        type: 'expense',
        budget_type: 'variable',
        target_amount: '',
        frequency: 'monthly',
      })
    }
  }, [category, form, t])

  async function onSubmit(data: FormData) {
    setIsSubmitting(true)

    try {
      const result = isEditing
        ? await updateCategory(category.id, data as CategoryFormData)
        : await createCategory(data as CategoryFormData)

      if (result.success) {
        toast.success(result.message)
        // Call onSuccess with updated/created category
        onSuccess({
          id: category?.id || crypto.randomUUID(), // Temp ID for new categories
          ...data,
        })
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
            {isEditing
              ? t('settings.categories.editCategory')
              : t('settings.categories.createCategory')}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('settings.categories.editDescription')
              : t('settings.categories.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Category Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.categories.name')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('settings.categories.namePlaceholder')}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.categories.type')}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="expense" id="expense" />
                        <label
                          htmlFor="expense"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {t('transaction.expense')}
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="income" id="income" />
                        <label
                          htmlFor="income"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {t('transaction.income')}
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Icon Picker */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.categories.icon')}</FormLabel>
                  <FormControl>
                    <IconPicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color Picker */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.categories.color')}</FormLabel>
                  <FormControl>
                    <ColorPicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Budget Type */}
            <FormField
              control={form.control}
              name="budget_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('budget.budgetType')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('budget.budgetType')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="variable">
                        {t('budget.types.variable')}
                      </SelectItem>
                      <SelectItem value="fixed">
                        {t('budget.types.fixed')}
                      </SelectItem>
                      <SelectItem value="sinking_fund">
                        {t('budget.types.sinking_fund')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-zinc-500 mt-1">
                    {t(`budget.descriptions.${field.value}`)}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Target Amount (conditional) */}
            {showBudgetFields && (
              <FormField
                control={form.control}
                name="target_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('budget.targetAmount')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Frequency (conditional) */}
            {showBudgetFields && (
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('budget.frequency')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('budget.frequency')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">
                          {t('budget.frequencies.monthly')}
                        </SelectItem>
                        <SelectItem value="quarterly">
                          {t('budget.frequencies.quarterly')}
                        </SelectItem>
                        <SelectItem value="semi_annual">
                          {t('budget.frequencies.semi_annual')}
                        </SelectItem>
                        <SelectItem value="annual">
                          {t('budget.frequencies.annual')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                {isEditing ? t('settings.categories.save') : t('settings.categories.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
