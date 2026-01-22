'use client'

import { useState, useOptimistic, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  Banknote,
  Receipt,
  ShoppingCart,
  PiggyBank,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CategoryDialog } from '@/components/settings/category-dialog'
import { DeleteCategoryDialog } from '@/components/settings/delete-category-dialog'
import { getCategoryIcon } from '@/lib/icon-mapper'
import { getCategoryDisplayName } from '@/lib/i18n-helpers'
import type { Category } from '@/lib/types'

// ZBB type configuration with icons and colors
const ZBB_TYPE_CONFIG = {
  INCOME: {
    icon: Banknote,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  FIX: {
    icon: Receipt,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  VARIABLE: {
    icon: ShoppingCart,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  SF1: {
    icon: PiggyBank,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  SF2: {
    icon: Target,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
  },
} as const

// Order for displaying types
const TYPE_ORDER: Array<keyof typeof ZBB_TYPE_CONFIG> = ['INCOME', 'FIX', 'VARIABLE', 'SF1', 'SF2']

interface CategoriesTabProps {
  initialCategories: Category[]
}

export function CategoriesTab({ initialCategories }: CategoriesTabProps) {
  const t = useTranslations()
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  type CategoryAction =
    | { type: 'create'; category: Category }
    | { type: 'update'; category: Category }
    | { type: 'delete'; id: string }

  const [optimisticCategories, updateOptimisticCategories] = useOptimistic(
    initialCategories,
    (state: Category[], action: CategoryAction) => {
      if (action.type === 'create') {
        return [...state, action.category]
      } else if (action.type === 'update') {
        return state.map((c) => (c.id === action.category.id ? action.category : c))
      } else if (action.type === 'delete') {
        return state.filter((c) => c.id !== action.id)
      }
      return state
    }
  )

  // Filter categories by search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return optimisticCategories

    const query = searchQuery.toLowerCase()
    return optimisticCategories.filter((category) => {
      const displayName = getCategoryDisplayName(category, t).toLowerCase()
      return displayName.includes(query)
    })
  }, [optimisticCategories, searchQuery, t])

  // Group categories by ZBB type
  const categoriesByType = useMemo(() => {
    const groups: Record<string, Category[]> = {}
    TYPE_ORDER.forEach((type) => {
      groups[type] = []
    })

    filteredCategories.forEach((category) => {
      const type = category.type || 'VARIABLE'
      if (groups[type]) {
        groups[type].push(category)
      } else {
        groups['VARIABLE'].push(category) // Fallback
      }
    })

    // Sort each group alphabetically
    Object.keys(groups).forEach((type) => {
      groups[type].sort((a, b) =>
        getCategoryDisplayName(a, t).localeCompare(getCategoryDisplayName(b, t))
      )
    })

    return groups
  }, [filteredCategories, t])

  const toggleSection = (type: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const handleEditClick = (category: Category) => {
    setSelectedCategory(category)
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (category: Category) => {
    setSelectedCategory(category)
    setIsDeleteDialogOpen(true)
  }

  const handleCategoryCreated = (newCategory: Category) => {
    updateOptimisticCategories({ type: 'create', category: newCategory })
    setIsCreateDialogOpen(false)
  }

  const handleCategoryUpdated = (updatedCategory: Category) => {
    updateOptimisticCategories({ type: 'update', category: updatedCategory })
    setIsEditDialogOpen(false)
    setSelectedCategory(null)
  }

  const handleCategoryDeleted = (deletedId: string) => {
    updateOptimisticCategories({ type: 'delete', id: deletedId })
    setIsDeleteDialogOpen(false)
    setSelectedCategory(null)
  }

  const renderCategoryRow = (category: Category) => {
    const CategoryIcon = getCategoryIcon(category.icon || 'HelpCircle')
    const categoryColor = category.color || '#71717a'

    return (
      <div
        key={category.id}
        className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-zinc-50 transition-colors group"
      >
        {/* Icon */}
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: `${categoryColor}15`,
          }}
        >
          <CategoryIcon className="w-4 h-4" style={{ color: categoryColor }} />
        </div>

        {/* Category Name */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-zinc-900 truncate block">
            {getCategoryDisplayName(category, t)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditClick(category)}
            className="h-7 w-7 p-0"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(category)}
            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </div>
    )
  }

  const renderTypeSection = (type: keyof typeof ZBB_TYPE_CONFIG) => {
    const categories = categoriesByType[type] || []
    const config = ZBB_TYPE_CONFIG[type]
    const TypeIcon = config.icon
    const isCollapsed = collapsedSections.has(type)

    // Don't render empty sections when searching
    if (categories.length === 0 && searchQuery.trim()) {
      return null
    }

    return (
      <div key={type} className={`rounded-xl border ${config.borderColor} overflow-hidden`}>
        {/* Section Header */}
        <button
          onClick={() => toggleSection(type)}
          className={`w-full flex items-center gap-3 px-4 py-3 ${config.bgColor} hover:brightness-95 transition-all`}
        >
          <div className="flex items-center gap-2 flex-1">
            {isCollapsed ? (
              <ChevronRight className={`w-4 h-4 ${config.color}`} />
            ) : (
              <ChevronDown className={`w-4 h-4 ${config.color}`} />
            )}
            <TypeIcon className={`w-5 h-5 ${config.color}`} />
            <span className={`font-medium ${config.color}`}>
              {t(`settings.categories.types.${type}`)}
            </span>
          </div>
          <span className="text-sm text-zinc-500 tabular-nums">{categories.length}</span>
        </button>

        {/* Section Content */}
        {!isCollapsed && (
          <div className="bg-white p-2">
            {categories.length === 0 ? (
              <div className="text-center py-4 text-zinc-400 text-sm">
                {t('settings.categories.noCategories')}
              </div>
            ) : (
              <div className="space-y-0.5">{categories.map(renderCategoryRow)}</div>
            )}
          </div>
        )}
      </div>
    )
  }

  const totalCategories = optimisticCategories.length
  const filteredCount = filteredCategories.length

  return (
    <div className="space-y-4">
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input
          type="text"
          placeholder={t('settings.categories.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
        {searchQuery && filteredCount !== totalCategories && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
            {filteredCount} / {totalCategories}
          </span>
        )}
      </div>

      {/* Category Sections by Type */}
      <div className="space-y-3">
        {TYPE_ORDER.map(renderTypeSection)}
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
