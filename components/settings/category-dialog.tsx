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
})

type FormData = z.infer<typeof formSchema>

interface Category {
  id: string
  name: string | null
  translation_key?: string | null
  icon: string
  color: string
  type: 'income' | 'expense'
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
    },
  })

  // Reset form when category changes
  useEffect(() => {
    if (category) {
      form.reset({
        name: getCategoryDisplayName(category, t),
        icon: category.icon,
        color: category.color,
        type: category.type,
      })
    } else {
      form.reset({
        name: '',
        icon: 'ShoppingCart',
        color: '#10b981',
        type: 'expense',
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
