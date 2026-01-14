'use client'

import { useState, useOptimistic } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BudgetItemDialog } from '@/components/settings/budget-item-dialog'
import { DeleteBudgetItemDialog } from '@/components/settings/delete-budget-item-dialog'
import { getCategoryIcon } from '@/lib/icon-mapper'
import { getCategoryDisplayName } from '@/lib/i18n-helpers'
import { formatCurrency } from '@/lib/currency'
import type { BudgetItem, Category } from '@/lib/types'

interface BudgetItemsTabProps {
  initialItems: BudgetItem[]
  categories: Category[]
  currency: string
  locale: string
}

export function BudgetItemsTab({
  initialItems,
  categories,
  currency,
  locale,
}: BudgetItemsTabProps) {
  const t = useTranslations()
  const [selectedItem, setSelectedItem] = useState<BudgetItem | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  type ItemAction =
    | { type: 'create'; item: BudgetItem }
    | { type: 'update'; item: BudgetItem }
    | { type: 'delete'; id: string }

  const [optimisticItems, updateOptimisticItems] = useOptimistic(
    initialItems,
    (state: BudgetItem[], action: ItemAction) => {
      if (action.type === 'create') {
        return [...state, action.item]
      } else if (action.type === 'update') {
        return state.map((i) => (i.id === action.item.id ? action.item : i))
      } else if (action.type === 'delete') {
        return state.filter((i) => i.id !== action.id)
      }
      return state
    }
  )

  // Separate monthly bills from sinking funds based on frequency
  const monthlyBills = optimisticItems.filter((item) => item.frequency === 'monthly')
  const sinkingFunds = optimisticItems.filter((item) => item.frequency !== 'monthly')

  const handleEditClick = (item: BudgetItem) => {
    setSelectedItem(item)
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (item: BudgetItem) => {
    setSelectedItem(item)
    setIsDeleteDialogOpen(true)
  }

  const handleItemCreated = (newItem: BudgetItem) => {
    updateOptimisticItems({ type: 'create', item: newItem })
    setIsCreateDialogOpen(false)
  }

  const handleItemUpdated = (updatedItem: BudgetItem) => {
    updateOptimisticItems({ type: 'update', item: updatedItem })
    setIsEditDialogOpen(false)
    setSelectedItem(null)
  }

  const handleItemDeleted = (deletedId: string) => {
    updateOptimisticItems({ type: 'delete', id: deletedId })
    setIsDeleteDialogOpen(false)
    setSelectedItem(null)
  }

  const renderItemCard = (item: BudgetItem) => {
    const category = categories.find((c) => c.id === item.category_id)
    if (!category) return null

    const CategoryIcon = getCategoryIcon(category.icon || 'HelpCircle')
    const isMonthly = item.frequency === 'monthly'

    return (
      <div
        key={item.id}
        className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: category.color ? `${category.color}15` : '#f4f4f5',
            }}
          >
            <CategoryIcon
              className="w-6 h-6"
              style={{
                color: category.color || '#71717a',
              }}
            />
          </div>

          {/* Item Info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-zinc-900">{item.name}</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {getCategoryDisplayName(category, t)} •{' '}
              {t(`budgetItems.frequencies.${item.frequency}`)}
            </div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div className="text-sm">
                <span className="text-zinc-500">{t('budgetItems.amount')}:</span>{' '}
                <span className="font-semibold">
                  {formatCurrency(parseFloat(item.amount), currency, '', locale)}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-zinc-500">{t('budgetItems.monthlyImpact')}:</span>{' '}
                <span className="font-semibold">
                  {formatCurrency(parseFloat(item.monthly_impact), currency, '', locale)}/mo
                </span>
              </div>
              {!isMonthly && (
                <div className="text-sm">
                  <span className="text-zinc-500">{t('budgetItems.savedBalance')}:</span>{' '}
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(parseFloat(item.saved_balance), currency, '', locale)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditClick(item)}
              className="h-8 w-8 p-0"
            >
              <Pencil className="w-4 h-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteClick(item)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-zinc-900">{t('budgetItems.title')}</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{t('budgetItems.description')}</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('budgetItems.addNew')}
        </Button>
      </div>

      {/* Monthly Bills Section */}
      <div>
        <h3 className="text-sm font-medium text-zinc-700 mb-3">
          {t('budgetItems.monthlyBills')} ({monthlyBills.length})
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {monthlyBills.map(renderItemCard)}
          {monthlyBills.length === 0 && (
            <div className="col-span-2 text-center py-8 text-zinc-500 text-sm">
              {t('budget.noBills')}
            </div>
          )}
        </div>
      </div>

      {/* Sinking Funds Section */}
      <div>
        <h3 className="text-sm font-medium text-zinc-700 mb-3">
          {t('budgetItems.sinkingFunds')} ({sinkingFunds.length})
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {sinkingFunds.map(renderItemCard)}
          {sinkingFunds.length === 0 && (
            <div className="col-span-2 text-center py-8 text-zinc-500 text-sm">
              {t('budget.noSinkingFunds')}
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <BudgetItemDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        categories={categories}
        currency={currency}
        locale={locale}
        onSuccess={handleItemCreated}
      />

      {/* Edit Dialog */}
      {selectedItem && (
        <BudgetItemDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          item={selectedItem}
          categories={categories}
          currency={currency}
          locale={locale}
          onSuccess={handleItemUpdated}
        />
      )}

      {/* Delete Dialog */}
      {selectedItem && (
        <DeleteBudgetItemDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          item={selectedItem}
          onSuccess={handleItemDeleted}
        />
      )}
    </div>
  )
}
