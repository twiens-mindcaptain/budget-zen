-- ============================================
-- Budget Zen - Budgeting Logic Migration
-- ============================================
-- This migration adds budgeting capabilities to categories
-- and ensures accounts table structure is correct.

-- ============================================
-- 1. ALTER CATEGORIES TABLE - Add Budget Fields
-- ============================================

-- Add budget_type column (variable, fixed, sinking_fund)
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS budget_type TEXT DEFAULT 'variable'
CHECK (budget_type IN ('variable', 'fixed', 'sinking_fund'));

-- Add target_amount column (for fixed and sinking fund budgets)
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS target_amount DECIMAL(12,2) DEFAULT NULL;

-- Add frequency column (monthly, quarterly, semi_annual, annual)
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'monthly'
CHECK (frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual'));

-- Add monthly_target column (calculated field for quick queries)
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS monthly_target DECIMAL(12,2) DEFAULT NULL;

-- Create index on budget_type for performance
CREATE INDEX IF NOT EXISTS categories_budget_type_idx ON categories(budget_type);

-- Add comment to explain budget_type
COMMENT ON COLUMN categories.budget_type IS 'Budget type: variable (no budget), fixed (recurring), sinking_fund (savings goal)';
COMMENT ON COLUMN categories.target_amount IS 'Target amount for the specified frequency (only for fixed/sinking_fund)';
COMMENT ON COLUMN categories.frequency IS 'Budget frequency: monthly, quarterly, semi_annual, annual';
COMMENT ON COLUMN categories.monthly_target IS 'Calculated monthly target amount (target_amount converted to monthly basis)';

-- ============================================
-- 2. VERIFY ACCOUNTS TABLE STRUCTURE
-- ============================================

-- Accounts table should already exist from initial setup
-- Just verify/add any missing columns

-- Ensure name column exists (should already exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='accounts' AND column_name='name') THEN
        ALTER TABLE accounts ADD COLUMN name TEXT NOT NULL;
    END IF;
END $$;

-- Ensure type column exists (should already exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='accounts' AND column_name='type') THEN
        ALTER TABLE accounts ADD COLUMN type TEXT NOT NULL DEFAULT 'cash'
        CHECK (type IN ('cash', 'bank', 'credit', 'savings'));
    END IF;
END $$;

-- Ensure initial_balance column exists (should already exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='accounts' AND column_name='initial_balance') THEN
        ALTER TABLE accounts ADD COLUMN initial_balance DECIMAL(12,2) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Add index on account type for performance
CREATE INDEX IF NOT EXISTS accounts_type_idx ON accounts(type);

-- ============================================
-- 3. UPDATE EXISTING CATEGORIES
-- ============================================

-- Set default budget_type for existing categories
-- All existing categories default to 'variable' (no budget tracking)
UPDATE categories
SET budget_type = 'variable',
    frequency = 'monthly',
    target_amount = NULL,
    monthly_target = NULL
WHERE budget_type IS NULL;

-- ============================================
-- 4. CREATE HELPER FUNCTION (Optional)
-- ============================================

-- Function to calculate monthly_target based on frequency
CREATE OR REPLACE FUNCTION calculate_monthly_target(
    p_target_amount DECIMAL(12,2),
    p_frequency TEXT
) RETURNS DECIMAL(12,2) AS $$
BEGIN
    IF p_target_amount IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN CASE p_frequency
        WHEN 'monthly' THEN p_target_amount
        WHEN 'quarterly' THEN p_target_amount / 3
        WHEN 'semi_annual' THEN p_target_amount / 6
        WHEN 'annual' THEN p_target_amount / 12
        ELSE p_target_amount
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comment
COMMENT ON FUNCTION calculate_monthly_target IS 'Converts target_amount to monthly basis based on frequency';

-- ============================================
-- 5. VERIFICATION QUERIES
-- ============================================

-- Check categories table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'categories'
  AND column_name IN ('budget_type', 'target_amount', 'frequency', 'monthly_target')
ORDER BY ordinal_position;

-- Check accounts table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'accounts'
  AND column_name IN ('name', 'type', 'initial_balance')
ORDER BY ordinal_position;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Summary:
-- 1. ✅ Categories table updated with budget fields (budget_type, target_amount, frequency, monthly_target)
-- 2. ✅ Accounts table structure verified (name, type, initial_balance)
-- 3. ✅ Indexes created for performance
-- 4. ✅ Helper function created for monthly_target calculation
-- 5. ✅ Existing data migrated to default 'variable' budget type
