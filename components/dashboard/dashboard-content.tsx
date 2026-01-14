'use client'

import { useOptimistic } from 'react'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { TransactionList } from '@/components/dashboard/transaction-list'
import { BillsChecklist } from '@/components/dashboard/bills-checklist'
import { SinkingFundsProgress } from '@/components/dashboard/sinking-funds-progress'
import { QuickAddDialog } from '@/components/transactions/quick-add-dialog'
import { useTranslations } from 'next-intl'
import type { MonthlyStatistics, BillItem, SinkingFundItem, SafeToSpendData } from '@/lib/types'

interface Transaction {
  id: string
  amount: string
  date: string
  note: string | null
  account_id: string
  category_id: string | null
  category?: {
    id: string
    name: string | null
    translation_key: string | null
    icon: string
    color: string
    type: 'income' | 'expense'
  } | null
  account?: {
    id: string
    name: string
  } | null
}

interface DashboardContentProps {
  initialTransactions: Transaction[]
  initialStatistics: MonthlyStatistics
  initialSafeToSpend: SafeToSpendData
  initialBills: BillItem[]
  initialSinkingFunds: SinkingFundItem[]
  accounts: any[]
  categories: any[]
  currency: string
  locale: string
}

type OptimisticAction =
  | { type: 'create'; transaction: Transaction }
  | { type: 'update'; transaction: Transaction }
  | { type: 'delete'; id: string }

export function DashboardContent({
  initialTransactions,
  initialStatistics,
  initialSafeToSpend,
  initialBills,
  initialSinkingFunds,
  accounts,
  categories,
  currency,
  locale,
}: DashboardContentProps) {
  const t = useTranslations()

  const [optimisticTransactions, updateOptimisticTransactions] = useOptimistic(
    initialTransactions,
    (state: Transaction[], action: OptimisticAction) => {
      if (action.type === 'create') {
        return [action.transaction, ...state]
      } else if (action.type === 'update') {
        return state.map((tx) =>
          tx.id === action.transaction.id ? action.transaction : tx
        )
      } else if (action.type === 'delete') {
        return state.filter((tx) => tx.id !== action.id)
      }
      return state
    }
  )

  // Calculate statistics optimistically from transactions
  const calculateStatistics = (transactions: Transaction[]): MonthlyStatistics => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    let totalIncome = 0
    let totalExpenses = 0

    transactions.forEach((transaction) => {
      const transactionDate = new Date(transaction.date)
      if (transactionDate >= startOfMonth && transactionDate <= endOfMonth) {
        const amount = parseFloat(transaction.amount)

        if (amount > 0) {
          totalIncome += amount
        } else if (amount < 0) {
          totalExpenses += Math.abs(amount)
        }
      }
    })

    const balance = totalIncome - totalExpenses

    return {
      income: totalIncome.toFixed(2),
      expenses: totalExpenses.toFixed(2),
      balance: balance.toFixed(2),
    }
  }

  // Calculate safe to spend optimistically
  const calculateSafeToSpend = (transactions: Transaction[]): SafeToSpendData => {
    // Calculate total liquid (all account balances)
    let totalLiquid = 0

    accounts.forEach((account) => {
      const initialBalance = parseFloat(account.initial_balance)
      const accountTransactions = transactions.filter(
        (t) => t.account_id === account.id
      )
      const transactionsSum = accountTransactions.reduce(
        (sum, t) => sum + parseFloat(t.amount),
        0
      )
      totalLiquid += initialBalance + transactionsSum
    })

    // Pending bills and sinking contributions stay the same (budget items don't change during transaction operations)
    const pendingBills = parseFloat(initialSafeToSpend.pendingBills)
    const sinkingContributions = parseFloat(initialSafeToSpend.sinkingContributions)
    const safeToSpend = totalLiquid - pendingBills - sinkingContributions

    return {
      safeToSpend: safeToSpend.toFixed(2),
      totalLiquid: totalLiquid.toFixed(2),
      pendingBills: pendingBills.toFixed(2),
      sinkingContributions: sinkingContributions.toFixed(2),
    }
  }

  const optimisticStatistics = calculateStatistics(optimisticTransactions)
  const optimisticSafeToSpend = calculateSafeToSpend(optimisticTransactions)

  const handleOptimisticCreate = (transaction: Transaction) => {
    updateOptimisticTransactions({ type: 'create', transaction })
  }

  const handleOptimisticUpdate = (transaction: Transaction) => {
    updateOptimisticTransactions({ type: 'update', transaction })
  }

  const handleOptimisticDelete = (id: string) => {
    updateOptimisticTransactions({ type: 'delete', id })
  }

  return (
    <>
      {/* Safe to Spend Card */}
      <div className="mb-6">
        <SummaryCards
          statistics={optimisticStatistics}
          safeToSpendData={optimisticSafeToSpend}
          currency={currency}
          locale={locale}
        />
      </div>

      {/* Split View: Bills + Sinking Funds */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <BillsChecklist
          initialBills={initialBills}
          accounts={accounts}
          currency={currency}
          locale={locale}
        />
        <SinkingFundsProgress
          funds={initialSinkingFunds}
          currency={currency}
          locale={locale}
        />
      </div>

      {/* Quick Add Section */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-zinc-900">{t('dashboard.transactions')}</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {t('dashboard.pressNToAdd', { key: 'N' }).split('N')[0]}
            <kbd className="mx-1 px-1.5 py-0.5 text-xs bg-zinc-100 text-zinc-700 border border-zinc-300 rounded font-mono">
              N
            </kbd>
            {t('dashboard.pressNToAdd', { key: 'N' }).split('N')[1]}
          </p>
        </div>
        <QuickAddDialog
          accounts={accounts}
          categories={categories}
          currency={currency}
          locale={locale}
          onOptimisticCreate={handleOptimisticCreate}
        />
      </div>

      {/* Transaction List with Optimistic Updates */}
      <TransactionList
        initialTransactions={optimisticTransactions}
        accounts={accounts}
        categories={categories}
        currency={currency}
        locale={locale}
        onOptimisticUpdate={handleOptimisticUpdate}
        onOptimisticDelete={handleOptimisticDelete}
      />
    </>
  )
}
