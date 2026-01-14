'use client'

import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CategoriesTab } from '@/components/settings/categories-tab'
import { AccountsTab } from '@/components/settings/accounts-tab'

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
  currency: string
}

export function SettingsTabs({ categories, accounts, currency }: SettingsTabsProps) {
  const t = useTranslations()

  return (
    <Tabs defaultValue="categories" className="w-full">
      <TabsList className="grid w-full grid-cols-2 max-w-md">
        <TabsTrigger value="categories">
          {t('settings.categories.title')}
        </TabsTrigger>
        <TabsTrigger value="accounts">
          {t('settings.accounts.title')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="categories" className="mt-6">
        <CategoriesTab initialCategories={categories} />
      </TabsContent>

      <TabsContent value="accounts" className="mt-6">
        <AccountsTab initialAccounts={accounts} currency={currency} />
      </TabsContent>
    </Tabs>
  )
}
