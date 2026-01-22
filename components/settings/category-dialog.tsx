'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createCategory, updateCategory, CategoryFormData } from '@/app/actions/categories'
import type { Category, ZBBCategoryType, RolloverStrategy } from '@/lib/types'
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
  FormDescription,
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
import { IconPicker } from '@/components/settings/icon-picker'
import { ColorPicker } from '@/components/settings/color-picker'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getCategorySuggestion } from '@/lib/category-suggestions'

const formSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Name too long'),
  icon: z.string().min(1, 'Icon is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color'),
  type: z.enum(['FIX', 'VARIABLE', 'SF1', 'SF2', 'INCOME']),
  rollover_strategy: z.enum(['ACCUMULATE', 'RESET', 'SWEEP']),
  target_amount: z.string().optional(),
  due_date: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

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
      name: category?.name || '',
      icon: category?.icon || 'ShoppingCart',
      color: category?.color || '#10b981',
      type: (category?.type as ZBBCategoryType) || 'VARIABLE',
      rollover_strategy: (category?.rollover_strategy as RolloverStrategy) || 'RESET',
      target_amount: category?.target_amount || '',
      due_date: category?.due_date || '',
    },
  })

  // Watch type to conditionally show/hide fields
  const categoryType = form.watch('type')
  const showTargetAmount = categoryType === 'FIX' || categoryType === 'SF1' || categoryType === 'SF2'
  const showDueDate = categoryType === 'SF1'

  // Watch name for smart suggestions (only when creating)
  const categoryName = form.watch('name')

  // Auto-suggest icon and color based on name (only when creating new category)
  useEffect(() => {
    if (isEditing || !categoryName.trim()) return

    const suggestion = getCategorySuggestion(categoryName, categoryType)
    form.setValue('icon', suggestion.icon)
    form.setValue('color', suggestion.color)
  }, [categoryName, categoryType, isEditing, form])

  // Reset form when category changes
  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name || '',
        icon: category.icon || 'ShoppingCart',
        color: category.color || '#10b981',
        type: (category.type as ZBBCategoryType) || 'VARIABLE',
        rollover_strategy: (category.rollover_strategy as RolloverStrategy) || 'RESET',
        target_amount: category.target_amount || '',
        due_date: category.due_date || '',
      })
    } else {
      form.reset({
        name: '',
        icon: 'ShoppingCart',
        color: '#10b981',
        type: 'VARIABLE',
        rollover_strategy: 'RESET',
        target_amount: '',
        due_date: '',
      })
    }
  }, [category, form])

  async function onSubmit(data: FormData) {
    setIsSubmitting(true)

    try {
      const formData: CategoryFormData = {
        name: data.name,
        icon: data.icon,
        color: data.color,
        type: data.type,
        rollover_strategy: data.rollover_strategy,
        target_amount: data.target_amount || null,
        due_date: data.due_date || null,
      }

      const result = isEditing
        ? await updateCategory(category.id, formData)
        : await createCategory(formData)

      if (result.success) {
        toast.success(
          isEditing
            ? t('settings.categories.updateSuccess')
            : t('settings.categories.createSuccess')
        )
        onSuccess(result.data)
        form.reset()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error(t('common.unexpectedError'))
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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

            {/* Category Type (ZBB) */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.categories.type')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('settings.categories.type')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="INCOME">{t('budget.types.INCOME')}</SelectItem>
                      <SelectItem value="FIX">{t('budget.types.FIX')}</SelectItem>
                      <SelectItem value="VARIABLE">{t('budget.types.VARIABLE')}</SelectItem>
                      <SelectItem value="SF1">{t('budget.types.SF1')}</SelectItem>
                      <SelectItem value="SF2">{t('budget.types.SF2')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t(`budget.typeDescriptions.${field.value}`)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rollover Strategy */}
            <FormField
              control={form.control}
              name="rollover_strategy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('budget.rolloverStrategy')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('budget.rolloverStrategy')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="RESET">{t('budget.strategies.RESET')}</SelectItem>
                      <SelectItem value="ACCUMULATE">{t('budget.strategies.ACCUMULATE')}</SelectItem>
                      <SelectItem value="SWEEP">{t('budget.strategies.SWEEP')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t(`budget.rolloverDescriptions.${field.value}`)}
                  </FormDescription>
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

            {/* Target Amount (conditional) */}
            {showTargetAmount && (
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

            {/* Due Date (conditional - only for SF1) */}
            {showDueDate && (
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('budget.dueDate')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                      />
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
                {isEditing ? t('settings.categories.save') : t('settings.categories.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
