'use client'

import { useState, useOptimistic } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCategoryIcon } from '@/lib/icon-mapper'
import { formatCurrency } from '@/lib/currency'
import { markBillPaid } from '@/app/actions/transaction'
import { Receipt, CheckCircle2, Circle } from 'lucide-react'
import type { BillItem } from '@/lib/types'
import { toast } from 'sonner'

interface BillsChecklistProps {
  initialBills: BillItem[]
  accounts: any[]
  currency: string
  locale: string
}

export function BillsChecklist({
  initialBills,
  accounts,
  currency,
  locale,
}: BillsChecklistProps) {
  const t = useTranslations()
  const [pendingBillId, setPendingBillId] = useState<string | null>(null)

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
      toast.info('To undo payment, delete the transaction from the list below')
      return
    }

    const defaultAccount = accounts[0]
    if (!defaultAccount) {
      toast.error('No account found. Please create an account first.')
      return
    }

    setPendingBillId(bill.id)
    updateOptimisticBills(bill.id)

    const result = await markBillPaid(bill.id, defaultAccount.id)
    setPendingBillId(null)

    if (result.success) {
      toast.success(`${bill.name} marked as paid`)
    } else {
      updateOptimisticBills(bill.id) // Revert
      toast.error(result.error)
    }
  }

  const unpaidTotal = optimisticBills
    .filter((b) => !b.is_paid)
    .reduce((sum, b) => sum + parseFloat(b.monthly_impact), 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            {t('budget.billsChecklist')}
          </CardTitle>
          <div className="text-sm text-zinc-500">
            {formatCurrency(unpaidTotal, currency, '', locale)} {t('budget.pending')}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {optimisticBills.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            {t('budget.noBills')}
          </div>
        ) : (
          optimisticBills.map((bill) => {
            const CategoryIcon = getCategoryIcon(bill.category_icon)
            const isPending = pendingBillId === bill.id

            return (
              <button
                key={bill.id}
                onClick={() => handleBillToggle(bill)}
                disabled={isPending}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-lg border transition-all
                  ${
                    bill.is_paid
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white border-zinc-200 hover:bg-zinc-50'
                  }
                  ${isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                `}
              >
                <div className="flex-shrink-0">
                  {bill.is_paid ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-zinc-400" />
                  )}
                </div>

                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${bill.category_color}15` }}
                >
                  <CategoryIcon
                    className="w-4 h-4"
                    style={{ color: bill.category_color }}
                  />
                </div>

                <div className="flex-1 text-left">
                  <div
                    className={`text-sm font-medium ${
                      bill.is_paid ? 'line-through text-zinc-500' : 'text-zinc-900'
                    }`}
                  >
                    {bill.name}
                  </div>
                </div>

                <div
                  className={`text-sm font-semibold tabular-nums ${
                    bill.is_paid ? 'text-zinc-500' : 'text-zinc-900'
                  }`}
                >
                  {formatCurrency(parseFloat(bill.monthly_impact), currency, '', locale)}
                </div>
              </button>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
