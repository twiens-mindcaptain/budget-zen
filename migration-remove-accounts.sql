-- ============================================
-- Budget Zen - Remove Accounts Migration
-- ============================================
-- This migration removes the accounts system as it's not part of the ZBB concept.
-- Transactions will only reference categories, not physical accounts.
-- ============================================

-- Step 1: Remove account_id foreign key constraint from transactions
-- ============================================

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;

-- Step 2: Drop account_id column from transactions
-- ============================================

ALTER TABLE transactions DROP COLUMN IF EXISTS account_id;

-- Step 3: Drop accounts table and related policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON accounts;

DROP TABLE IF EXISTS accounts;

-- Step 4: Clean up any orphaned data
-- ============================================

-- No cleanup needed as transactions now only depend on categories

-- Verification
-- ============================================
-- After running this migration, verify:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions';
-- Should NOT include 'account_id'
