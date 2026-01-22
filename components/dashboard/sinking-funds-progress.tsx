'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getCategoryIcon } from '@/lib/icon-mapper'
import { formatCurrency } from '@/lib/currency'
import { PiggyBank, ChevronDown, ChevronUp } from 'lucide-react'
import type { SinkingFundItem } from '@/lib/types'

const MAX_VISIBLE_ITEMS = 4

interface SinkingFundsProgressProps {
  funds: SinkingFundItem[]
  currency: string
  locale: string
}

export function SinkingFundsProgress({
  funds,
  currency,
  locale,
}: SinkingFundsProgressProps) {
  const t = useTranslations()
  const [showAll, setShowAll] = useState(false)

  const totalSaved = funds.reduce(
    (sum, fund) => sum + parseFloat(fund.saved_balance),
    0
  )
  const totalTarget = funds.reduce(
    (sum, fund) => sum + parseFloat(fund.target_amount),
    0
  )
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0

  // Sort by progress (lowest first to prioritize what needs attention)
  const sortedFunds = [...funds].sort((a, b) => a.progress_percentage - b.progress_percentage)

  const visibleFunds = showAll ? sortedFunds : sortedFunds.slice(0, MAX_VISIBLE_ITEMS)
  const hasMoreItems = sortedFunds.length > MAX_VISIBLE_ITEMS

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <PiggyBank className="w-4 h-4" />
            {t('budget.sinkingFundsProgress')}
          </CardTitle>
          <div className="text-sm text-zinc-500">
            {overallProgress}% {t('budget.saved')}
          </div>
        </div>
        {/* Overall progress bar */}
        {totalTarget > 0 && (
          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedFunds.length === 0 ? (
          <div className="text-center py-6 text-zinc-500 text-sm">
            {t('budget.noSinkingFunds')}
          </div>
        ) : (
          <>
            {visibleFunds.map((fund) => {
              const CategoryIcon = getCategoryIcon(fund.icon)
              const saved = parseFloat(fund.saved_balance)
              const target = parseFloat(fund.target_amount)
              const progress = fund.progress_percentage

              return (
                <div key={fund.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${fund.color}15` }}
                    >
                      <CategoryIcon
                        className="w-3.5 h-3.5"
                        style={{ color: fund.color }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-zinc-900 truncate">
                          {fund.name}
                        </span>
                        <span className="text-xs font-semibold text-zinc-600 tabular-nums whitespace-nowrap">
                          {progress}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: fund.color,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>
                      {t('budget.sfSaved')}: {formatCurrency(saved, currency, '', locale)}
                    </span>
                    <span>
                      {t('budget.sfGoal')}: {formatCurrency(target, currency, '', locale)}
                    </span>
                  </div>
                </div>
              )
            })}

            {/* Show more/less button */}
            {hasMoreItems && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-zinc-500 hover:text-zinc-700 h-8"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    {t('budget.showLess')}
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    {t('budget.showMore', { count: sortedFunds.length - MAX_VISIBLE_ITEMS })}
                  </>
                )}
              </Button>
            )}

            {/* Total saved summary */}
            <div className="pt-2 border-t border-zinc-100 flex justify-between items-center text-sm">
              <span className="text-zinc-500">{t('budget.totalSaved')}</span>
              <span className="font-semibold text-zinc-900 tabular-nums">
                {formatCurrency(totalSaved, currency, '', locale)}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
