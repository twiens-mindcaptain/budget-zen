'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CategoryDialog } from '@/components/settings/category-dialog'
import { DeleteCategoryDialog } from '@/components/settings/delete-category-dialog'
import { getCategoryIcon } from '@/lib/icon-mapper'
import { getCategoryDisplayName } from '@/lib/i18n-helpers'

interface Category {
  id: string
  name: string | null
  translation_key?: string | null
  icon: string
  color: string
  type: 'income' | 'expense'
  budget_type?: string
  target_amount?: string | null
  frequency?: string
  monthly_target?: string | null
}

interface CategoriesTabProps {
  initialCategories: Category[]
}

export function CategoriesTab({ initialCategories }: CategoriesTabProps) {
  const t = useTranslations()
  const [categories, setCategories] = useState(initialCategories)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Separate categories by type
  const incomeCategories = categories.filter((c) => c.type === 'income')
  const expenseCategories = categories.filter((c) => c.type === 'expense')

  const handleEditClick = (category: Category) => {
    setSelectedCategory(category)
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (category: Category) => {
    setSelectedCategory(category)
    setIsDeleteDialogOpen(true)
  }

  const handleCategoryCreated = (newCategory: Category) => {
    setCategories([...categories, newCategory])
    setIsCreateDialogOpen(false)
  }

  const handleCategoryUpdated = (updatedCategory: Category) => {
    setCategories(
      categories.map((c) => (c.id === updatedCategory.id ? updatedCategory : c))
    )
    setIsEditDialogOpen(false)
    setSelectedCategory(null)
  }

  const handleCategoryDeleted = (deletedId: string) => {
    setCategories(categories.filter((c) => c.id !== deletedId))
    setIsDeleteDialogOpen(false)
    setSelectedCategory(null)
  }

  const renderCategoryCard = (category: Category) => {
    const CategoryIcon = getCategoryIcon(category.icon)

    return (
      <div
        key={category.id}
        className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: `${category.color}15`,
            }}
          >
            <CategoryIcon
              className="w-6 h-6"
              style={{ color: category.color }}
            />
          </div>

          {/* Category Info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-zinc-900">
              {getCategoryDisplayName(category, t)}
            </div>
            <div className="text-xs text-zinc-500 capitalize">
              {t(`transaction.${category.type}`)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditClick(category)}
              className="h-8 w-8 p-0"
            >
              <Pencil className="w-4 h-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteClick(category)}
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
          <h2 className="text-lg font-medium text-zinc-900">
            {t('settings.categories.title')}
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {t('settings.categories.description')}
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('settings.categories.addNew')}
        </Button>
      </div>

      {/* Income Categories */}
      <div>
        <h3 className="text-sm font-medium text-zinc-700 mb-3">
          {t('settings.categories.incomeCategories')} ({incomeCategories.length})
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {incomeCategories.map(renderCategoryCard)}
          {incomeCategories.length === 0 && (
            <div className="col-span-2 text-center py-8 text-zinc-500 text-sm">
              {t('settings.categories.noIncome')}
            </div>
          )}
        </div>
      </div>

      {/* Expense Categories */}
      <div>
        <h3 className="text-sm font-medium text-zinc-700 mb-3">
          {t('settings.categories.expenseCategories')} ({expenseCategories.length})
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {expenseCategories.map(renderCategoryCard)}
          {expenseCategories.length === 0 && (
            <div className="col-span-2 text-center py-8 text-zinc-500 text-sm">
              {t('settings.categories.noExpense')}
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <CategoryDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCategoryCreated}
      />

      {/* Edit Dialog */}
      {selectedCategory && (
        <CategoryDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          category={selectedCategory}
          onSuccess={handleCategoryUpdated}
        />
      )}

      {/* Delete Dialog */}
      {selectedCategory && (
        <DeleteCategoryDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          category={selectedCategory}
          onSuccess={handleCategoryDeleted}
        />
      )}
    </div>
  )
}
