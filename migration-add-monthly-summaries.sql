-- ============================================
-- MIGRATION: Add monthly_summaries table for analytics
-- Purpose: Store aggregated monthly statistics for fast queries
-- ============================================

-- Create monthly_summaries table
CREATE TABLE IF NOT EXISTS monthly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  month_iso TEXT NOT NULL,  -- 'YYYY-MM' format

  -- Aggregated totals
  total_income DECIMAL(12,2) DEFAULT 0,
  total_expenses DECIMAL(12,2) DEFAULT 0,
  balance DECIMAL(12,2) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,

  -- Breakdown by category type (JSONB for flexibility)
  expenses_by_type JSONB DEFAULT '{}'::jsonb,  -- {"FIX": 800.00, "VARIABLE": 450.00, "SF1": 200.00, "SF2": 100.00}
  income_by_category JSONB DEFAULT '{}'::jsonb, -- {"category_id": amount, ...}
  expenses_by_category JSONB DEFAULT '{}'::jsonb, -- {"category_id": amount, ...}

  -- Timestamps
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One summary per user per month
  UNIQUE(user_id, month_iso)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_monthly_summaries_user_month
ON monthly_summaries(user_id, month_iso);

CREATE INDEX IF NOT EXISTS idx_monthly_summaries_month
ON monthly_summaries(month_iso);

-- Comments
COMMENT ON TABLE monthly_summaries IS 'Pre-aggregated monthly statistics for fast analytics queries';
COMMENT ON COLUMN monthly_summaries.month_iso IS 'Month in YYYY-MM format';
COMMENT ON COLUMN monthly_summaries.expenses_by_type IS 'Expenses breakdown by ZBB type: FIX, VARIABLE, SF1, SF2';
COMMENT ON COLUMN monthly_summaries.income_by_category IS 'Income amounts keyed by category_id';
COMMENT ON COLUMN monthly_summaries.expenses_by_category IS 'Expense amounts keyed by category_id';

-- ============================================
-- TRIGGER FUNCTION: Recalculate monthly summary
-- Called on transaction INSERT, UPDATE, DELETE
-- ============================================

CREATE OR REPLACE FUNCTION recalculate_monthly_summary()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id TEXT;
  v_month_iso TEXT;
  v_total_income DECIMAL(12,2);
  v_total_expenses DECIMAL(12,2);
  v_transaction_count INTEGER;
  v_expenses_by_type JSONB;
  v_income_by_category JSONB;
  v_expenses_by_category JSONB;
BEGIN
  -- Determine which record to use (NEW for INSERT/UPDATE, OLD for DELETE)
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_month_iso := TO_CHAR(OLD.date, 'YYYY-MM');
  ELSE
    v_user_id := NEW.user_id;
    v_month_iso := TO_CHAR(NEW.date, 'YYYY-MM');
  END IF;

  -- Calculate totals for this user and month
  SELECT
    COALESCE(SUM(CASE WHEN c.type = 'INCOME' THEN ABS(t.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN c.type IS NULL OR c.type != 'INCOME' THEN ABS(t.amount) ELSE 0 END), 0),
    COUNT(*)
  INTO v_total_income, v_total_expenses, v_transaction_count
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE t.user_id = v_user_id
    AND TO_CHAR(t.date, 'YYYY-MM') = v_month_iso;

  -- Calculate expenses by type
  SELECT COALESCE(jsonb_object_agg(type, amount), '{}'::jsonb)
  INTO v_expenses_by_type
  FROM (
    SELECT
      COALESCE(c.type, 'UNCATEGORIZED') as type,
      SUM(ABS(t.amount)) as amount
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = v_user_id
      AND TO_CHAR(t.date, 'YYYY-MM') = v_month_iso
      AND (c.type IS NULL OR c.type != 'INCOME')
    GROUP BY c.type
  ) sub;

  -- Calculate income by category
  SELECT COALESCE(jsonb_object_agg(category_id, amount), '{}'::jsonb)
  INTO v_income_by_category
  FROM (
    SELECT
      t.category_id::text as category_id,
      SUM(ABS(t.amount)) as amount
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = v_user_id
      AND TO_CHAR(t.date, 'YYYY-MM') = v_month_iso
      AND c.type = 'INCOME'
    GROUP BY t.category_id
  ) sub;

  -- Calculate expenses by category
  SELECT COALESCE(jsonb_object_agg(category_id, amount), '{}'::jsonb)
  INTO v_expenses_by_category
  FROM (
    SELECT
      COALESCE(t.category_id::text, 'uncategorized') as category_id,
      SUM(ABS(t.amount)) as amount
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = v_user_id
      AND TO_CHAR(t.date, 'YYYY-MM') = v_month_iso
      AND (c.type IS NULL OR c.type != 'INCOME')
    GROUP BY t.category_id
  ) sub;

  -- Upsert the summary
  INSERT INTO monthly_summaries (
    user_id,
    month_iso,
    total_income,
    total_expenses,
    balance,
    transaction_count,
    expenses_by_type,
    income_by_category,
    expenses_by_category,
    calculated_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_month_iso,
    v_total_income,
    v_total_expenses,
    v_total_income - v_total_expenses,
    v_transaction_count,
    v_expenses_by_type,
    v_income_by_category,
    v_expenses_by_category,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, month_iso) DO UPDATE SET
    total_income = EXCLUDED.total_income,
    total_expenses = EXCLUDED.total_expenses,
    balance = EXCLUDED.balance,
    transaction_count = EXCLUDED.transaction_count,
    expenses_by_type = EXCLUDED.expenses_by_type,
    income_by_category = EXCLUDED.income_by_category,
    expenses_by_category = EXCLUDED.expenses_by_category,
    calculated_at = NOW(),
    updated_at = NOW();

  -- Handle UPDATE where month changes (need to recalculate old month too)
  IF TG_OP = 'UPDATE' AND TO_CHAR(OLD.date, 'YYYY-MM') != TO_CHAR(NEW.date, 'YYYY-MM') THEN
    -- Recalculate old month
    PERFORM recalculate_monthly_summary_for_month(OLD.user_id, TO_CHAR(OLD.date, 'YYYY-MM'));
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Helper function to recalculate a specific month (used when transaction date changes)
CREATE OR REPLACE FUNCTION recalculate_monthly_summary_for_month(p_user_id TEXT, p_month_iso TEXT)
RETURNS VOID AS $$
DECLARE
  v_total_income DECIMAL(12,2);
  v_total_expenses DECIMAL(12,2);
  v_transaction_count INTEGER;
  v_expenses_by_type JSONB;
  v_income_by_category JSONB;
  v_expenses_by_category JSONB;
BEGIN
  -- Calculate totals
  SELECT
    COALESCE(SUM(CASE WHEN c.type = 'INCOME' THEN ABS(t.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN c.type IS NULL OR c.type != 'INCOME' THEN ABS(t.amount) ELSE 0 END), 0),
    COUNT(*)
  INTO v_total_income, v_total_expenses, v_transaction_count
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE t.user_id = p_user_id
    AND TO_CHAR(t.date, 'YYYY-MM') = p_month_iso;

  -- If no transactions, delete the summary
  IF v_transaction_count = 0 THEN
    DELETE FROM monthly_summaries WHERE user_id = p_user_id AND month_iso = p_month_iso;
    RETURN;
  END IF;

  -- Calculate breakdowns
  SELECT COALESCE(jsonb_object_agg(type, amount), '{}'::jsonb)
  INTO v_expenses_by_type
  FROM (
    SELECT
      COALESCE(c.type, 'UNCATEGORIZED') as type,
      SUM(ABS(t.amount)) as amount
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = p_user_id
      AND TO_CHAR(t.date, 'YYYY-MM') = p_month_iso
      AND (c.type IS NULL OR c.type != 'INCOME')
    GROUP BY c.type
  ) sub;

  SELECT COALESCE(jsonb_object_agg(category_id, amount), '{}'::jsonb)
  INTO v_income_by_category
  FROM (
    SELECT
      t.category_id::text as category_id,
      SUM(ABS(t.amount)) as amount
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = p_user_id
      AND TO_CHAR(t.date, 'YYYY-MM') = p_month_iso
      AND c.type = 'INCOME'
    GROUP BY t.category_id
  ) sub;

  SELECT COALESCE(jsonb_object_agg(category_id, amount), '{}'::jsonb)
  INTO v_expenses_by_category
  FROM (
    SELECT
      COALESCE(t.category_id::text, 'uncategorized') as category_id,
      SUM(ABS(t.amount)) as amount
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = p_user_id
      AND TO_CHAR(t.date, 'YYYY-MM') = p_month_iso
      AND (c.type IS NULL OR c.type != 'INCOME')
    GROUP BY t.category_id
  ) sub;

  -- Upsert
  INSERT INTO monthly_summaries (
    user_id, month_iso, total_income, total_expenses, balance, transaction_count,
    expenses_by_type, income_by_category, expenses_by_category, calculated_at, updated_at
  ) VALUES (
    p_user_id, p_month_iso, v_total_income, v_total_expenses,
    v_total_income - v_total_expenses, v_transaction_count,
    v_expenses_by_type, v_income_by_category, v_expenses_by_category, NOW(), NOW()
  )
  ON CONFLICT (user_id, month_iso) DO UPDATE SET
    total_income = EXCLUDED.total_income,
    total_expenses = EXCLUDED.total_expenses,
    balance = EXCLUDED.balance,
    transaction_count = EXCLUDED.transaction_count,
    expenses_by_type = EXCLUDED.expenses_by_type,
    income_by_category = EXCLUDED.income_by_category,
    expenses_by_category = EXCLUDED.expenses_by_category,
    calculated_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS trg_transaction_summary_insert ON transactions;
DROP TRIGGER IF EXISTS trg_transaction_summary_update ON transactions;
DROP TRIGGER IF EXISTS trg_transaction_summary_delete ON transactions;

CREATE TRIGGER trg_transaction_summary_insert
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_monthly_summary();

CREATE TRIGGER trg_transaction_summary_update
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_monthly_summary();

CREATE TRIGGER trg_transaction_summary_delete
  AFTER DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_monthly_summary();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;

-- Users can only see their own summaries
CREATE POLICY "Users can view own summaries"
  ON monthly_summaries FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true));

-- Service role can do everything (for triggers)
CREATE POLICY "Service role full access"
  ON monthly_summaries FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- BACKFILL EXISTING DATA
-- Run this once after migration to populate summaries for existing transactions
-- ============================================

-- Function to backfill all summaries
CREATE OR REPLACE FUNCTION backfill_monthly_summaries()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_record RECORD;
BEGIN
  FOR v_record IN
    SELECT DISTINCT user_id, TO_CHAR(date, 'YYYY-MM') as month_iso
    FROM transactions
    ORDER BY user_id, month_iso
  LOOP
    PERFORM recalculate_monthly_summary_for_month(v_record.user_id, v_record.month_iso);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Execute backfill
SELECT backfill_monthly_summaries();
