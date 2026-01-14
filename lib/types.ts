import { z } from 'zod'

// ============================================
// DATABASE TYPES (matching Supabase schema)
// ============================================

export type AccountType = 'cash' | 'bank' | 'credit' | 'savings'
export type CategoryType = 'income' | 'expense'

export interface Profile {
  user_id: string
  currency: string
  theme_preference: string
  created_at: string
}

export interface Account {
  id: string // uuid
  user_id: string
  name: string
  type: AccountType
  initial_balance: string // decimal(12,2) - stored as string to avoid float precision issues
  created_at: string
}

export type BudgetType = 'variable' | 'fixed' | 'sinking_fund'
export type BudgetFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual'

export interface Category {
  id: string // uuid
  user_id: string
  name: string | null // User-created categories have a name
  translation_key: string | null // System categories have a translation key (e.g., 'category.groceries')
  icon: string | null // Emoji or Lucide icon name
  color: string | null // Hex code
  type: CategoryType
  budget_type: BudgetType // Budget tracking type
  target_amount: string | null // Target amount for fixed/sinking_fund budgets (decimal)
  frequency: BudgetFrequency // Budget frequency
  monthly_target: string | null // Calculated monthly target (decimal)
  created_at: string
}

export interface BudgetItem {
  id: string // uuid
  user_id: string
  category_id: string // uuid
  name: string // e.g., "Netflix Subscription", "Emergency Fund"
  amount: string // Full amount (decimal 12,2) e.g., "1200.00" for annual
  frequency: BudgetFrequency // monthly, quarterly, semi_annual, annual
  monthly_impact: string // Normalized to monthly (decimal 12,2) e.g., "100.00" for $1200/year
  saved_balance: string // User-entered progress toward goal (decimal 12,2)
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string // uuid
  user_id: string
  account_id: string // uuid
  category_id: string | null // uuid (nullable)
  amount: string // decimal(12,2) - stored as string to avoid float precision issues
  date: string // timestamp with time zone
  note: string | null
  created_at: string
}

// ============================================
// ZOD VALIDATION SCHEMAS
// ============================================

// Transaction insert schema for form validation
export const insertTransactionSchema = z.object({
  account_id: z.string().uuid('Please select a valid account'),
  category_id: z.string().optional(),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine(
      (val) => {
        // Remove +/- prefix and parse
        const cleanVal = val.replace(/^[+-]/, '')
        const num = parseFloat(cleanVal)
        return !isNaN(num) && num > 0
      },
      { message: 'Amount must be a positive number' }
    )
    .transform((val) => {
      // Remove +/- prefix, ensure exactly 2 decimal places
      const cleanVal = val.replace(/^[+-]/, '')
      const num = parseFloat(cleanVal)
      return num.toFixed(2)
    }),
  date: z.string().optional(),
  note: z.string().optional(),
})

export type InsertTransactionInput = z.infer<typeof insertTransactionSchema>

// Account insert schema
export const insertAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: z.enum(['cash', 'bank', 'credit', 'savings']),
  initial_balance: z
    .string()
    .optional()
    .default('0.00')
    .refine(
      (val) => {
        const num = parseFloat(val)
        return !isNaN(num)
      },
      { message: 'Initial balance must be a valid number' }
    )
    .transform((val) => {
      const num = parseFloat(val)
      return num.toFixed(2)
    }),
})

export type InsertAccountInput = z.infer<typeof insertAccountSchema>

// Category insert schema
export const insertCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex code').optional(),
  type: z.enum(['income', 'expense']),
  budget_type: z.enum(['variable', 'fixed', 'sinking_fund']).default('variable'),
  target_amount: z.string().optional().nullable(),
  frequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']).default('monthly'),
})

export type InsertCategoryInput = z.infer<typeof insertCategorySchema>

// Budget Item insert schema
export const insertBudgetItemSchema = z.object({
  category_id: z.string().uuid('Invalid category'),
  name: z.string().min(1, 'Item name is required').max(100),
  amount: z
    .string()
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      'Amount must be positive'
    )
    .transform((val) => parseFloat(val).toFixed(2)),
  frequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']),
  saved_balance: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val).toFixed(2) : '0.00')),
})

export type InsertBudgetItemInput = z.infer<typeof insertBudgetItemSchema>

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
  income: string // Decimal string
  expenses: string // Decimal string
  balance: string // Decimal string
}

// ============================================
// DASHBOARD TYPES
// ============================================

// Bill item for Bills Checklist (monthly budget items)
export interface BillItem {
  id: string // budget_item.id
  name: string
  category_id: string
  category_name: string | null
  category_icon: string
  category_color: string
  monthly_impact: string
  is_paid: boolean // computed: has transaction this month
}

// Sinking fund item for Progress view (non-monthly budget items)
export interface SinkingFundItem {
  id: string // budget_item.id
  name: string
  category_id: string
  category_name: string | null
  category_icon: string
  category_color: string
  amount: string // target amount
  monthly_impact: string
  saved_balance: string
  progress_percentage: number
}

// Safe to Spend data with breakdown
export interface SafeToSpendData {
  safeToSpend: string
  totalLiquid: string
  pendingBills: string
  sinkingContributions: string
}
