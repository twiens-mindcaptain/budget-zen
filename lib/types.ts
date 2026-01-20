import { z } from 'zod'

// ============================================
// DATABASE TYPES (matching actual Supabase schema)
// ============================================

/**
 * ZBB Category Types
 * - FIX: Fixed monthly expenses (rent, insurance)
 * - VARIABLE: Variable expenses (groceries, entertainment)
 * - SF1: Sinking Funds Priority - deterministic savings for known future expenses
 * - SF2: Savings Goals - flexible savings targets
 * - INCOME: Income categories
 */
export type ZBBCategoryType = 'FIX' | 'VARIABLE' | 'SF1' | 'SF2' | 'INCOME'

/**
 * Rollover Strategy - defines month-end behavior
 * - ACCUMULATE: Carry over entire balance (positive or negative) to next month
 * - RESET: Start fresh each month (no carryover)
 * - SWEEP: Only carry over negative balances (overspending), positive goes to savings
 */
export type RolloverStrategy = 'ACCUMULATE' | 'RESET' | 'SWEEP'

export interface Profile {
  user_id: string
  currency: string
  locale: string
  onboarding_completed: boolean
  created_at: string
}

export interface Category {
  id: string // uuid
  user_id: string
  name: string | null
  icon: string | null
  color: string | null
  type: ZBBCategoryType // FIX, VARIABLE, SF1, SF2, INCOME
  rollover_strategy: RolloverStrategy
  target_amount: string | null // numeric
  due_date: string | null // date
  sweep_target_category_id: string | null // uuid - where positive balance goes on SWEEP
  sort_order: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string // uuid
  user_id: string
  category_id: string | null // uuid (nullable)
  amount: string // numeric - stored as string to avoid float precision issues
  date: string // date
  memo: string | null // note field
  is_starting_balance: boolean
  is_sweep_transaction: boolean
  created_at: string
  updated_at: string
}

/**
 * MonthlyBudget - ZBB BudgetMonth entity
 * Represents a category's budget for a specific month
 */
export interface MonthlyBudget {
  id: string // uuid
  user_id: string
  category_id: string // uuid
  month_iso: string // YYYY-MM format
  assigned_amount: string // numeric
  start_balance: string // numeric
  created_at: string
  updated_at: string
}

/**
 * MonthlyBudgetWithActivity - Computed view for UI
 * Includes calculated activity and available balance
 */
export interface MonthlyBudgetWithActivity extends MonthlyBudget {
  activity: string // Sum of transactions in this month (decimal, usually negative)
  available: string // start_balance + assigned_amount + activity (decimal)
  category: Category
}

/**
 * BudgetSummary - Summary for budget header
 */
export interface BudgetSummary {
  month: string // YYYY-MM
  toBeBudgeted: string // Income + Leftover from RESET - Assigned
  totalIncome: string // Sum of all income transactions
  leftoverFromReset: string // Leftover from previous month's RESET categories
  totalAssigned: string // Sum of all assigned amounts
  totalActivity: string // Sum of all transaction amounts
  totalAvailable: string // Sum of all available balances
  overspent: string // Sum of negative available balances (categories in the red)
}

// ============================================
// ZOD VALIDATION SCHEMAS
// ============================================

// Transaction insert schema for form validation
export const insertTransactionSchema = z.object({
  category_id: z.string().optional(),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine(
      (val) => {
        // Normalize: remove +/- prefix and convert comma to period
        const cleanVal = val.replace(/^[+-]/, '').replace(',', '.')
        const num = parseFloat(cleanVal)
        return !isNaN(num) && num > 0
      },
      { message: 'Amount must be a positive number' }
    )
    .transform((val) => {
      // Normalize: remove +/- prefix and convert comma to period
      const cleanVal = val.replace(/^[+-]/, '').replace(',', '.')
      const num = parseFloat(cleanVal)
      return num.toFixed(2)
    }),
  date: z.string().optional(),
  memo: z.string().optional(),
})

export type InsertTransactionInput = z.infer<typeof insertTransactionSchema>

// Category insert schema
export const insertCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex code').optional(),
  type: z.enum(['FIX', 'VARIABLE', 'SF1', 'SF2', 'INCOME']),
  rollover_strategy: z.enum(['ACCUMULATE', 'RESET', 'SWEEP']).optional(),
  target_amount: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
})

export type InsertCategoryInput = z.infer<typeof insertCategorySchema>

// Monthly Budget insert schema
export const insertMonthlyBudgetSchema = z.object({
  category_id: z.string().uuid('Invalid category'),
  month_iso: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format'),
  assigned_amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)), 'Assigned must be a number')
    .transform((val) => parseFloat(val).toFixed(2)),
})

export type InsertMonthlyBudgetInput = z.infer<typeof insertMonthlyBudgetSchema>

// ============================================
// API RESPONSE TYPES
// ============================================

export type ApiResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// ============================================
// STATISTICS TYPES
// ============================================

export interface MonthlyStatistics {
  income: string
  expenses: string
  balance: string
}

// ============================================
// DASHBOARD TYPES
// ============================================

// Bill item for Bills Checklist (FIX categories with target_amount)
export interface BillItem {
  id: string // category.id
  name: string
  icon: string
  color: string
  target_amount: string
  is_paid: boolean // computed: has transaction this month
}

// Sinking fund item for Progress view (SF1/SF2 categories)
export interface SinkingFundItem {
  id: string // category.id
  name: string
  icon: string
  color: string
  target_amount: string // target amount
  due_date: string | null
  saved_balance: string // calculated from monthly_budgets
  progress_percentage: number
}

// Safe to Spend data with breakdown
export interface SafeToSpendData {
  safeToSpend: string
  totalIncome: string
  totalAssigned: string
  availableToAssign: string
}
