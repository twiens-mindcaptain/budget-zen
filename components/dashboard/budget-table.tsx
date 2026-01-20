'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getCategoryIcon } from '@/lib/icon-mapper'
import { getCategoryDisplayName } from '@/lib/i18n-helpers'
import { formatCurrency } from '@/lib/currency'
import { assignBudget } from '@/app/actions/budgets'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import type { MonthlyBudgetWithActivity, ZBBCategoryType } from '@/lib/types'

interface BudgetTableProps {
  budgets: MonthlyBudgetWithActivity[]
  suggestedAmounts?: Record<string, string> // category_id -> suggested amount
  currency: string
  locale: string
  month: string // YYYY-MM-DD
}

export function BudgetTable({ budgets, suggestedAmounts = {}, currency, locale, month }: BudgetTableProps) {
  const t = useTranslations()
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  type BudgetAction =
    | { type: 'update'; categoryId: string; assigned_amount: string }

  const [optimisticBudgets, updateOptimisticBudgets] = useOptimistic(
    budgets,
    (state, action: BudgetAction) => {
      if (action.type === 'update') {
        return state.map((b) => {
          if (b.category_id === action.categoryId) {
            const newAssigned = parseFloat(action.assigned_amount)
            const startBalance = parseFloat(b.start_balance)
            const activity = parseFloat(b.activity)
            const newAvailable = startBalance + newAssigned + activity
            return {
              ...b,
              assigned_amount: newAssigned.toFixed(2),
              available: newAvailable.toFixed(2),
            }
          }
          return b
        })
      }
      return state
    }
  )

  // Group budgets by ZBB type
  const groupedBudgets: Record<ZBBCategoryType, MonthlyBudgetWithActivity[]> = {
    INCOME: [],
    FIX: [],
    VARIABLE: [],
    SF1: [],
    SF2: [],
  }

  for (const budget of optimisticBudgets) {
    const zbbType = (budget.category.type || 'VARIABLE') as ZBBCategoryType
    if (groupedBudgets[zbbType]) {
      groupedBudgets[zbbType].push(budget)
    }
  }

  const handleAssignClick = (budget: MonthlyBudgetWithActivity) => {
    setEditingId(budget.category_id)
    setEditValue(budget.assigned_amount)
  }

  const handleAssignBlur = async (budget: MonthlyBudgetWithActivity) => {
    if (editingId !== budget.category_id) return

    const newAmount = parseFloat(editValue) || 0

    // If amount hasn't changed, just close the editor
    if (newAmount.toFixed(2) === budget.assigned_amount) {
      setEditingId(null)
      return
    }

    // Optimistic update
    updateOptimisticBudgets({
      type: 'update',
      categoryId: budget.category_id,
      assigned_amount: newAmount.toFixed(2),
    })

    setEditingId(null)

    // Server update
    startTransition(async () => {
      const result = await assignBudget(
        budget.category_id,
        month,
        newAmount.toFixed(2)
      )
      if (!result.success) {
        toast.error(result.error)
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent, budget: MonthlyBudgetWithActivity) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAssignBlur(budget)
    } else if (e.key === 'Escape') {
      setEditingId(null)
    }
  }

  const handleAutoFill = (budget: MonthlyBudgetWithActivity, suggestedAmount: string) => {
    const newAmount = parseFloat(suggestedAmount)

    // Optimistic update
    updateOptimisticBudgets({
      type: 'update',
      categoryId: budget.category_id,
      assigned_amount: newAmount.toFixed(2),
    })

    // Server update
    startTransition(async () => {
      const result = await assignBudget(
        budget.category_id,
        month,
        newAmount.toFixed(2)
      )
      if (result.success) {
        toast.success(t('budget.autoFillSuccess'))
      } else {
        toast.error(result.error)
      }
    })
  }

  const renderBudgetRow = (budget: MonthlyBudgetWithActivity) => {
    const { category } = budget
    const CategoryIcon = getCategoryIcon(category.icon)
    const startBalance = parseFloat(budget.start_balance)
    const assigned = parseFloat(budget.assigned_amount)
    const activity = parseFloat(budget.activity)
    const available = parseFloat(budget.available)
    const isOverspent = available < 0
    const isEditing = editingId === budget.category_id
    const isSinkingFund = category.type === 'SF1' || category.type === 'SF2'
    const suggestedAmount = suggestedAmounts[budget.category_id]
    const hasSuggestion = suggestedAmount && parseFloat(suggestedAmount) > 0
    const suggestionDiffers = hasSuggestion && suggestedAmount !== budget.assigned_amount

    return (
      <div
        key={budget.category_id}
        className="flex items-center gap-3 py-2 px-3 hover:bg-zinc-50 rounded-lg transition-colors"
      >
        {/* Category Icon & Name */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${category.color || '#71717a'}15` }}
        >
          <CategoryIcon className="w-4 h-4" style={{ color: category.color || '#71717a' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-zinc-900 truncate">
            {getCategoryDisplayName(category, t)}
          </div>
        </div>

        {/* Carryover (Übertrag) */}
        <div className="w-24 text-right">
          <span
            className={`text-sm tabular-nums ${
              startBalance > 0
                ? isSinkingFund ? 'text-blue-600' : 'text-zinc-500'
                : startBalance < 0 ? 'text-red-600' : 'text-zinc-400'
            }`}
          >
            {startBalance !== 0
              ? formatCurrency(Math.abs(startBalance), currency, startBalance < 0 ? '-' : '', locale)
              : '—'}
          </span>
        </div>

        {/* Assigned */}
        <div className="w-24 text-right flex items-center justify-end gap-1">
          {isEditing ? (
            <Input
              type="number"
              step="0.01"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleAssignBlur(budget)}
              onKeyDown={(e) => handleKeyDown(e, budget)}
              autoFocus
              className="h-7 text-sm text-right tabular-nums"
            />
          ) : (
            <>
              {suggestionDiffers && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAutoFill(budget, suggestedAmount!)}
                  disabled={isPending}
                  className="h-6 w-6 p-0 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                  title={t('budget.autoFillHint', { amount: formatCurrency(parseFloat(suggestedAmount!), currency, '', locale) })}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </Button>
              )}
              <button
                onClick={() => handleAssignClick(budget)}
                className="text-sm tabular-nums text-zinc-700 hover:text-zinc-900 hover:underline"
              >
                {formatCurrency(assigned, currency, '', locale)}
              </button>
            </>
          )}
        </div>

        {/* Activity */}
        <div className="w-24 text-right">
          <span
            className={`text-sm tabular-nums ${
              activity < 0 ? 'text-red-600' : activity > 0 ? 'text-emerald-600' : 'text-zinc-400'
            }`}
          >
            {activity !== 0
              ? formatCurrency(Math.abs(activity), currency, activity < 0 ? '-' : '+', locale)
              : '—'}
          </span>
        </div>

        {/* Available / Total Saved for SF */}
        <div className="w-24 text-right">
          <span
            className={`text-sm font-semibold tabular-nums ${
              isOverspent ? 'text-red-600' : available > 0 ? (isSinkingFund ? 'text-blue-600' : 'text-emerald-600') : 'text-zinc-500'
            }`}
          >
            {formatCurrency(Math.abs(available), currency, isOverspent ? '-' : '', locale)}
          </span>
        </div>
      </div>
    )
  }

  const renderGroup = (
    title: string,
    budgets: MonthlyBudgetWithActivity[],
    zbbType: ZBBCategoryType
  ) => {
    if (budgets.length === 0) return null

    const isSinkingFund = zbbType === 'SF1' || zbbType === 'SF2'
    const totalStartBalance = budgets.reduce((sum, b) => sum + parseFloat(b.start_balance), 0)
    const totalAssigned = budgets.reduce((sum, b) => sum + parseFloat(b.assigned_amount), 0)
    const totalActivity = budgets.reduce((sum, b) => sum + parseFloat(b.activity), 0)
    const totalAvailable = budgets.reduce((sum, b) => sum + parseFloat(b.available), 0)

    return (
      <Card key={zbbType} className="mb-4">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-zinc-700">
              {title}
            </CardTitle>
            <div className="flex gap-4 text-xs text-zinc-500">
              <span className={`w-24 text-right ${totalStartBalance > 0 && isSinkingFund ? 'text-blue-600' : ''}`}>
                {totalStartBalance !== 0
                  ? formatCurrency(Math.abs(totalStartBalance), currency, totalStartBalance < 0 ? '-' : '', locale)
                  : '—'}
              </span>
              <span className="w-24 text-right">
                {formatCurrency(totalAssigned, currency, '', locale)}
              </span>
              <span className="w-24 text-right">
                {formatCurrency(Math.abs(totalActivity), currency, totalActivity < 0 ? '-' : '', locale)}
              </span>
              <span
                className={`w-24 text-right font-semibold ${
                  totalAvailable < 0 ? 'text-red-600' : (isSinkingFund ? 'text-blue-600' : 'text-emerald-600')
                }`}
              >
                {formatCurrency(Math.abs(totalAvailable), currency, totalAvailable < 0 ? '-' : '', locale)}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-0 px-1">
          {budgets.map(renderBudgetRow)}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {/* Column Headers */}
      <div className="flex items-center gap-3 py-2 px-3 text-xs text-zinc-500 font-medium">
        <div className="w-8 flex-shrink-0" />
        <div className="flex-1">{t('budget.title')}</div>
        <div className="w-24 text-right">{t('budget.startBalance')}</div>
        <div className="w-24 text-right">{t('budget.assigned')}</div>
        <div className="w-24 text-right">{t('budget.activity')}</div>
        <div className="w-24 text-right">{t('budget.available')}</div>
      </div>

      {/* Budget Groups */}
      {renderGroup(t('budget.zbbTypes.FIX'), groupedBudgets.FIX, 'FIX')}
      {renderGroup(t('budget.zbbTypes.VARIABLE'), groupedBudgets.VARIABLE, 'VARIABLE')}
      {renderGroup(t('budget.zbbTypes.SF1'), groupedBudgets.SF1, 'SF1')}
      {renderGroup(t('budget.zbbTypes.SF2'), groupedBudgets.SF2, 'SF2')}
    </div>
  )
}
