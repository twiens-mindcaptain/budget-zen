'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { createCheckoutSession } from '@/app/actions/stripe'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PricingToggle } from '@/components/pricing-toggle'

export function ExpiredCTA() {
  const t = useTranslations()
  const [isLoading, setIsLoading] = useState(false)
  const [showPricingDialog, setShowPricingDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')

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
      <Button
        onClick={() => setShowPricingDialog(true)}
        disabled={isLoading}
        size="lg"
        className="w-full text-lg py-6 h-auto mb-4"
      >
        {t('expired.cta')}
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>

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
