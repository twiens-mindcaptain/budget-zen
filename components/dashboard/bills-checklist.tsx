'use client'

import { useState, useOptimistic } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getCategoryIcon } from '@/lib/icon-mapper'
import { formatCurrency } from '@/lib/currency'
import { markBillPaid } from '@/app/actions/transaction'
import { Receipt, CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react'
import type { BillItem } from '@/lib/types'
import { toast } from 'sonner'

const MAX_VISIBLE_ITEMS = 4

interface BillsChecklistProps {
  initialBills: BillItem[]
  currency: string
  locale: string
}

export function BillsChecklist({
  initialBills,
  currency,
  locale,
}: BillsChecklistProps) {
  const t = useTranslations()
  const [pendingBillId, setPendingBillId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const [optimisticBills, updateOptimisticBills] = useOptimistic(
    initialBills,
    (state, billId: string) => {
      return state.map((bill) =>
        bill.id === billId ? { ...bill, is_paid: true } : bill
      )
    }
  )

  const handleBillToggle = async (bill: BillItem) => {
    if (bill.is_paid) {
      toast.info(t('budget.undoPaymentHint'))
      return
    }

    setPendingBillId(bill.id)
    updateOptimisticBills(bill.id)

    const result = await markBillPaid(bill.id)
    setPendingBillId(null)

    if (result.success) {
      toast.success(`${bill.name} marked as paid`)
    } else {
      updateOptimisticBills(bill.id) // Revert
      toast.error(result.error)
    }
  }

  // Sort: unpaid first, then paid
  const sortedBills = [...optimisticBills].sort((a, b) => {
    if (a.is_paid === b.is_paid) return 0
    return a.is_paid ? 1 : -1
  })

  const paidCount = sortedBills.filter((b) => b.is_paid).length
  const totalCount = sortedBills.length
  const unpaidTotal = sortedBills
    .filter((b) => !b.is_paid)
    .reduce((sum, b) => sum + parseFloat(b.target_amount), 0)

  const visibleBills = showAll ? sortedBills : sortedBills.slice(0, MAX_VISIBLE_ITEMS)
  const hasMoreItems = sortedBills.length > MAX_VISIBLE_ITEMS

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            {t('budget.billsChecklist')}
          </CardTitle>
          <div className="text-sm text-zinc-500">
            {paidCount}/{totalCount} {t('budget.paid')}
          </div>
        </div>
        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${(paidCount / totalCount) * 100}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedBills.length === 0 ? (
          <div className="text-center py-6 text-zinc-500 text-sm">
            {t('budget.noBills')}
          </div>
        ) : (
          <>
            {visibleBills.map((bill) => {
              const CategoryIcon = getCategoryIcon(bill.icon)
              const isPending = pendingBillId === bill.id

              return (
                <button
                  key={bill.id}
                  onClick={() => handleBillToggle(bill)}
                  disabled={isPending}
                  className={`
                    w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all
                    ${
                      bill.is_paid
                        ? 'bg-emerald-50/50 border-emerald-100'
                        : 'bg-white border-zinc-200 hover:bg-zinc-50'
                    }
                    ${isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex-shrink-0">
                    {bill.is_paid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-zinc-300" />
                    )}
                  </div>

                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${bill.color}15` }}
                  >
                    <CategoryIcon
                      className="w-3.5 h-3.5"
                      style={{ color: bill.color }}
                    />
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <div
                      className={`text-sm font-medium truncate ${
                        bill.is_paid ? 'line-through text-zinc-400' : 'text-zinc-900'
                      }`}
                    >
                      {bill.name}
                    </div>
                  </div>

                  <div
                    className={`text-sm font-semibold tabular-nums ${
                      bill.is_paid ? 'text-zinc-400' : 'text-zinc-900'
                    }`}
                  >
                    {formatCurrency(parseFloat(bill.target_amount), currency, '', locale)}
                  </div>
                </button>
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
                    {t('budget.showMore', { count: sortedBills.length - MAX_VISIBLE_ITEMS })}
                  </>
                )}
              </Button>
            )}

            {/* Unpaid total */}
            {unpaidTotal > 0 && (
              <div className="pt-2 border-t border-zinc-100 flex justify-between items-center text-sm">
                <span className="text-zinc-500">{t('budget.pending')}</span>
                <span className="font-semibold text-zinc-900 tabular-nums">
                  {formatCurrency(unpaidTotal, currency, '', locale)}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
