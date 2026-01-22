import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { getTranslations, getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { LandingPage } from '@/components/landing-page'
import { TrialBanner } from '@/components/trial-banner'
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
  const params = await searchParams
  const locale = await getLocale()

  return (
    <>
      <SignedOut>
        <LandingPage locale={locale} />
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

  // Check trial status - redirect to /expired if trial ended and not active
  const isTrialExpired =
    profile.subscription_status !== 'active' &&
    profile.trial_ends_at &&
    new Date(profile.trial_ends_at) < new Date()

  if (isTrialExpired) {
    redirect(`/${locale}/expired`)
  }

  // Check if user is in trial (not active subscription)
  const showTrialBanner =
    profile.subscription_status === 'trial' && profile.trial_ends_at

  // Convert locale to full locale for number formatting
  const fullLocale = locale === 'de' ? 'de-DE' : 'en-US'

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Trial Banner */}
      {showTrialBanner && (
        <TrialBanner trialEndsAt={profile.trial_ends_at!} locale={locale} />
      )}

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
