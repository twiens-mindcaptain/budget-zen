'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { deleteCategory } from '@/app/actions/categories'
import { getCategoryDisplayName } from '@/lib/i18n-helpers'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string | null
  translation_key?: string | null
  icon: string
  color: string
  type: 'income' | 'expense'
}

interface DeleteCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: Category
  onSuccess: (categoryId: string) => void
}

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: DeleteCategoryDialogProps) {
  const t = useTranslations()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)

    try {
      const result = await deleteCategory(category.id)

      if (result.success) {
        toast.success(result.message)
        onSuccess(category.id)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Delete error:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('settings.categories.deleteTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('settings.categories.deleteDescription', {
              name: getCategoryDisplayName(category, t)
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t('transaction.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('settings.categories.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
