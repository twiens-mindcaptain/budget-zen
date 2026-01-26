'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select'
import { createTransaction } from '@/app/actions/transaction'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { getCategoryDisplayName } from '@/lib/i18n-helpers'
import { getCategoryIcon } from '@/lib/icon-mapper'
import { CategoryDialog } from '@/components/settings/category-dialog'
import type { Category as FullCategory } from '@/lib/types'

interface Category {
  id: string
  name: string | null
  icon: string | null
  color: string | null
  type: string
}

interface InlineQuickAddProps {
  categories: Category[]
  currency: string
  locale: string
  onOptimisticCreate: (transaction: any) => void
}

export function InlineQuickAdd({
  categories,
  currency,
  locale,
  onOptimisticCreate,
}: InlineQuickAddProps) {
  const t = useTranslations()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const amountInputRef = useRef<HTMLInputElement>(null)

  // Filter categories - exclude INCOME for default view (most common use case)
  const expenseCategories = categories.filter(
    (c) => c.type?.toUpperCase() !== 'INCOME'
  )
  const incomeCategories = categories.filter(
    (c) => c.type?.toUpperCase() === 'INCOME'
  )

  // Determine if we're adding income based on amount prefix
  const isIncome = amount.startsWith('+')
  const relevantCategories = isIncome ? incomeCategories : expenseCategories

  // Find most used category (first non-income category as default)
  const defaultCategory = expenseCategories[0]

  // Auto-focus amount input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      amountInputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow digits, comma, period, and + prefix
    const filtered = value.replace(/[^\d,.+-]/g, '')
    setAmount(filtered)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && amount) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleCategoryChange = (value: string) => {
    if (value === '__new__') {
      setShowCategoryDialog(true)
    } else {
      setCategoryId(value)
    }
  }

  const handleCategoryCreated = (newCategory: FullCategory) => {
    setCategoryId(newCategory.id)
    setShowCategoryDialog(false)
    router.refresh()
  }

  const handleSubmit = () => {
    if (!amount || isPending) return

    // Parse and validate amount
    const normalizedAmount = amount.replace(',', '.')
    const numericAmount = parseFloat(normalizedAmount.replace(/[+-]/g, ''))

    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const selectedCategoryId = categoryId || defaultCategory?.id
    const selectedCategory = categories.find((c) => c.id === selectedCategoryId)

    // Create optimistic transaction
    const optimisticTransaction = {
      id: `temp-${Date.now()}`,
      amount: isIncome ? numericAmount.toString() : (-numericAmount).toString(),
      date: format(new Date(), 'yyyy-MM-dd'),
      memo: null,
      category_id: selectedCategoryId || null,
      category: selectedCategory
        ? {
            id: selectedCategory.id,
            name: selectedCategory.name,
            icon: selectedCategory.icon,
            color: selectedCategory.color,
            type: selectedCategory.type,
          }
        : null,
    }

    // Optimistic update
    onOptimisticCreate(optimisticTransaction)

    // Clear form immediately for rapid entry
    setAmount('')
    setCategoryId('')
    amountInputRef.current?.focus()

    // Server action
    startTransition(async () => {
      const result = await createTransaction({
        amount: normalizedAmount,
        category_id: selectedCategoryId || undefined,
        date: format(new Date(), 'yyyy-MM-dd'),
      })

      if (!result.success) {
        toast.error(result.error || 'Failed to add transaction')
      }

      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
      {/* Amount Input */}
      <div className="relative flex-shrink-0 w-32">
        <Input
          ref={amountInputRef}
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={handleAmountChange}
          onKeyDown={handleKeyDown}
          placeholder="0,00"
          className="bg-white text-right font-mono tabular-nums pr-8"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">
          {currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency}
        </span>
      </div>

      {/* Category Select */}
      <Select value={categoryId} onValueChange={handleCategoryChange}>
        <SelectTrigger className="w-44 bg-white">
          <SelectValue placeholder={defaultCategory ? getCategoryDisplayName(defaultCategory) : t('transaction.category')}>
            {categoryId && (() => {
              const cat = categories.find((c) => c.id === categoryId)
              if (!cat) return t('transaction.category')
              const Icon = getCategoryIcon(cat.icon)
              return (
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center"
                    style={{ backgroundColor: cat.color || '#e5e7eb' }}
                  >
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                  <span className="truncate">
                    {getCategoryDisplayName(cat)}
                  </span>
                </div>
              )
            })()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {relevantCategories.map((category) => {
            const Icon = getCategoryIcon(category.icon)
            return (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center"
                    style={{ backgroundColor: category.color || '#e5e7eb' }}
                  >
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                  <span>{getCategoryDisplayName(category)}</span>
                </div>
              </SelectItem>
            )
          })}
          {isIncome && incomeCategories.length === 0 && (
            <SelectItem value="" disabled>
              {t('transaction.noIncomeCategories')}
            </SelectItem>
          )}
          <SelectSeparator />
          <SelectItem value="__new__">
            <div className="flex items-center gap-2 text-blue-600">
              <PlusCircle className="w-4 h-4" />
              <span>{t('transaction.newCategory')}</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Add Button */}
      <Button
        onClick={handleSubmit}
        disabled={!amount || isPending}
        size="sm"
        className="flex-shrink-0"
      >
        <Plus className="w-4 h-4 mr-1" />
        {t('transaction.add')}
      </Button>

      {/* Hint */}
      <span className="text-xs text-zinc-400 ml-2 hidden sm:inline">
        {t('transaction.enterToSave')}
      </span>

      {/* Category Dialog */}
      <CategoryDialog
        open={showCategoryDialog}
        onOpenChange={setShowCategoryDialog}
        onSuccess={handleCategoryCreated}
      />
    </div>
  )
}
