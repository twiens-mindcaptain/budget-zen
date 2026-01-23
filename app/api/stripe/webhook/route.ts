import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe, STRIPE_CONFIG } from '@/lib/stripe'
import { getServerSupabase } from '@/lib/supabase'

/**
 * Stripe Webhook Handler
 * Automatically activates subscription when payment succeeds
 *
 * Security: Verifies webhook signature to prevent spoofing
 * Idempotency: Uses checkout_session_id to prevent duplicate activations
 */
export async function POST(request: Request) {
  try {
    // 1. Get raw body (required for signature verification)
    const body = await request.text()

    // 2. Get Stripe signature from headers
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('Missing stripe-signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // 3. Verify webhook signature
    const stripe = getStripe()
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_CONFIG.webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // 4. Handle the event
    console.log(`Processing webhook event: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'payment_intent.succeeded':
        // Optional: Handle as backup for checkout.session.completed
        console.log('PaymentIntent succeeded:', event.data.object.id)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // 5. Return success response to Stripe
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

/**
 * Handle checkout.session.completed event
 * Activates user subscription after successful payment
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log('Processing checkout.session.completed:', session.id)

    // 1. Verify payment was successful
    if (session.payment_status !== 'paid') {
      console.log(`Payment not completed. Status: ${session.payment_status}`)
      return
    }

    // 2. Extract Clerk user ID from metadata
    const clerkUserId = session.metadata?.clerk_user_id

    if (!clerkUserId) {
      console.error('No clerk_user_id in session metadata:', session.id)
      throw new Error('Missing clerk_user_id in checkout session metadata')
    }

    // 3. Check for duplicate processing (idempotency)
    const { data: existingProfile } = await getServerSupabase()
      .from('profiles')
      .select('subscription_status, stripe_checkout_session_id')
      .eq('user_id', clerkUserId)
      .single()

    if (
      existingProfile?.stripe_checkout_session_id === session.id &&
      existingProfile?.subscription_status === 'active'
    ) {
      console.log('Checkout session already processed:', session.id)
      return // Already processed, skip
    }

    // 4. Update profile: activate subscription
    const { error: updateError } = await getServerSupabase()
      .from('profiles')
      .update({
        subscription_status: 'active',
        stripe_customer_id: session.customer as string,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        payment_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', clerkUserId)

    if (updateError) {
      console.error('Failed to update profile:', updateError)
      throw updateError
    }

    console.log(`✅ Subscription activated for user: ${clerkUserId}`)

    // Optional: Send confirmation email via Clerk or email service
    // await sendPaymentConfirmationEmail(clerkUserId)
  } catch (error) {
    console.error('Error handling checkout.session.completed:', error)
    // Stripe will retry webhook delivery if we throw or return 500
    throw error
  }
}
