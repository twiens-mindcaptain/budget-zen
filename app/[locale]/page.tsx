import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import { format } from 'date-fns'
import { getTranslations, getLocale } from 'next-intl/server'
import { QuickAddDialog } from '@/components/transactions/quick-add-dialog'
import { getRecentTransactions, getAccounts, getCategories, getMonthlyStatistics } from '@/app/actions/transaction'
import { seedUserDefaults, getUserProfile } from '@/app/actions/seed'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { formatCurrency } from '@/lib/currency'
import { LanguageSwitcher } from '@/components/language-switcher'
import { getCategoryIcon } from '@/lib/icon-mapper'
import { getCategoryDisplayName } from '@/lib/i18n-helpers'
import Link from 'next/link'
import { Settings } from 'lucide-react'

export default async function DashboardPage() {
  const t = await getTranslations()

  return (
    <>
      <SignedOut>
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100">
          <div className="absolute top-4 right-4">
            <LanguageSwitcher />
          </div>
          <div className="text-center space-y-6 p-8">
            <h1 className="text-4xl font-bold text-zinc-900">{t('app.name')}</h1>
            <p className="text-lg text-zinc-600">
              {t('app.tagline')}
            </p>
            <SignInButton mode="modal">
              <button className="px-6 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors">
                {t('auth.signInToStart')}
              </button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <Dashboard />
      </SignedIn>
    </>
  )
}

async function Dashboard() {
  const t = await getTranslations()
  const locale = await getLocale()

  // Seed default accounts and categories for new users
  await seedUserDefaults()

  // Fetch data server-side
  const [transactions, accounts, categories, statistics, profile] = await Promise.all([
    getRecentTransactions(50),
    getAccounts(),
    getCategories(),
    getMonthlyStatistics(),
    getUserProfile(),
  ])

  // Convert locale to full locale for number formatting
  const fullLocale = locale === 'de' ? 'de-DE' : 'en-US'

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-900">{t('app.name')}</h1>
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/settings`}
              className="text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </Link>
            <LanguageSwitcher />
            <UserButton afterSignOutUrl={`/${locale}`} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Monthly Statistics */}
        <div className="mb-6">
          <SummaryCards statistics={statistics} currency={profile.currency} locale={fullLocale} />
        </div>

        {/* Quick Add Section */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-zinc-900">{t('dashboard.transactions')}</h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              {t('dashboard.pressNToAdd', { key: 'N' }).split('N')[0]}
              <kbd className="mx-1 px-1.5 py-0.5 text-xs bg-zinc-100 text-zinc-700 border border-zinc-300 rounded font-mono">
                N
              </kbd>
              {t('dashboard.pressNToAdd', { key: 'N' }).split('N')[1]}
            </p>
          </div>
          <QuickAddDialog accounts={accounts} categories={categories} />
        </div>

        {/* Empty State */}
        {transactions.length === 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center shadow-sm">
            <div className="max-w-sm mx-auto space-y-4">
              <div className="text-zinc-400 text-5xl">💰</div>
              <h3 className="text-lg font-medium text-zinc-900">{t('dashboard.noTransactionsYet')}</h3>
              <p className="text-sm text-zinc-500">
                {t('dashboard.getStarted')}
              </p>
            </div>
          </div>
        ) : (
          /* Transaction Feed - Card List */
          <div className="space-y-2">
            {transactions.map((transaction: any) => {
              const isIncome = transaction.category?.type === 'income'
              const amount = parseFloat(transaction.amount)
              const CategoryIcon = getCategoryIcon(transaction.category?.icon)

              return (
                <div
                  key={transaction.id}
                  className="bg-white rounded-xl border border-zinc-200 p-4 hover:bg-zinc-50/50 transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: transaction.category?.color
                            ? `${transaction.category.color}15`
                            : '#f4f4f5'
                        }}
                      >
                        <CategoryIcon
                          className="w-5 h-5"
                          style={{
                            color: transaction.category?.color || '#71717a'
                          }}
                        />
                      </div>
                    </div>

                    {/* Middle: Category, Account, Date */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-900">
                        {transaction.category
                          ? getCategoryDisplayName(transaction.category, t)
                          : t('transaction.uncategorized')
                        }
                      </div>
                      <div className="text-sm text-zinc-500 flex items-center gap-1.5">
                        <span className="truncate">{transaction.account?.name || 'Unknown'}</span>
                        <span>•</span>
                        <span className="whitespace-nowrap">
                          {format(new Date(transaction.date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      {transaction.note && (
                        <div className="text-sm text-zinc-500 mt-1 truncate">
                          {transaction.note}
                        </div>
                      )}
                    </div>

                    {/* Right: Amount */}
                    <div className="flex-shrink-0 text-right">
                      <div
                        className={`text-lg font-semibold tabular-nums ${
                          isIncome ? 'text-emerald-600' : 'text-zinc-900'
                        }`}
                      >
                        {formatCurrency(
                          amount,
                          profile.currency,
                          isIncome ? '+' : '-',
                          fullLocale
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
