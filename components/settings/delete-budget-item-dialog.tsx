'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { deleteBudgetItem } from '@/app/actions/budget-items'
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

interface BudgetItem {
  id: string
  name: string
  category_id: string
  amount: string
  frequency: string
  monthly_impact: string
  saved_balance: string
}

interface DeleteBudgetItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: BudgetItem
  onSuccess: (itemId: string) => void
}

export function DeleteBudgetItemDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: DeleteBudgetItemDialogProps) {
  const t = useTranslations()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)

    try {
      const result = await deleteBudgetItem(item.id)

      if (result.success) {
        toast.success('Budget item deleted successfully')
        onSuccess(item.id)
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
          <AlertDialogTitle>{t('budgetItems.deleteItem')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('budgetItems.deleteWarning')}
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
            {t('transaction.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
