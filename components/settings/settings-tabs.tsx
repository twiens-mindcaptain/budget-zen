'use client'

import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CategoriesTab } from '@/components/settings/categories-tab'
import { AccountsTab } from '@/components/settings/accounts-tab'
import { BudgetItemsTab } from '@/components/settings/budget-items-tab'
import type { Category, BudgetItem } from '@/lib/types'

interface Account {
  id: string
  name: string
  type: 'cash' | 'bank' | 'credit' | 'savings'
  initial_balance: string
  current_balance: string
}

interface SettingsTabsProps {
  categories: Category[]
  accounts: Account[]
  budgetItems: BudgetItem[]
  currency: string
  locale: string
}

export function SettingsTabs({
  categories,
  accounts,
  budgetItems,
  currency,
  locale,
}: SettingsTabsProps) {
  const t = useTranslations()

  return (
    <Tabs defaultValue="categories" className="w-full">
      <TabsList className="grid w-full grid-cols-3 max-w-2xl">
        <TabsTrigger value="categories">
          {t('settings.categories.title')}
        </TabsTrigger>
        <TabsTrigger value="accounts">
          {t('settings.accounts.title')}
        </TabsTrigger>
        <TabsTrigger value="budget-items">{t('budgetItems.title')}</TabsTrigger>
      </TabsList>

      <TabsContent value="categories" className="mt-6">
        <CategoriesTab initialCategories={categories} />
      </TabsContent>

      <TabsContent value="accounts" className="mt-6">
        <AccountsTab initialAccounts={accounts} currency={currency} />
      </TabsContent>

      <TabsContent value="budget-items" className="mt-6">
        <BudgetItemsTab
          initialItems={budgetItems}
          categories={categories}
          currency={currency}
          locale={locale}
        />
      </TabsContent>
    </Tabs>
  )
}
