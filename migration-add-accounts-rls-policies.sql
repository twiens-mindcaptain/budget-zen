-- ============================================
-- Budget Zen - Accounts RLS Policies Migration
-- ============================================
-- This migration adds Row Level Security policies for the accounts table

-- ============================================
-- 1. ENABLE RLS ON ACCOUNTS TABLE
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. DROP EXISTING POLICIES (if any)
-- ============================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can insert their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete their own accounts" ON accounts;

-- ============================================
-- 3. CREATE RLS POLICIES FOR ACCOUNTS
-- ============================================

-- Policy: Users can view their own accounts
CREATE POLICY "Users can view their own accounts"
ON accounts
FOR SELECT
USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own accounts
CREATE POLICY "Users can insert their own accounts"
ON accounts
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own accounts
CREATE POLICY "Users can update their own accounts"
ON accounts
FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can delete their own accounts
CREATE POLICY "Users can delete their own accounts"
ON accounts
FOR DELETE
USING (auth.uid()::text = user_id);

-- ============================================
-- 4. VERIFICATION
-- ============================================

-- List all policies on accounts table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'accounts';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Summary:
-- 1. ✅ RLS enabled on accounts table
-- 2. ✅ SELECT policy: Users can view their own accounts
-- 3. ✅ INSERT policy: Users can insert their own accounts
-- 4. ✅ UPDATE policy: Users can update their own accounts
-- 5. ✅ DELETE policy: Users can delete their own accounts
