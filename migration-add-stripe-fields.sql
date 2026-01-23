-- Migration: Add Stripe fields to profiles table
-- Description: Adds Stripe customer ID, payment intent ID, checkout session ID, and payment timestamp
-- Date: 2026-01-22

-- Add Stripe-related columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for faster Stripe-related lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
ON profiles(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_checkout_session
ON profiles(stripe_checkout_session_id);

-- Add comments for documentation
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe Customer ID (cus_xxx)';
COMMENT ON COLUMN profiles.stripe_payment_intent_id IS 'Last successful Payment Intent ID (pi_xxx)';
COMMENT ON COLUMN profiles.stripe_checkout_session_id IS 'Last checkout session ID (cs_xxx)';
COMMENT ON COLUMN profiles.payment_completed_at IS 'Timestamp when lifetime license payment was completed';
COMMENT ON COLUMN profiles.updated_at IS 'Last update timestamp for profile';
