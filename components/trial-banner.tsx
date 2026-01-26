'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { differenceInDays } from 'date-fns'
import { Clock, ArrowRight } from 'lucide-react'
import { createCheckoutSession } from '@/app/actions/stripe'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PricingToggle } from '@/components/pricing-toggle'

interface TrialBannerProps {
  trialEndsAt: string
  locale: string
}

export function TrialBanner({ trialEndsAt, locale }: TrialBannerProps) {
  const t = useTranslations()
  const [isLoading, setIsLoading] = useState(false)
  const [showPricingDialog, setShowPricingDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')

  const trialEndDate = new Date(trialEndsAt)
  const now = new Date()
  const daysRemaining = Math.max(0, differenceInDays(trialEndDate, now))

  // Don't show banner if trial has expired (will redirect to /expired)
  if (daysRemaining <= 0 && now > trialEndDate) {
    return null
  }

  const isLastDay = daysRemaining === 0

  const handleUpgrade = async () => {
    try {
      setIsLoading(true)

      const result = await createCheckoutSession(selectedPlan)

      if (!result.success || !result.url) {
        toast.error(result.error || 'Failed to start checkout')
        return
      }

      // Redirect to Stripe Checkout
      window.location.href = result.url
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
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
          <button
            onClick={() => setShowPricingDialog(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-sm font-medium text-white hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('trial.getLicense')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pricing Dialog */}
      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('pricing.chooseYourPlan')}</DialogTitle>
            <DialogDescription>
              {t('pricing.selectBilling')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <PricingToggle
              defaultPlan="monthly"
              onPlanChange={(plan) => setSelectedPlan(plan)}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPricingDialog(false)}
              className="flex-1"
            >
              {t('pricing.cancel')}
            </Button>
            <Button onClick={handleUpgrade} disabled={isLoading} className="flex-1">
              {isLoading ? t('pricing.loading') : t('pricing.continueToCheckout')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
