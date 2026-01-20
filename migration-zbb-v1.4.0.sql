-- ============================================
-- Budget Zen - ZBB (Zero-Based Budgeting) Migration v1.4.0
-- ============================================
-- This migration implements the ZBB system as described in docs/concept.md
--
-- Key changes:
-- 1. New category_type enum: FIX, VARIABLE, SF1, SF2, INCOME
-- 2. New rollover_strategy enum: ACCUMULATE, RESET, SWEEP
-- 3. New monthly_budgets table for monthly budget assignments
-- ============================================

-- Step 1: Create new enums for ZBB
-- ============================================

-- Category types according to ZBB concept
CREATE TYPE zbb_category_type AS ENUM ('FIX', 'VARIABLE', 'SF1', 'SF2', 'INCOME');

-- Rollover strategies for month-end behavior
CREATE TYPE zbb_rollover_strategy AS ENUM ('ACCUMULATE', 'RESET', 'SWEEP');

-- Step 2: Add new ZBB columns to categories table
-- ============================================

-- Add new columns (keeping old columns for backward compatibility during migration)
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS zbb_type zbb_category_type,
ADD COLUMN IF NOT EXISTS rollover_strategy zbb_rollover_strategy DEFAULT 'RESET',
ADD COLUMN IF NOT EXISTS due_date DATE; -- Required for SF1 (Sinking Funds Priority)

-- Step 3: Migrate existing data to new columns
-- ============================================

-- Map old type + budget_type to new zbb_type
UPDATE categories SET zbb_type =
  CASE
    -- Income categories stay as INCOME
    WHEN type = 'income' THEN 'INCOME'::zbb_category_type
    -- Expense categories: map based on budget_type
    WHEN type = 'expense' AND budget_type = 'fixed' THEN 'FIX'::zbb_category_type
    WHEN type = 'expense' AND budget_type = 'sinking_fund' THEN 'SF2'::zbb_category_type
    ELSE 'VARIABLE'::zbb_category_type
  END
WHERE zbb_type IS NULL;

-- Set rollover strategies based on zbb_type
UPDATE categories SET rollover_strategy =
  CASE
    WHEN zbb_type = 'INCOME' THEN 'RESET'::zbb_rollover_strategy
    WHEN zbb_type = 'FIX' THEN 'RESET'::zbb_rollover_strategy
    WHEN zbb_type = 'VARIABLE' THEN 'RESET'::zbb_rollover_strategy
    WHEN zbb_type = 'SF1' THEN 'ACCUMULATE'::zbb_rollover_strategy
    WHEN zbb_type = 'SF2' THEN 'ACCUMULATE'::zbb_rollover_strategy
    ELSE 'RESET'::zbb_rollover_strategy
  END
WHERE rollover_strategy IS NULL OR rollover_strategy = 'RESET';

-- Make zbb_type NOT NULL after migration
ALTER TABLE categories ALTER COLUMN zbb_type SET NOT NULL;

-- Step 4: Create monthly_budgets table (BudgetMonth entity)
-- ============================================

CREATE TABLE IF NOT EXISTS monthly_budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,

  -- Month identifier (first day of the month)
  month DATE NOT NULL,

  -- ZBB fields
  assigned DECIMAL(12,2) DEFAULT 0.00 NOT NULL, -- Manually or auto-assigned amount
  start_balance DECIMAL(12,2) DEFAULT 0.00 NOT NULL, -- Carryover from previous month

  -- Note: 'activity' is calculated dynamically from transactions
  -- Note: 'available' is calculated as: start_balance + assigned + activity

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Ensure unique budget per category per month
  UNIQUE(user_id, category_id, month)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS monthly_budgets_user_id_idx ON monthly_budgets(user_id);
CREATE INDEX IF NOT EXISTS monthly_budgets_category_id_idx ON monthly_budgets(category_id);
CREATE INDEX IF NOT EXISTS monthly_budgets_month_idx ON monthly_budgets(month);
CREATE INDEX IF NOT EXISTS monthly_budgets_user_month_idx ON monthly_budgets(user_id, month);

-- Step 5: Enable RLS for monthly_budgets
-- ============================================

ALTER TABLE monthly_budgets ENABLE ROW LEVEL SECURITY;

-- Users can only see their own monthly budgets
CREATE POLICY "Users can view own monthly_budgets"
  ON monthly_budgets FOR SELECT
  USING (user_id = (SELECT auth.jwt() ->> 'user_id'));

-- Users can only insert their own monthly budgets
CREATE POLICY "Users can insert own monthly_budgets"
  ON monthly_budgets FOR INSERT
  WITH CHECK (user_id = (SELECT auth.jwt() ->> 'user_id'));

-- Users can only update their own monthly budgets
CREATE POLICY "Users can update own monthly_budgets"
  ON monthly_budgets FOR UPDATE
  USING (user_id = (SELECT auth.jwt() ->> 'user_id'));

-- Users can only delete their own monthly budgets
CREATE POLICY "Users can delete own monthly_budgets"
  ON monthly_budgets FOR DELETE
  USING (user_id = (SELECT auth.jwt() ->> 'user_id'));

-- Step 6: Create helper function for rollover calculation
-- ============================================

CREATE OR REPLACE FUNCTION calculate_rollover(
  p_category_id UUID,
  p_user_id TEXT,
  p_month DATE
) RETURNS DECIMAL(12,2) AS $$
DECLARE
  v_prev_month DATE;
  v_rollover_strategy zbb_rollover_strategy;
  v_prev_available DECIMAL(12,2);
  v_prev_assigned DECIMAL(12,2);
  v_prev_start_balance DECIMAL(12,2);
  v_prev_activity DECIMAL(12,2);
BEGIN
  -- Get previous month
  v_prev_month := p_month - INTERVAL '1 month';

  -- Get category rollover strategy
  SELECT rollover_strategy INTO v_rollover_strategy
  FROM categories
  WHERE id = p_category_id AND user_id = p_user_id;

  -- Get previous month's budget data
  SELECT assigned, start_balance INTO v_prev_assigned, v_prev_start_balance
  FROM monthly_budgets
  WHERE category_id = p_category_id
    AND user_id = p_user_id
    AND month = v_prev_month;

  -- If no previous budget exists, return 0
  IF v_prev_assigned IS NULL THEN
    RETURN 0.00;
  END IF;

  -- Calculate previous month's activity (sum of transactions)
  SELECT COALESCE(SUM(amount), 0) INTO v_prev_activity
  FROM transactions
  WHERE category_id = p_category_id
    AND user_id = p_user_id
    AND date >= v_prev_month
    AND date < p_month;

  -- Calculate previous available: start_balance + assigned + activity
  v_prev_available := v_prev_start_balance + v_prev_assigned + v_prev_activity;

  -- Apply rollover strategy
  CASE v_rollover_strategy
    WHEN 'ACCUMULATE' THEN
      -- Carry over everything (positive or negative)
      RETURN v_prev_available;
    WHEN 'RESET' THEN
      -- Start fresh (no carryover)
      RETURN 0.00;
    WHEN 'SWEEP' THEN
      -- Carry over only negative (overspending), positive goes to savings
      IF v_prev_available < 0 THEN
        RETURN v_prev_available;
      ELSE
        RETURN 0.00;
      END IF;
    ELSE
      RETURN 0.00;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Add comments for documentation
-- ============================================

COMMENT ON TABLE monthly_budgets IS 'ZBB monthly budget assignments per category (BudgetMonth entity)';
COMMENT ON COLUMN monthly_budgets.month IS 'First day of the budget month';
COMMENT ON COLUMN monthly_budgets.assigned IS 'Amount assigned to this category for this month (Stuffing phase)';
COMMENT ON COLUMN monthly_budgets.start_balance IS 'Carryover from previous month based on rollover_strategy';

COMMENT ON COLUMN categories.zbb_type IS 'ZBB category type: FIX, VARIABLE, SF1 (Sinking Funds Priority), SF2 (Savings Goals), INCOME';
COMMENT ON COLUMN categories.rollover_strategy IS 'Month-end behavior: ACCUMULATE (keep balance), RESET (start fresh), SWEEP (negative only)';
COMMENT ON COLUMN categories.due_date IS 'Due date for SF1 categories (when the target amount is needed)';

-- Mark old columns as deprecated
COMMENT ON COLUMN categories.type IS 'DEPRECATED: Use zbb_type instead';
COMMENT ON COLUMN categories.budget_type IS 'DEPRECATED: Use zbb_type instead';

-- Step 8: Verification queries (run manually after migration)
-- ============================================

-- Verify new columns exist
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'categories' AND column_name IN ('zbb_type', 'rollover_strategy', 'due_date');

-- Verify monthly_budgets table
-- SELECT * FROM monthly_budgets LIMIT 1;

-- Check migration success
-- SELECT zbb_type, rollover_strategy, COUNT(*)
-- FROM categories
-- GROUP BY zbb_type, rollover_strategy;
