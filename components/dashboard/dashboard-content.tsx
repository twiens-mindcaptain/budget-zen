'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { TransactionList } from '@/components/dashboard/transaction-list'
import { BillsChecklist } from '@/components/dashboard/bills-checklist'
import { SinkingFundsProgress } from '@/components/dashboard/sinking-funds-progress'
import { BudgetTable } from '@/components/dashboard/budget-table'
import { QuickAddDialog } from '@/components/transactions/quick-add-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, Calendar, Play, Wallet } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth } from 'date-fns'
import { de, enUS } from 'date-fns/locale'
import { initializeMonth } from '@/app/actions/budgets'
import { formatCurrency } from '@/lib/currency'
import { toast } from 'sonner'
import type { MonthlyStatistics, BillItem, SinkingFundItem, MonthlyBudgetWithActivity, BudgetSummary } from '@/lib/types'

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

interface DashboardContentProps {
  initialTransactions: Transaction[]
  initialStatistics: MonthlyStatistics
  initialBills: BillItem[]
  initialSinkingFunds: SinkingFundItem[]
  initialBudgets: MonthlyBudgetWithActivity[]
  initialBudgetSummary: BudgetSummary
  suggestedAmounts?: Record<string, string>
  categories: any[]
  currency: string
  locale: string
  currentMonth: string // ISO string
}

type OptimisticAction =
  | { type: 'create'; transaction: Transaction }
  | { type: 'update'; transaction: Transaction }
  | { type: 'delete'; id: string }

export function DashboardContent({
  initialTransactions,
  initialStatistics,
  initialBills,
  initialSinkingFunds,
  initialBudgets,
  initialBudgetSummary,
  suggestedAmounts,
  categories,
  currency,
  locale,
  currentMonth,
}: DashboardContentProps) {
  const t = useTranslations()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<string>('overview')

  const monthDate = new Date(currentMonth)
  const dateLocale = locale === 'de-DE' ? de : enUS
  const monthLabel = format(monthDate, 'MMMM yyyy', { locale: dateLocale })
  const monthIso = format(monthDate, 'yyyy-MM')

  // Budget summary values
  const toBeBudgeted = parseFloat(initialBudgetSummary.toBeBudgeted)
  const isOverBudgeted = toBeBudgeted < 0

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
  // Uses category type to determine income vs expense (not just amount sign)
  const calculateStatistics = (transactions: Transaction[]): MonthlyStatistics => {
    const monthStart = startOfMonth(monthDate)
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59)

    let totalIncome = 0
    let totalExpenses = 0

    transactions.forEach((transaction) => {
      const transactionDate = new Date(transaction.date)
      if (transactionDate >= monthStart && transactionDate <= monthEnd) {
        const amount = Math.abs(parseFloat(transaction.amount))

        // Check if transaction belongs to an income category (case-insensitive)
        const isIncomeCategory = transaction.category?.type?.toUpperCase() === 'INCOME'

        if (isIncomeCategory) {
          totalIncome += amount
        } else if (amount > 0) {
          totalExpenses += amount
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

  const optimisticStatistics = calculateStatistics(optimisticTransactions)

  const handleOptimisticCreate = (transaction: Transaction) => {
    updateOptimisticTransactions({ type: 'create', transaction })
  }

  const handleOptimisticUpdate = (transaction: Transaction) => {
    updateOptimisticTransactions({ type: 'update', transaction })
  }

  const handleOptimisticDelete = (id: string) => {
    updateOptimisticTransactions({ type: 'delete', id })
  }

  // Month navigation handlers
  const navigateToMonth = (newMonth: Date) => {
    const monthParam = format(newMonth, 'yyyy-MM')
    router.push(`${pathname}?month=${monthParam}`)
  }

  const handlePrevMonth = () => {
    navigateToMonth(subMonths(monthDate, 1))
  }

  const handleNextMonth = () => {
    navigateToMonth(addMonths(monthDate, 1))
  }

  const handleToday = () => {
    router.push(pathname)
  }

  const isCurrentMonth = format(monthDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM')

  // Initialize month handler
  const handleInitializeMonth = () => {
    startTransition(async () => {
      const result = await initializeMonth(monthDate)
      if (result.success) {
        toast.success(`${result.data} ${t('budget.title')} initialized`)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      {/* Month Navigation + To Be Budgeted */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[160px] text-center">
            {monthLabel}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentMonth && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="ml-2"
            >
              <Calendar className="h-4 w-4 mr-1" />
              {t('budget.today')}
            </Button>
          )}
        </div>
      </div>

      {/* To Be Budgeted Card */}
      <Card
        className={`mb-6 ${
          isOverBudgeted
            ? 'bg-red-50 border-red-200'
            : toBeBudgeted > 0
            ? 'bg-amber-50 border-amber-200'
            : 'bg-emerald-50 border-emerald-200'
        }`}
      >
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-zinc-500" />
              <div>
                <p className="text-sm text-zinc-600">{t('budget.toBeBudgeted')}</p>
                <p
                  className={`text-3xl font-bold tabular-nums ${
                    isOverBudgeted
                      ? 'text-red-600'
                      : toBeBudgeted > 0
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {formatCurrency(Math.abs(toBeBudgeted), currency, isOverBudgeted ? '-' : '', locale)}
                </p>
                {isOverBudgeted && (
                  <p className="text-xs text-red-600 mt-1">
                    {t('budget.overBudgetedWarning')}
                  </p>
                )}
              </div>
            </div>

            {/* Summary Stats */}
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-xs text-zinc-500">{t('budget.totalIncome')}</p>
                <p className="text-sm font-semibold text-emerald-600 tabular-nums">
                  +{formatCurrency(parseFloat(initialBudgetSummary.totalIncome), currency, '', locale)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">{t('budget.leftoverFromReset')}</p>
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    parseFloat(initialBudgetSummary.leftoverFromReset) > 0
                      ? 'text-blue-600'
                      : parseFloat(initialBudgetSummary.leftoverFromReset) < 0
                      ? 'text-red-600'
                      : 'text-zinc-400'
                  }`}
                >
                  {parseFloat(initialBudgetSummary.leftoverFromReset) > 0 ? '+' : ''}
                  {parseFloat(initialBudgetSummary.leftoverFromReset) !== 0
                    ? formatCurrency(parseFloat(initialBudgetSummary.leftoverFromReset), currency, '', locale)
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">{t('budget.totalAssigned')}</p>
                <p className="text-sm font-semibold text-zinc-900 tabular-nums">
                  -{formatCurrency(parseFloat(initialBudgetSummary.totalAssigned), currency, '', locale)}
                </p>
              </div>
              {initialBudgets.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInitializeMonth}
                  disabled={isPending}
                >
                  <Play className="h-4 w-4 mr-1" />
                  {t('budget.initializeMonth')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Overview / Budget */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="overview">{t('budget.breakdown')}</TabsTrigger>
          <TabsTrigger value="budget">{t('budget.assign')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {/* Summary Cards */}
          <div className="mb-6">
            <SummaryCards
              statistics={optimisticStatistics}
              currency={currency}
              locale={locale}
            />
          </div>

          {/* Split View: Bills + Sinking Funds */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <BillsChecklist
              initialBills={initialBills}
              currency={currency}
              locale={locale}
            />
            <SinkingFundsProgress
              funds={initialSinkingFunds}
              currency={currency}
              locale={locale}
            />
          </div>
        </TabsContent>

        <TabsContent value="budget" className="mt-4">
          {/* Budget Table for assigning money to categories */}
          <BudgetTable
            budgets={initialBudgets}
            suggestedAmounts={suggestedAmounts}
            currency={currency}
            locale={locale}
            month={monthIso}
          />
        </TabsContent>
      </Tabs>

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
          categories={categories}
          currency={currency}
          locale={locale}
          onOptimisticCreate={handleOptimisticCreate}
        />
      </div>

      {/* Transaction List with Optimistic Updates */}
      <TransactionList
        initialTransactions={optimisticTransactions}
        categories={categories}
        currency={currency}
        locale={locale}
        onOptimisticUpdate={handleOptimisticUpdate}
        onOptimisticDelete={handleOptimisticDelete}
      />
    </>
  )
}
