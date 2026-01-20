import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import { getTranslations, getLocale } from 'next-intl/server'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import {
  getRecentTransactions,
  getCategories,
  getMonthlyStatistics,
  getBillsChecklist,
  getSinkingFunds,
} from '@/app/actions/transaction'
import { getMonthlyBudgets, getBudgetSummary, getAllSuggestedAmounts } from '@/app/actions/budgets'
import { seedUserDefaults, getUserProfile } from '@/app/actions/seed'
import { LanguageSwitcher } from '@/components/language-switcher'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { startOfMonth, parse } from 'date-fns'

interface PageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const t = await getTranslations()
  const params = await searchParams

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
        <Dashboard monthParam={params.month} />
      </SignedIn>
    </>
  )
}

interface DashboardProps {
  monthParam?: string
}

async function Dashboard({ monthParam }: DashboardProps) {
  const t = await getTranslations()
  const locale = await getLocale()

  // Parse month from URL parameter or default to current month
  let currentMonth: Date
  if (monthParam) {
    try {
      // Parse YYYY-MM format
      currentMonth = parse(monthParam + '-01', 'yyyy-MM-dd', new Date())
    } catch {
      currentMonth = startOfMonth(new Date())
    }
  } else {
    currentMonth = startOfMonth(new Date())
  }

  // Seed default categories for new users
  await seedUserDefaults()

  // Fetch data server-side for the selected month
  const [
    transactions,
    categories,
    statistics,
    bills,
    sinkingFunds,
    monthlyBudgets,
    budgetSummary,
    suggestedAmounts,
    profile,
  ] = await Promise.all([
    getRecentTransactions(50, currentMonth),
    getCategories(),
    getMonthlyStatistics(currentMonth),
    getBillsChecklist(currentMonth),
    getSinkingFunds(),
    getMonthlyBudgets(currentMonth),
    getBudgetSummary(currentMonth),
    getAllSuggestedAmounts(currentMonth),
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
        <DashboardContent
          initialTransactions={transactions}
          initialStatistics={statistics}
          initialBills={bills}
          initialSinkingFunds={sinkingFunds}
          initialBudgets={monthlyBudgets}
          initialBudgetSummary={budgetSummary}
          suggestedAmounts={suggestedAmounts}
          categories={categories}
          currency={profile.currency}
          locale={fullLocale}
          currentMonth={currentMonth.toISOString()}
        />
      </main>
    </div>
  )
}
