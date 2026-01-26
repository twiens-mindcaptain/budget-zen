'use server'

import { auth } from '@clerk/nextjs/server'
import { getServerSupabase } from '@/lib/supabase'
import type {
  ApiResponse,
  MonthlySummary,
  MonthlyTrend,
  CategorySpending,
  Category,
} from '@/lib/types'

/**
 * Get monthly summary for a specific month
 * Falls back to real-time calculation if summary doesn't exist
 */
export async function getMonthlySummary(
  monthIso: string
): Promise<ApiResponse<MonthlySummary | null>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await getServerSupabase()
      .from('monthly_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('month_iso', monthIso)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is ok
      console.error('Error fetching monthly summary:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data || null }
  } catch (error) {
    console.error('Unexpected error in getMonthlySummary:', error)
    return { success: false, error: 'Failed to fetch monthly summary' }
  }
}

/**
 * Get monthly trends for a date range
 * Useful for charts showing income/expenses over time
 */
export async function getMonthlyTrends(
  startMonth: string, // YYYY-MM
  endMonth: string // YYYY-MM
): Promise<ApiResponse<MonthlyTrend[]>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await getServerSupabase()
      .from('monthly_summaries')
      .select('month_iso, total_income, total_expenses, balance, transaction_count')
      .eq('user_id', userId)
      .gte('month_iso', startMonth)
      .lte('month_iso', endMonth)
      .order('month_iso', { ascending: true })

    if (error) {
      console.error('Error fetching monthly trends:', error)
      return { success: false, error: error.message }
    }

    const trends: MonthlyTrend[] = (data || []).map((row) => ({
      month_iso: row.month_iso,
      total_income: parseFloat(row.total_income) || 0,
      total_expenses: parseFloat(row.total_expenses) || 0,
      balance: parseFloat(row.balance) || 0,
      transaction_count: row.transaction_count || 0,
    }))

    return { success: true, data: trends }
  } catch (error) {
    console.error('Unexpected error in getMonthlyTrends:', error)
    return { success: false, error: 'Failed to fetch monthly trends' }
  }
}

/**
 * Get spending breakdown by category for a specific month
 */
export async function getCategorySpending(
  monthIso: string
): Promise<ApiResponse<CategorySpending[]>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get the monthly summary
    const { data: summary, error: summaryError } = await getServerSupabase()
      .from('monthly_summaries')
      .select('expenses_by_category, total_expenses')
      .eq('user_id', userId)
      .eq('month_iso', monthIso)
      .single()

    if (summaryError && summaryError.code !== 'PGRST116') {
      console.error('Error fetching summary:', summaryError)
      return { success: false, error: summaryError.message }
    }

    if (!summary || !summary.expenses_by_category) {
      return { success: true, data: [] }
    }

    // Get categories for names and icons
    const { data: categories, error: catError } = await getServerSupabase()
      .from('categories')
      .select('id, name, icon, color, type')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (catError) {
      console.error('Error fetching categories:', catError)
      return { success: false, error: catError.message }
    }

    const categoryMap = new Map<string, Category>()
    categories?.forEach((cat) => categoryMap.set(cat.id, cat as Category))

    const totalExpenses = parseFloat(summary.total_expenses) || 1 // avoid division by zero
    const expensesByCategory = summary.expenses_by_category as Record<string, number>

    const spending: CategorySpending[] = Object.entries(expensesByCategory)
      .map(([categoryId, amount]) => {
        const cat = categoryMap.get(categoryId)
        return {
          category_id: categoryId,
          category_name: cat?.name || 'Uncategorized',
          category_icon: cat?.icon || 'CircleDollarSign',
          category_color: cat?.color || '#71717a',
          category_type: cat?.type || 'VARIABLE',
          total_amount: amount,
          percentage: (amount / totalExpenses) * 100,
        }
      })
      .sort((a, b) => b.total_amount - a.total_amount) // Sort by amount descending

    return { success: true, data: spending }
  } catch (error) {
    console.error('Unexpected error in getCategorySpending:', error)
    return { success: false, error: 'Failed to fetch category spending' }
  }
}

/**
 * Get year-to-date totals
 */
export async function getYearToDateTotals(year: number): Promise<
  ApiResponse<{
    totalIncome: number
    totalExpenses: number
    balance: number
    transactionCount: number
    monthsWithData: number
  }>
> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    const startMonth = `${year}-01`
    const endMonth = `${year}-12`

    const { data, error } = await getServerSupabase()
      .from('monthly_summaries')
      .select('total_income, total_expenses, balance, transaction_count')
      .eq('user_id', userId)
      .gte('month_iso', startMonth)
      .lte('month_iso', endMonth)

    if (error) {
      console.error('Error fetching YTD totals:', error)
      return { success: false, error: error.message }
    }

    const totals = (data || []).reduce(
      (acc, row) => ({
        totalIncome: acc.totalIncome + (parseFloat(row.total_income) || 0),
        totalExpenses: acc.totalExpenses + (parseFloat(row.total_expenses) || 0),
        balance: acc.balance + (parseFloat(row.balance) || 0),
        transactionCount: acc.transactionCount + (row.transaction_count || 0),
        monthsWithData: acc.monthsWithData + 1,
      }),
      {
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        transactionCount: 0,
        monthsWithData: 0,
      }
    )

    return { success: true, data: totals }
  } catch (error) {
    console.error('Unexpected error in getYearToDateTotals:', error)
    return { success: false, error: 'Failed to fetch YTD totals' }
  }
}

/**
 * Get all monthly summaries for a user (for export or full analytics)
 */
export async function getAllMonthlySummaries(): Promise<ApiResponse<MonthlySummary[]>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await getServerSupabase()
      .from('monthly_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('month_iso', { ascending: false })

    if (error) {
      console.error('Error fetching all summaries:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Unexpected error in getAllMonthlySummaries:', error)
    return { success: false, error: 'Failed to fetch summaries' }
  }
}
