import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import { getServerSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Receipt, LogOut } from 'lucide-react'
import { SignOutButton } from '@clerk/nextjs'
import { ExpiredCTA } from '@/components/expired-cta'

export default async function ExpiredPage() {
  const { userId } = await auth()
  const t = await getTranslations()
  const locale = await getLocale()

  if (!userId) {
    redirect(`/${locale}`)
  }

  // Check if user actually has expired trial
  const { data: profile } = await getServerSupabase()
    .from('profiles')
    .select('subscription_status, trial_ends_at')
    .eq('user_id', userId)
    .single()

  // If user has active subscription, redirect to dashboard
  if (profile?.subscription_status === 'active') {
    redirect(`/${locale}`)
  }

  // If trial hasn't expired yet, redirect to dashboard
  if (profile?.trial_ends_at) {
    const trialEndDate = new Date(profile.trial_ends_at)
    if (trialEndDate > new Date()) {
      redirect(`/${locale}`)
    }
  }

  // Count user's transactions for stats
  const { count: transactionCount } = await getServerSupabase()
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-semibold text-zinc-900">{t('app.name')}</span>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <SignOutButton>
              <Button variant="ghost" size="sm" className="text-zinc-500">
                <LogOut className="w-4 h-4 mr-2" />
                {t('auth.signOut')}
              </Button>
            </SignOutButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="max-w-md w-full text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-zinc-100 flex items-center justify-center">
            <Receipt className="w-10 h-10 text-zinc-400" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-zinc-900 mb-3">
            {t('expired.title')}
          </h1>
          <p className="text-lg text-zinc-600 mb-8">
            {t('expired.subtitle')}
          </p>

          {/* Stats */}
          {transactionCount && transactionCount > 0 && (
            <div className="bg-zinc-50 rounded-2xl p-6 mb-8 border border-zinc-200">
              <p className="text-2xl font-bold text-zinc-900 mb-2">
                {t('expired.stats.tracked', { count: transactionCount })}
              </p>
              <p className="text-sm text-zinc-600">
                {t('expired.stats.message')}
              </p>
            </div>
          )}

          {/* CTA */}
          <ExpiredCTA />

          <SignOutButton>
            <button className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors">
              {t('expired.later')}
            </button>
          </SignOutButton>
        </div>
      </main>
    </div>
  )
}
