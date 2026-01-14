'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Pencil, Trash2, Wallet, CreditCard, Landmark, PiggyBank } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccountDialog } from '@/components/settings/account-dialog'
import { DeleteAccountDialog } from '@/components/settings/delete-account-dialog'
import { formatCurrency } from '@/lib/currency'
import { useLocale } from 'next-intl'

interface Account {
  id: string
  name: string
  type: 'cash' | 'bank' | 'credit' | 'savings'
  initial_balance: string
  current_balance: string
}

interface AccountsTabProps {
  initialAccounts: Account[]
  currency: string
}

// Icon mapping for account types
const accountIcons = {
  cash: Wallet,
  bank: Landmark,
  credit: CreditCard,
  savings: PiggyBank,
}

// Color mapping for account types
const accountColors = {
  cash: '#10b981', // green
  bank: '#3b82f6', // blue
  credit: '#ef4444', // red
  savings: '#8b5cf6', // purple
}

export function AccountsTab({ initialAccounts, currency }: AccountsTabProps) {
  const t = useTranslations()
  const locale = useLocale()
  const [accounts, setAccounts] = useState(initialAccounts)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const handleEditClick = (account: Account) => {
    setSelectedAccount(account)
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (account: Account) => {
    setSelectedAccount(account)
    setIsDeleteDialogOpen(true)
  }

  const handleAccountCreated = (newAccount: Account) => {
    setAccounts([...accounts, { ...newAccount, current_balance: newAccount.initial_balance }])
    setIsCreateDialogOpen(false)
  }

  const handleAccountUpdated = (updatedAccount: Account) => {
    setAccounts(
      accounts.map((a) =>
        a.id === updatedAccount.id
          ? { ...updatedAccount, current_balance: a.current_balance }
          : a
      )
    )
    setIsEditDialogOpen(false)
    setSelectedAccount(null)
  }

  const handleAccountDeleted = (deletedId: string) => {
    setAccounts(accounts.filter((a) => a.id !== deletedId))
    setIsDeleteDialogOpen(false)
    setSelectedAccount(null)
  }

  const renderAccountCard = (account: Account) => {
    const AccountIcon = accountIcons[account.type]
    const color = accountColors[account.type]
    const currentBalance = parseFloat(account.current_balance)
    const isNegative = currentBalance < 0

    return (
      <div
        key={account.id}
        className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: `${color}15`,
            }}
          >
            <AccountIcon className="w-6 h-6" style={{ color }} />
          </div>

          {/* Account Info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-zinc-900">{account.name}</div>
            <div className="text-xs text-zinc-500 capitalize">
              {t(`settings.accounts.types.${account.type}`)}
            </div>
            <div className={`text-sm font-semibold mt-1 ${isNegative ? 'text-red-600' : 'text-zinc-900'}`}>
              {formatCurrency(Math.abs(currentBalance), currency, isNegative ? '-' : '', locale)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditClick(account)}
              className="h-8 w-8 p-0"
            >
              <Pencil className="w-4 h-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteClick(account)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-zinc-900">
            {t('settings.accounts.title')}
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {t('settings.accounts.description')}
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('settings.accounts.addNew')}
        </Button>
      </div>

      {/* Accounts Grid */}
      <div className="grid gap-3 md:grid-cols-2">
        {accounts.map(renderAccountCard)}
        {accounts.length === 0 && (
          <div className="col-span-2 text-center py-8 text-zinc-500 text-sm">
            {t('settings.accounts.noAccounts')}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <AccountDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleAccountCreated}
        currency={currency}
      />

      {/* Edit Dialog */}
      {selectedAccount && (
        <AccountDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          account={selectedAccount}
          onSuccess={handleAccountUpdated}
          currency={currency}
        />
      )}

      {/* Delete Dialog */}
      {selectedAccount && (
        <DeleteAccountDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          account={selectedAccount}
          onSuccess={handleAccountDeleted}
        />
      )}
    </div>
  )
}
