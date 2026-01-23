'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { createCheckoutSession } from '@/app/actions/stripe'
import { toast } from 'sonner'

export function ExpiredCTA() {
  const t = useTranslations()
  const [isLoading, setIsLoading] = useState(false)

  const handleUpgrade = async () => {
    try {
      setIsLoading(true)

      const result = await createCheckoutSession()

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
    <Button
      onClick={handleUpgrade}
      disabled={isLoading}
      size="lg"
      className="w-full text-lg py-6 h-auto mb-4"
    >
      {isLoading ? 'Loading...' : t('expired.cta')}
      <ArrowRight className="w-5 h-5 ml-2" />
    </Button>
  )
}
