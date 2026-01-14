'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCategoryIcon } from '@/lib/icon-mapper'
import { formatCurrency } from '@/lib/currency'
import { PiggyBank } from 'lucide-react'
import type { SinkingFundItem } from '@/lib/types'

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

  const totalMonthlyContribution = funds.reduce(
    (sum, fund) => sum + parseFloat(fund.monthly_impact),
    0
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <PiggyBank className="w-4 h-4" />
            {t('budget.sinkingFundsProgress')}
          </CardTitle>
          <div className="text-sm text-zinc-500">
            {formatCurrency(totalMonthlyContribution, currency, '', locale)}/mo
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {funds.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            {t('budget.noSinkingFunds')}
          </div>
        ) : (
          funds.map((fund) => {
            const CategoryIcon = getCategoryIcon(fund.category_icon)
            const saved = parseFloat(fund.saved_balance)
            const target = parseFloat(fund.amount)
            const progress = fund.progress_percentage

            return (
              <div key={fund.id} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${fund.category_color}15` }}
                  >
                    <CategoryIcon
                      className="w-4 h-4"
                      style={{ color: fund.category_color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-900 truncate">
                      {fund.name}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {formatCurrency(saved, currency, '', locale)} /{' '}
                      {formatCurrency(target, currency, '', locale)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-zinc-900 tabular-nums">
                    {progress}%
                  </div>
                </div>

                <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: fund.category_color,
                    }}
                  />
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
