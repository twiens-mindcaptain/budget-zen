'use client'

import { useTranslations } from 'next-intl'
import { differenceInDays } from 'date-fns'
import { Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface TrialBannerProps {
  trialEndsAt: string
  locale: string
}

export function TrialBanner({ trialEndsAt, locale }: TrialBannerProps) {
  const t = useTranslations()

  const trialEndDate = new Date(trialEndsAt)
  const now = new Date()
  const daysRemaining = Math.max(0, differenceInDays(trialEndDate, now))

  // Don't show banner if trial has expired (will redirect to /expired)
  if (daysRemaining <= 0 && now > trialEndDate) {
    return null
  }

  const isLastDay = daysRemaining === 0

  return (
    <div className="bg-zinc-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-zinc-400" />
          <span>
            {isLastDay
              ? t('trial.bannerLastDay')
              : t('trial.banner', { days: daysRemaining })}
          </span>
        </div>
        <Link
          href="https://wise.com/pay/r/-lEdgTa7BN12XHc"
          className="flex items-center gap-1.5 text-sm font-medium text-white hover:text-zinc-200 transition-colors"
        >
          {t('trial.getLicense')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
