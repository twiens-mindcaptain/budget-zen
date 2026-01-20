'use client'

import { format } from 'date-fns'
import { de, enUS } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import { EditTransactionDialog } from '@/components/transactions/edit-transaction-dialog'
import { DeleteTransactionDialog } from '@/components/transactions/delete-transaction-dialog'
import { getCategoryIcon } from '@/lib/icon-mapper'
import { getCategoryDisplayName } from '@/lib/i18n-helpers'
import { formatCurrency, parseLocalDate } from '@/lib/currency'

interface Transaction {
  id: string
  amount: string
  date: string
  memo: string | null
  category_id: string | null
  category?: {
    id: string
    name: string | null
    icon: string | null
    color: string | null
    type: string // ZBB type: FIX, VARIABLE, SF1, SF2, INCOME
  } | null
}

interface TransactionListProps {
  initialTransactions: Transaction[]
  categories: any[]
  currency: string
  locale: string
  onOptimisticUpdate?: (transaction: Transaction) => void
  onOptimisticDelete?: (id: string) => void
}

export function TransactionList({
  initialTransactions,
  categories,
  currency,
  locale,
  onOptimisticUpdate,
  onOptimisticDelete,
}: TransactionListProps) {
  const t = useTranslations()

  if (initialTransactions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center shadow-sm">
        <div className="max-w-sm mx-auto space-y-4">
          <div className="text-zinc-400 text-5xl">💰</div>
          <h3 className="text-lg font-medium text-zinc-900">
            {t('dashboard.noTransactionsYet')}
          </h3>
          <p className="text-sm text-zinc-500">{t('dashboard.getStarted')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {initialTransactions.map((transaction) => {
        const isIncome = transaction.category?.type === 'INCOME'
        const amount = parseFloat(transaction.amount)
        const CategoryIcon = getCategoryIcon(transaction.category?.icon || 'HelpCircle')

        return (
          <div
            key={transaction.id}
            className="group bg-white rounded-xl border border-zinc-200 p-4 hover:bg-zinc-50/50 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: transaction.category?.color
                      ? `${transaction.category.color}15`
                      : '#f4f4f5',
                  }}
                >
                  <CategoryIcon
                    className="w-5 h-5"
                    style={{
                      color: transaction.category?.color || '#71717a',
                    }}
                  />
                </div>
              </div>

              {/* Middle: Category and Date */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-zinc-900">
                  {transaction.category
                    ? getCategoryDisplayName(transaction.category, t)
                    : t('transaction.uncategorized')}
                </div>
                <div className="text-sm text-zinc-500">
                  {format(parseLocalDate(transaction.date), 'PP', { locale: locale === 'de-DE' ? de : enUS })}
                </div>
                {transaction.memo && (
                  <div className="text-sm text-zinc-500 mt-1 truncate">
                    {transaction.memo}
                  </div>
                )}
              </div>

              {/* Right: Amount and Actions */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="text-right">
                  <div
                    className={`text-lg font-semibold tabular-nums ${
                      isIncome ? 'text-emerald-600' : 'text-zinc-900'
                    }`}
                  >
                    {formatCurrency(
                      amount,
                      currency,
                      isIncome ? '+' : '-',
                      locale
                    )}
                  </div>
                </div>

                {/* Edit and Delete Buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <EditTransactionDialog
                    transaction={transaction}
                    categories={categories}
                    currency={currency}
                    locale={locale}
                    onOptimisticUpdate={onOptimisticUpdate}
                  />
                  <DeleteTransactionDialog
                    transaction={transaction}
                    currency={currency}
                    locale={locale}
                    onOptimisticDelete={onOptimisticDelete}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
