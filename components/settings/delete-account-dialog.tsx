'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { deleteAccount } from '@/app/actions/accounts'
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

interface Account {
  id: string
  name: string
  type: 'cash' | 'bank' | 'credit' | 'savings'
  initial_balance: string
}

interface DeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account
  onSuccess: (accountId: string) => void
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  account,
  onSuccess,
}: DeleteAccountDialogProps) {
  const t = useTranslations()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)

    try {
      const result = await deleteAccount(account.id)

      if (result.success) {
        toast.success(t('settings.accounts.deleteSuccess'))
        onSuccess(account.id)
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
            {t('settings.accounts.deleteTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('settings.accounts.deleteDescription', { name: account.name })}
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
            {t('settings.accounts.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
