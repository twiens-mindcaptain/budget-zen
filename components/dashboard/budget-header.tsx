'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/currency'
import { format, addMonths, subMonths } from 'date-fns'
import { de, enUS } from 'date-fns/locale'
import type { BudgetSummary } from '@/lib/types'

interface BudgetHeaderProps {
  initialSummary: BudgetSummary
  currency: string
  locale: string
  onMonthChange?: (month: Date) => void
}

export function BudgetHeader({
  initialSummary,
  currency,
  locale,
  onMonthChange,
}: BudgetHeaderProps) {
  const t = useTranslations()
  const [isPending, startTransition] = useTransition()

  // Parse initial month from summary
  const [currentMonth, setCurrentMonth] = useState(() => {
    const [year, month] = initialSummary.month.split('-').map(Number)
    return new Date(year, month - 1, 1)
  })

  const [summary, setSummary] = useState(initialSummary)

  const dateLocale = locale === 'de-DE' ? de : enUS
  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: dateLocale })

  const toBeBudgeted = parseFloat(summary.toBeBudgeted)
  const isOverBudgeted = toBeBudgeted < 0

  const handlePrevMonth = () => {
    const newMonth = subMonths(currentMonth, 1)
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1)
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  const handleToday = () => {
    const today = new Date()
    const newMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevMonth}
            disabled={isPending}
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
            disabled={isPending}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToday}
            disabled={isPending}
            className="ml-2"
          >
            <Calendar className="h-4 w-4 mr-1" />
            {t('budget.today')}
          </Button>
        </div>
      </div>

      {/* To Be Budgeted Card */}
      <Card
        className={`${
          isOverBudgeted
            ? 'bg-red-50 border-red-200'
            : toBeBudgeted > 0
            ? 'bg-amber-50 border-amber-200'
            : 'bg-emerald-50 border-emerald-200'
        }`}
      >
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
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

            {/* Summary Stats */}
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-xs text-zinc-500">{t('budget.totalIncome')}</p>
                <p className="text-sm font-semibold text-emerald-600 tabular-nums">
                  +{formatCurrency(parseFloat(summary.totalIncome), currency, '', locale)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">{t('budget.leftoverFromReset')}</p>
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    parseFloat(summary.leftoverFromReset) > 0
                      ? 'text-blue-600'
                      : parseFloat(summary.leftoverFromReset) < 0
                      ? 'text-red-600'
                      : 'text-zinc-400'
                  }`}
                >
                  {parseFloat(summary.leftoverFromReset) > 0 ? '+' : ''}
                  {parseFloat(summary.leftoverFromReset) !== 0
                    ? formatCurrency(parseFloat(summary.leftoverFromReset), currency, '', locale)
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">{t('budget.totalAssigned')}</p>
                <p className="text-sm font-semibold text-zinc-900 tabular-nums">
                  -{formatCurrency(parseFloat(summary.totalAssigned), currency, '', locale)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
