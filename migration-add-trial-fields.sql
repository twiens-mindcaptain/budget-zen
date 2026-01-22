-- Migration: Add trial and subscription fields to profiles
-- Run this in Supabase SQL Editor

-- Add trial_ends_at column (7 days from account creation)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Add subscription_status column
-- Values: 'trial', 'active', 'expired'
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired'));

-- Set default trial_ends_at for existing users (7 days from now)
UPDATE profiles
SET trial_ends_at = NOW() + INTERVAL '7 days',
    subscription_status = 'trial'
WHERE trial_ends_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN profiles.trial_ends_at IS 'When the 7-day trial period ends';
COMMENT ON COLUMN profiles.subscription_status IS 'trial = in trial period, active = paid, expired = trial ended without payment';
