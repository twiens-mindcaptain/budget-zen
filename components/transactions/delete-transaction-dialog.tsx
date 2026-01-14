'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { deleteTransaction } from '@/app/actions/transaction'
import { getCategoryDisplayName } from '@/lib/i18n-helpers'
import { formatCurrency } from '@/lib/currency'

interface DeleteTransactionDialogProps {
  transaction: any // Full transaction object with category and account data
  currency: string
  locale: string
  onOptimisticDelete?: (id: string) => void
}

export function DeleteTransactionDialog({ transaction, currency, locale, onOptimisticDelete }: DeleteTransactionDialogProps) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      // Optimistically remove from UI before server responds
      if (onOptimisticDelete) {
        onOptimisticDelete(transaction.id)
        // Close dialog immediately for better UX
        setOpen(false)
      }

      const result = await deleteTransaction(transaction.id)

      if (result.success) {
        // Dialog already closed if optimistic delete was used
        if (!onOptimisticDelete) {
          setOpen(false)
        }
      } else {
        // Show error (you could use a toast notification here)
        console.error('Transaction deletion failed:', result.error)
        alert(result.error)
        // Reopen dialog if there was an error
        if (onOptimisticDelete) {
          setOpen(true)
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An unexpected error occurred')
      // Reopen dialog if there was an error
      if (onOptimisticDelete) {
        setOpen(true)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const isIncome = transaction.category?.type === 'income'
  const amount = parseFloat(transaction.amount)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('transaction.deleteTransaction')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('transaction.deleteWarning')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Transaction Details Preview */}
        <div className="bg-zinc-50 rounded-lg p-4 space-y-2 my-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">{t('transaction.amount')}</span>
            <span className={`text-lg font-semibold ${isIncome ? 'text-emerald-600' : 'text-zinc-900'}`}>
              {formatCurrency(
                amount,
                currency,
                isIncome ? '+' : '-',
                locale
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">{t('transaction.category')}</span>
            <span className="text-sm font-medium text-zinc-900">
              {transaction.category
                ? getCategoryDisplayName(transaction.category, t)
                : t('transaction.uncategorized')
              }
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">{t('transaction.account')}</span>
            <span className="text-sm font-medium text-zinc-900">
              {transaction.account?.name || 'Unknown'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">{t('transaction.date')}</span>
            <span className="text-sm font-medium text-zinc-900">
              {format(new Date(transaction.date), 'MMM dd, yyyy')}
            </span>
          </div>
          {transaction.note && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">{t('transaction.note')}</span>
              <span className="text-sm font-medium text-zinc-900 truncate max-w-[200px]">
                {transaction.note}
              </span>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t('transaction.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('transaction.deleting')}
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                {t('transaction.delete')}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
