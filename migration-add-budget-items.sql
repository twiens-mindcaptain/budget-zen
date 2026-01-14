-- Migration: Add Budget Items Table
-- This migration creates the budget_items table to replace category-level budgeting
-- with granular per-item tracking (multiple bills/funds per category)

-- 1. Create budget_items table
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,

  -- Item details
  name TEXT NOT NULL, -- e.g., "Netflix Subscription", "Emergency Fund"
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0), -- Full amount (e.g., $1200 for annual)
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
  monthly_impact DECIMAL(12,2) NOT NULL CHECK (monthly_impact > 0), -- Normalized to monthly (e.g., $100/mo for $1200/year)

  -- Sinking fund tracking
  saved_balance DECIMAL(12,2) DEFAULT 0.00 NOT NULL CHECK (saved_balance >= 0), -- User-entered progress toward goal

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create indexes for query performance
CREATE INDEX IF NOT EXISTS budget_items_user_id_idx ON budget_items(user_id);
CREATE INDEX IF NOT EXISTS budget_items_category_id_idx ON budget_items(category_id);
CREATE INDEX IF NOT EXISTS budget_items_frequency_idx ON budget_items(frequency);

-- 3. Enable Row Level Security
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Users can view their own budget items"
  ON budget_items FOR SELECT
  USING (user_id = (SELECT auth.jwt() ->> 'user_id'));

CREATE POLICY "Users can insert their own budget items"
  ON budget_items FOR INSERT
  WITH CHECK (user_id = (SELECT auth.jwt() ->> 'user_id'));

CREATE POLICY "Users can update their own budget items"
  ON budget_items FOR UPDATE
  USING (user_id = (SELECT auth.jwt() ->> 'user_id'))
  WITH CHECK (user_id = (SELECT auth.jwt() ->> 'user_id'));

CREATE POLICY "Users can delete their own budget items"
  ON budget_items FOR DELETE
  USING (user_id = (SELECT auth.jwt() ->> 'user_id'));

-- 5. Create helper function to calculate monthly impact
CREATE OR REPLACE FUNCTION calculate_item_monthly_impact(
    p_amount DECIMAL(12,2),
    p_frequency TEXT
) RETURNS DECIMAL(12,2) AS $$
BEGIN
    IF p_amount IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN CASE p_frequency
        WHEN 'monthly' THEN p_amount
        WHEN 'quarterly' THEN ROUND(p_amount / 3, 2)
        WHEN 'semi_annual' THEN ROUND(p_amount / 6, 2)
        WHEN 'annual' THEN ROUND(p_amount / 12, 2)
        ELSE p_amount
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Add deprecation comments to category budget fields
-- Note: We don't drop these columns to avoid breaking existing queries
-- They will be ignored in new code
COMMENT ON COLUMN categories.target_amount IS 'DEPRECATED: Use budget_items table instead. This field is kept for backward compatibility but should not be used for new features.';
COMMENT ON COLUMN categories.frequency IS 'DEPRECATED: Use budget_items table instead. This field is kept for backward compatibility but should not be used for new features.';
COMMENT ON COLUMN categories.monthly_target IS 'DEPRECATED: Use budget_items table instead. This field is kept for backward compatibility but should not be used for new features.';

-- 7. Add helpful table comment
COMMENT ON TABLE budget_items IS 'Budget items table: Stores individual bills and sinking funds. Monthly items (frequency=monthly) are bills that can be marked as paid. Non-monthly items (frequency>monthly) are sinking funds with savings progress tracking.';
