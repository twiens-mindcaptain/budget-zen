'use client'

import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { MonthlyStatistics, SafeToSpendData } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'

interface SummaryCardsProps {
  statistics: MonthlyStatistics
  safeToSpendData: SafeToSpendData
  currency: string
  locale: string
}

export function SummaryCards({ statistics, safeToSpendData, currency, locale }: SummaryCardsProps) {
  const t = useTranslations()
  const income = parseFloat(statistics.income)
  const expenses = parseFloat(statistics.expenses)
  const balance = parseFloat(statistics.balance)
  const safeToSpend = parseFloat(safeToSpendData.safeToSpend)
  const totalLiquid = parseFloat(safeToSpendData.totalLiquid)
  const pendingBills = parseFloat(safeToSpendData.pendingBills)
  const sinkingContributions = parseFloat(safeToSpendData.sinkingContributions)

  const isNegativeSafeToSpend = safeToSpend < 0

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {/* Safe to Spend Card - Prominent */}
      <div className="md:col-span-3 bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-zinc-500">
            {t('budget.safeToSpend')}
          </div>
          <Wallet className="h-4 w-4 text-zinc-400" />
        </div>
        <div
          className={`text-4xl font-bold tabular-nums ${
            isNegativeSafeToSpend ? 'text-red-600' : 'text-emerald-600'
          }`}
        >
          {formatCurrency(
            Math.abs(safeToSpend),
            currency,
            isNegativeSafeToSpend ? '-' : '',
            locale
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          {formatCurrency(totalLiquid, currency, '', locale)} {t('budget.totalCash')} -{' '}
          {formatCurrency(pendingBills, currency, '', locale)} {t('budget.pendingBills')} -{' '}
          {formatCurrency(sinkingContributions, currency, '', locale)}{' '}
          {t('budget.sinkingContributions')}
        </p>
      </div>

      {/* Income Card */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            {t('statistics.totalIncome')}
          </div>
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
        </div>
        <div className="text-2xl font-semibold text-zinc-900 tabular-nums">
          {formatCurrency(income, currency, '', locale)}
        </div>
        <p className="text-xs text-zinc-500 mt-1">{t('dashboard.thisMonth')}</p>
      </div>

      {/* Expenses Card */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            {t('statistics.totalExpenses')}
          </div>
          <TrendingDown className="h-3.5 w-3.5 text-zinc-400" />
        </div>
        <div className="text-2xl font-semibold text-zinc-900 tabular-nums">
          {formatCurrency(expenses, currency, '', locale)}
        </div>
        <p className="text-xs text-zinc-500 mt-1">{t('dashboard.thisMonth')}</p>
      </div>

      {/* Net Flow Card */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            {t('statistics.netFlow')}
          </div>
          <div className="h-3.5 w-3.5 rounded-full bg-zinc-100" />
        </div>
        <div
          className={`text-2xl font-semibold tabular-nums ${
            balance >= 0 ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          {formatCurrency(Math.abs(balance), currency, balance >= 0 ? '+' : '-', locale)}
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          {balance >= 0 ? t('statistics.surplus') : t('statistics.deficit')}
        </p>
      </div>
    </div>
  )
}
