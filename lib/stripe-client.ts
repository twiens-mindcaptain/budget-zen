'use client'

import { loadStripe, Stripe } from '@stripe/stripe-js'

// Singleton promise for Stripe instance
let stripePromise: Promise<Stripe | null> | null = null

/**
 * Get client-side Stripe instance (singleton)
 * Used for handling Stripe Checkout redirects
 */
export function getStripeClient() {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

    if (!key) {
      console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined')
      return Promise.resolve(null)
    }

    stripePromise = loadStripe(key)
  }

  return stripePromise
}
