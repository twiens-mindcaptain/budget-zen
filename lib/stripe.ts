import Stripe from 'stripe'

// Singleton pattern for Stripe instance
let stripeInstance: Stripe | null = null

/**
 * Get server-side Stripe instance (singleton)
 * Used for creating checkout sessions and processing webhooks
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY

    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined in environment variables')
    }

    stripeInstance = new Stripe(apiKey, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  }

  return stripeInstance
}

/**
 * Stripe configuration constants
 */
export const STRIPE_CONFIG = {
  monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID!,
  yearlyPriceId: process.env.STRIPE_YEARLY_PRICE_ID!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
} as const
