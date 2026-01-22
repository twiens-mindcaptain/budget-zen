'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { SignInButton, SignUpButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Keyboard, Wallet, PiggyBank, Check, Sparkles } from 'lucide-react'

interface LandingPageProps {
  locale: string
}

export function LandingPage({ locale }: LandingPageProps) {
  const t = useTranslations()

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-semibold text-zinc-900">{t('app.name')}</span>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                {t('landing.cta.signIn')}
              </Button>
            </SignInButton>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 py-24 md:py-32">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 tracking-tight">
            {t('landing.hero.headline')}
          </h1>
          <p className="mt-6 text-lg md:text-xl text-zinc-600 leading-relaxed">
            {t('landing.hero.subline')}
          </p>
          <div className="mt-10">
            <SignUpButton mode="modal">
              <Button size="lg" className="text-lg px-8 py-6 h-auto">
                {t('landing.cta.getStarted')}
              </Button>
            </SignUpButton>
          </div>
        </div>
      </section>

      {/* Screenshot Placeholder */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="relative">
          <div className="bg-zinc-100 rounded-2xl border border-zinc-200 aspect-[16/10] flex items-center justify-center">
            <div className="text-center text-zinc-400">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-zinc-200 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-zinc-400" />
              </div>
              <p className="text-sm">{t('landing.screenshot.alt')}</p>
            </div>
          </div>
          {/* Decorative shadow */}
          <div className="absolute -inset-4 bg-gradient-to-b from-zinc-100/50 to-transparent -z-10 rounded-3xl blur-2xl" />
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Quick Add */}
            <div className="bg-white rounded-2xl p-8 border border-zinc-200">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center mb-6">
                <Keyboard className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-3">
                {t('landing.features.quickAdd.title')}
              </h3>
              <p className="text-zinc-600 leading-relaxed">
                {t('landing.features.quickAdd.description')}
              </p>
            </div>

            {/* Safe-to-Spend */}
            <div className="bg-white rounded-2xl p-8 border border-zinc-200">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center mb-6">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-3">
                {t('landing.features.safeToSpend.title')}
              </h3>
              <p className="text-zinc-600 leading-relaxed">
                {t('landing.features.safeToSpend.description')}
              </p>
            </div>

            {/* Sinking Funds */}
            <div className="bg-white rounded-2xl p-8 border border-zinc-200">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center mb-6">
                <PiggyBank className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-3">
                {t('landing.features.sinkingFunds.title')}
              </h3>
              <p className="text-zinc-600 leading-relaxed">
                {t('landing.features.sinkingFunds.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-zinc-900 mb-3">
            {t('landing.pricing.title')}
          </h2>
          <p className="text-lg text-zinc-600">
            {t('landing.pricing.subtitle')}
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl border-2 border-zinc-900 p-8 relative">
            {/* Popular Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <div className="bg-zinc-900 text-white text-sm font-medium px-4 py-1 rounded-full flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Lifetime Deal
              </div>
            </div>

            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-zinc-900 mb-4">
                {t('landing.pricing.plan')}
              </h3>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold text-zinc-900">
                  {t('landing.pricing.price')}
                </span>
                <span className="text-zinc-500">
                  {t('landing.pricing.priceDetail')}
                </span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-zinc-700">{t('landing.pricing.features.accounts')}</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-zinc-700">{t('landing.pricing.features.sinkingFunds')}</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-zinc-700">{t('landing.pricing.features.updates')}</span>
              </li>
            </ul>

            <SignUpButton mode="modal">
              <Button size="lg" className="w-full text-lg py-6 h-auto">
                {t('landing.cta.getStarted')}
              </Button>
            </SignUpButton>

            <p className="text-center text-sm text-zinc-500 mt-4">
              7-day free trial included
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-zinc-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center">
          <h2 className="text-3xl font-bold mb-6">
            {t('landing.hero.headline')}
          </h2>
          <SignUpButton mode="modal">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6 h-auto">
              {t('landing.cta.getStarted')}
            </Button>
          </SignUpButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-sm text-zinc-500">
              &copy; {new Date().getFullYear()} {t('app.name')}
            </span>
            <div className="flex items-center gap-6">
              <Link
                href={`/${locale}/imprint`}
                className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                {t('landing.footer.imprint')}
              </Link>
              <Link
                href={`/${locale}/privacy`}
                className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                {t('landing.footer.privacy')}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
