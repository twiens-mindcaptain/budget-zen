'use client'

import { useTranslations } from 'next-intl'
import { CategoriesTab } from '@/components/settings/categories-tab'
import type { Category } from '@/lib/types'

interface SettingsTabsProps {
  categories: Category[]
}

export function SettingsTabs({ categories }: SettingsTabsProps) {
  const t = useTranslations()

  return (
    <div className="w-full">
      <h2 className="text-lg font-semibold mb-6">{t('settings.categories.title')}</h2>
      <CategoriesTab initialCategories={categories} />
    </div>
  )
}
