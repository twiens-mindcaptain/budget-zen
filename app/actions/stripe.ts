'use server'

import { auth } from '@clerk/nextjs/server'
import { getServerSupabase } from '@/lib/supabase'
import { getStripe, STRIPE_CONFIG } from '@/lib/stripe'
import { headers } from 'next/headers'

export interface CreateCheckoutSessionResponse {
  success: boolean
  sessionId?: string
  url?: string
  error?: string
}

/**
 * Creates a Stripe Checkout Session for the €29 lifetime license purchase
 * Links Clerk userId to Stripe customer via metadata
 */
export async function createCheckoutSession(): Promise<CreateCheckoutSessionResponse> {
  try {
    // 1. Authenticate user
    const { userId } = await auth()

    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized. Please sign in to purchase.',
      }
    }

    // 2. Check if user already has active subscription
    const { data: profile } = await getServerSupabase()
      .from('profiles')
      .select('subscription_status, stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (profile?.subscription_status === 'active') {
      return {
        success: false,
        error: 'You already have an active subscription.',
      }
    }

    // 3. Get origin for redirect URLs
    const headersList = await headers()
    const origin = headersList.get('origin') || 'http://localhost:3000'

    // 4. Initialize Stripe
    const stripe = getStripe()

    // 5. Determine customer ID (reuse if exists)
    let customerId = profile?.stripe_customer_id || undefined

    // 6. Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', // One-time payment (NOT subscription)
      customer: customerId, // Reuse existing or let Stripe create new
      customer_creation: customerId ? undefined : 'always', // Create customer if not exists
      line_items: [
        {
          price: STRIPE_CONFIG.priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/en/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/en?canceled=true`,
      metadata: {
        clerk_user_id: userId, // Critical: Link Clerk user to Stripe payment
      },
      // Save customer details
      billing_address_collection: 'auto',
      // Allow promotion codes
      allow_promotion_codes: true,
    })

    // 7. Store checkout session ID for webhook verification
    await getServerSupabase()
      .from('profiles')
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    return {
      success: true,
      sessionId: session.id,
      url: session.url!,
    }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    }
  }
}
